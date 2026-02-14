import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, FileText, ArrowLeft, Trash2 } from "lucide-react";

interface Note {
  id: string;
  title: string;
  created_at: string;
}

const SubjectNotes = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const [subjectName, setSubjectName] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!subjectId) return;

    const fetchData = async () => {
      const { data: subject } = await supabase
        .from("subjects")
        .select("name")
        .eq("id", subjectId)
        .maybeSingle();

      if (subject) setSubjectName(subject.name);

      const { data: notesData } = await supabase
        .from("notes")
        .select("id, title, created_at")
        .eq("subject_id", subjectId)
        .order("created_at", { ascending: false });

      setNotes(notesData || []);
      setLoading(false);
    };

    fetchData();
  }, [subjectId]);

  const createNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !subjectId) return;

    const { data, error } = await supabase
      .from("notes")
      .insert({ title: newNoteTitle.trim(), subject_id: subjectId })
      .select("id")
      .single();

    if (error) {
      toast.error("Failed to create note");
      return;
    }

    setNewNoteTitle("");
    setDialogOpen(false);
    navigate(`/note/${data.id}`);
  };

  const deleteNote = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete note");
      return;
    }
    setNotes((prev) => prev.filter((n) => n.id !== id));
    toast.success("Note deleted");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold">{subjectName}</h1>
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
                <Button type="submit" className="w-full">Create & Edit</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
          </div>
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
            {notes.map((note) => (
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
                  <h3 className="font-display font-semibold">{note.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(note.created_at).toLocaleDateString()}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default SubjectNotes;
