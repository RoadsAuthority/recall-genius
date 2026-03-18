import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubjects, useCreateSubject, useDeleteSubject } from "@/hooks/useSubjects";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, BookOpen, Brain, Layers, ArrowRight, Trash2, Search, Sparkles } from "lucide-react";
import { DashboardSkeleton } from "@/components/LoadingSkeletons";
import { AIStudyToolsSection } from "@/components/AIStudyToolsSection";


const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [newSubject, setNewSubject] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: subjects = [], isLoading: loading } = useSubjects();
  const createSubjectMutation = useCreateSubject();
  const deleteSubjectMutation = useDeleteSubject();

  // Filter subjects based on search query
  const filteredSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalDue = subjects.reduce((sum, s) => sum + s.due_count, 0);
  const totalNotes = subjects.reduce((sum, s) => sum + s.note_count, 0);

  const createSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !user) return;

    await createSubjectMutation.mutateAsync(newSubject.trim());
    setNewSubject("");
    setDialogOpen(false);
  };

  const deleteSubject = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" and all its notes?`)) return;
    await deleteSubjectMutation.mutateAsync(id);
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-display font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">Your study command center</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {totalDue > 0 ? (
              <Button onClick={() => navigate("/review")} className="gap-2 gradient-accent text-accent-foreground border-0">
                <Brain className="h-4 w-4" />
                Review Now ({totalDue})
              </Button>
            ) : totalNotes > 0 ? (
              <Button onClick={() => navigate("/review?mode=practice")} variant="outline" className="gap-2 border-accent/20 hover:bg-accent/5 text-accent">
                <Sparkles className="h-4 w-4" />
                Practice Session
              </Button>
            ) : null}
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
                    placeholder="Subject name..."
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    autoFocus
                  />
                  <Button type="submit" className="w-full" disabled={createSubjectMutation.isPending}>
                    {createSubjectMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search bar */}
        {subjects.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={<BookOpen className="h-5 w-5" />} label="Subjects" value={subjects.length} />
          <StatCard icon={<Layers className="h-5 w-5" />} label="Total Notes" value={totalNotes} />
          <StatCard icon={<Brain className="h-5 w-5" />} label="Due for Review" value={totalDue} highlight={totalDue > 0} />
        </div>

        {/* Subjects grid */}
        {loading ? (
          <DashboardSkeleton />
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
            {filteredSubjects.length === 0 && searchQuery ? (
              <Card className="col-span-full border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-display font-semibold text-lg mb-2">No subjects found</h3>
                  <p className="text-muted-foreground text-sm">Try a different search term</p>
                </CardContent>
              </Card>
            ) : (
              filteredSubjects.map((subject) => (
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
              ))
            )}
          </div>
        )}

        {/* AI Study Tools — active for Premium */}
        <AIStudyToolsSection
          title="AI Study Tools"
          description="Paste notes and generate AI summaries & study questions. Premium unlocks flashcards + study packs."
          compact
        />
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
