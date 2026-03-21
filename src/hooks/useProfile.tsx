import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setProfile(data);
      }
      setLoading(false);
    };

    fetchProfile();

    // Subscribe to profile changes (Realtime). If WS fails, app still works via fetch.
    const channel = supabase
      .channel("profile-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          setProfile(payload.new);
        },
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("Profile realtime subscription issue:", status, err?.message ?? err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    profile,
    isPremium: profile?.plan_type === "premium",
    loading,
    refreshProfile: async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (data) setProfile(data);
    },
  };
};
