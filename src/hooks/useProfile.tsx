import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { apiRequest } from "@/lib/apiClient";

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
      const response = await apiRequest<{ data: any }>(`/api/profile/${encodeURIComponent(user.id)}`);
      if (response.data) setProfile(response.data);
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  return {
    profile,
    isPremium: profile?.plan_type === "premium",
    loading,
    refreshProfile: async () => {
      if (!user) return;
      const response = await apiRequest<{ data: any }>(`/api/profile/${encodeURIComponent(user.id)}`);
      if (response.data) setProfile(response.data);
    },
  };
};
