import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiRequest } from "@/lib/apiClient";
import { useAuth } from "./useAuth";

export interface Subject {
  id: string;
  name: string;
  created_at: string;
  note_count: number;
  due_count: number;
}

export const useSubjects = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["subjects", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await apiRequest<{ data: Subject[] }>(`/api/subjects?user_id=${encodeURIComponent(user.id)}`);
      return response.data || [];
    },
    enabled: Boolean(user?.id),
  });
};

export const useCreateSubject = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      await apiRequest<{ data: Subject }>("/api/subjects", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), user_id: user.id }),
      });
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
      await apiRequest<{ ok: boolean }>(`/api/subjects/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
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
