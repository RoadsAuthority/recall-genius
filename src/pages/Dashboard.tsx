import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, BookOpen, Brain, Layers, ArrowRight, Trash2 } from "lucide-react";

interface Subject {
  id: string;
  name: string;
  created_at: string;
  note_count: number;
  due_count: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [totalDue, setTotalDue] = useState(0);

  const fetchSubjects = async () => {
    if (!user) return;
    
    const { data: subjectsData, error } = await supabase
      .from("subjects")
      .select("id, name, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load subjects");
      return;
    }

    // Get note counts and due counts for each subject
    const enriched: Subject[] = await Promise.all(
      (subjectsData || []).map(async (s) => {
        const { count: noteCount } = await supabase
          .from("notes")
          .select("*", { count: "exact", head: true })
          .eq("subject_id", s.id);

        const { count: dueCount } = await supabase
          .from("note_blocks")
          .select("*, notes!inner(subject_id)", { count: "exact", head: true })
          .eq("notes.subject_id", s.id)
          .lte("next_review", new Date().toISOString());

        return {
          ...s,
          note_count: noteCount || 0,
          due_count: dueCount || 0,
        };
      })
    );

    setSubjects(enriched);
    setTotalDue(enriched.reduce((sum, s) => sum + s.due_count, 0));
    setLoading(false);
  };

  useEffect(() => {
    fetchSubjects();
  }, [user]);

  const createSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !user) return;

    const { error } = await supabase
      .from("subjects")
      .insert({ name: newSubject.trim(), user_id: user.id });

    if (error) {
      toast.error("Failed to create subject");
      return;
    }

    setNewSubject("");
    setDialogOpen(false);
    toast.success("Subject created!");
    fetchSubjects();
  };

  const deleteSubject = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" and all its notes?`)) return;
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete subject");
      return;
    }
    toast.success("Subject deleted");
    fetchSubjects();
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Your study command center</p>
          </div>
          <div className="flex gap-3">
            {totalDue > 0 && (
              <Button onClick={() => navigate("/review")} className="gap-2 gradient-accent text-accent-foreground border-0">
                <Brain className="h-4 w-4" />
                Review Now ({totalDue})
              </Button>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Subject
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display">Create Subject</DialogTitle>
                </DialogHeader>
                <form onSubmit={createSubject} className="space-y-4 mt-2">
                  <Input
                    placeholder="e.g., Organic Chemistry, Contract Law..."
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    autoFocus
                  />
                  <Button type="submit" className="w-full">Create</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={<BookOpen className="h-5 w-5" />} label="Subjects" value={subjects.length} />
          <StatCard icon={<Layers className="h-5 w-5" />} label="Total Notes" value={subjects.reduce((s, sub) => s + sub.note_count, 0)} />
          <StatCard icon={<Brain className="h-5 w-5" />} label="Due for Review" value={totalDue} highlight={totalDue > 0} />
        </div>

        {/* Subjects grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
          </div>
        ) : subjects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-display font-semibold text-lg mb-2">No subjects yet</h3>
              <p className="text-muted-foreground text-sm mb-4">Create your first subject to start taking notes</p>
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Subject
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((subject) => (
              <Card key={subject.id} className="group hover:shadow-elevated transition-all duration-200 cursor-pointer relative">
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSubject(subject.id, subject.name); }}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <Link to={`/subject/${subject.id}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-lg">{subject.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>{subject.note_count} notes</span>
                        {subject.due_count > 0 && (
                          <span className="text-accent font-medium">{subject.due_count} due</span>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

const StatCard = ({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: number; highlight?: boolean }) => (
  <Card className={highlight ? "border-accent/30 bg-accent/5" : ""}>
    <CardContent className="flex items-center gap-3 py-4 px-4">
      <div className={`p-2 rounded-lg ${highlight ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"}`}>
        {icon}
      </div>
      <div>
        <p className={`text-2xl font-display font-bold ${highlight ? "text-accent" : ""}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </CardContent>
  </Card>
);

export default Dashboard;
