import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Subject {
  id: string;
  name: string;
  created_at: string;
  note_count: number;
  due_count: number;
}

export const useSubjects = () => {
  return useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data: subjectsData, error } = await supabase
        .from("subjects")
        .select("id, name, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Optimized: Use a single query with joins instead of N+1 queries
      const subjectIds = (subjectsData || []).map((s) => s.id);

      if (subjectIds.length === 0) {
        return [];
      }

      // Get note counts for all subjects in one query
      const { data: notesData } = await supabase
        .from("notes")
        .select("subject_id")
        .in("subject_id", subjectIds);

      // Get due counts for all subjects - need to join through notes
      const { data: blocksData } = await supabase
        .from("note_blocks")
        .select(`
          id,
          notes!inner(
            subject_id
          )
        `)
        .lte("next_review", new Date().toISOString());

      // Count notes per subject
      const noteCounts = (notesData || []).reduce((acc, note) => {
        acc[note.subject_id] = (acc[note.subject_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Count due blocks per subject
      const dueCounts = (blocksData || []).reduce((acc, block: any) => {
        const subjectId = block.notes?.subject_id;
        if (subjectId) {
          acc[subjectId] = (acc[subjectId] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      // Enrich subjects with counts
      const enriched: Subject[] = (subjectsData || []).map((s) => ({
        ...s,
        note_count: noteCounts[s.id] || 0,
        due_count: dueCounts[s.id] || 0,
      }));

      return enriched;
    },
  });
};

export const useCreateSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // Check current subject count and plan type
      const [{ data: profile }, { count }] = await Promise.all([
        supabase.from("profiles").select("plan_type").eq("id", userData.user.id).maybeSingle(),
        supabase.from("subjects").select("*", { count: "exact", head: true }).eq("user_id", userData.user.id)
      ]);

      if (profile?.plan_type !== "premium" && (count || 0) >= 3) {
        toast.error("Free limit reached", {
          description: "Free accounts are limited to 3 subjects. Upgrade to Premium for unlimited subjects!"
        });
        throw new Error("Limit reached");
      }

      const { error } = await supabase
        .from("subjects")
        .insert({ name: name.trim(), user_id: userData.user.id });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      toast.success("Subject created!");
    },
    onError: () => {
      toast.error("Failed to create subject");
    },
  });
};

export const useDeleteSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subjects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      toast.success("Subject deleted");
    },
    onError: () => {
      toast.error("Failed to delete subject");
    },
  });
};
