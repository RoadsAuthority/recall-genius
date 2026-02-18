import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useNotes, useCreateNote, useDeleteNote } from "@/hooks/useNotes";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FileText, ArrowLeft, Trash2, Search } from "lucide-react";
import { NotesListSkeleton } from "@/components/LoadingSkeletons";

const SubjectNotes = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch subject name
  const { data: subject } = useQuery({
    queryKey: ["subject", subjectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("subjects")
        .select("name")
        .eq("id", subjectId)
        .maybeSingle();
      return data;
    },
    enabled: !!subjectId,
  });

  const { data: notes = [], isLoading: loading } = useNotes(subjectId || "");
  const createNoteMutation = useCreateNote();
  const deleteNoteMutation = useDeleteNote();

  // Filter notes based on search query
  const filteredNotes = notes.filter((note) =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const createNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !subjectId) return;

    const data = await createNoteMutation.mutateAsync({
      title: newNoteTitle.trim(),
      subjectId,
    });

    setNewNoteTitle("");
    setDialogOpen(false);
    navigate(`/note/${data.id}`);
  };

  const deleteNote = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    if (!subjectId) return;
    await deleteNoteMutation.mutateAsync({ id, subjectId });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold">{subject?.name || "Loading..."}</h1>
            <p className="text-sm text-muted-foreground">{notes.length} notes</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Note
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">New Note</DialogTitle>
              </DialogHeader>
              <form onSubmit={createNote} className="space-y-4 mt-2">
                <Input
                  placeholder="Note title..."
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  autoFocus
                />
                <Button type="submit" className="w-full" disabled={createNoteMutation.isPending}>
                  {createNoteMutation.isPending ? "Creating..." : "Create & Edit"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search bar */}
        {notes.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {loading ? (
          <NotesListSkeleton />
        ) : notes.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-display font-semibold text-lg mb-2">No notes yet</h3>
              <p className="text-muted-foreground text-sm mb-4">Create your first note to start studying</p>
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                New Note
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filteredNotes.length === 0 && searchQuery ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-display font-semibold text-lg mb-2">No notes found</h3>
                  <p className="text-muted-foreground text-sm">Try a different search term</p>
                </CardContent>
              </Card>
            ) : (
              filteredNotes.map((note) => (
              <Card
                key={note.id}
                className="group hover:shadow-elevated transition-all duration-200 cursor-pointer relative"
              >
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNote(note.id, note.title); }}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <div onClick={() => navigate(`/note/${note.id}`)} className="p-4">
                  <h3 className="font-display font-semibold mb-1">{note.title}</h3>
                  {note.preview && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {note.preview}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(note.created_at).toLocaleDateString()}
                  </p>
                </div>
              </Card>
              ))
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default SubjectNotes;
