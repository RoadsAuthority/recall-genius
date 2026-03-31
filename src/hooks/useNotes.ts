import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiRequest } from "@/lib/apiClient";

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
      const response = await apiRequest<{ data: Note[] }>(`/api/notes?subject_id=${encodeURIComponent(subjectId)}`);
      return response.data || [];
    },
    enabled: !!subjectId,
  });
};

export const useCreateNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, subjectId }: { title: string; subjectId: string }) => {
      const response = await apiRequest<{ data: { id: string } }>("/api/notes", {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), subject_id: subjectId }),
      });
      return response.data;
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
      await apiRequest<{ ok: boolean }>(`/api/notes/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
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
