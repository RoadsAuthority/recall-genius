import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Note {
  id: string;
  title: string;
  created_at: string;
  subject_id: string;
  preview?: string; // Content preview snippet
}

export const useNotes = (subjectId: string) => {
  return useQuery({
    queryKey: ["notes", subjectId],
    queryFn: async () => {
      const { data: notesData, error } = await supabase
        .from("notes")
        .select("id, title, created_at")
        .eq("subject_id", subjectId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch preview snippets for each note
      const notesWithPreview = await Promise.all(
        (notesData || []).map(async (note) => {
          const { data: blocks } = await supabase
            .from("note_blocks")
            .select("content")
            .eq("note_id", note.id)
            .order("block_order", { ascending: true })
            .limit(1);

          const preview = blocks && blocks.length > 0
            ? blocks[0].content.substring(0, 150).trim() + (blocks[0].content.length > 150 ? "..." : "")
            : undefined;

          return { ...note, preview };
        })
      );

      return notesWithPreview;
    },
    enabled: !!subjectId,
  });
};

export const useCreateNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, subjectId }: { title: string; subjectId: string }) => {
      const { data, error } = await supabase
        .from("notes")
        .insert({ title: title.trim(), subject_id: subjectId })
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["notes", variables.subjectId] });
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: () => {
      toast.error("Failed to create note");
    },
  });
};

export const useDeleteNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, subjectId }: { id: string; subjectId: string }) => {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["notes", variables.subjectId] });
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      toast.success("Note deleted");
    },
    onError: () => {
      toast.error("Failed to delete note");
    },
  });
};
