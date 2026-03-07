import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Timer, Trophy, ChevronRight, Loader2, Eye, EyeOff, CheckCircle, XCircle, ArrowLeft, Lock } from "lucide-react";
import { EXAM_CONFIG } from "@/lib/config";

interface ExamItem {
  block_id: string;
  block_content: string;
  questions: { id: string; question: string }[];
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface NoteOption {
  id: string;
  title: string;
}

const ExamMode = () => {
  const { user } = useAuth();
  const { isPremium, loading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<{ id: string; name: string; note_count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  // Scope dialog: all topics vs specific note (topic)
  const [scopeOpen, setScopeOpen] = useState(false);
  const [scopeSubjectId, setScopeSubjectId] = useState<string | null>(null);
  const [scopeSubjectName, setScopeSubjectName] = useState("");
  const [scopeAllTopics, setScopeAllTopics] = useState(true);
  const [scopeNoteId, setScopeNoteId] = useState<string | null>(null);
  const [notesInSubject, setNotesInSubject] = useState<NoteOption[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);

  // Session state
  const [subjectName, setSubjectName] = useState("");
  const [items, setItems] = useState<ExamItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchSubjects();
  }, [user]);

  const fetchSubjects = async () => {
    const { data: subjectsData } = await supabase
      .from("subjects")
      .select("id, name")
      .eq("user_id", user?.id);

    const withCount = await Promise.all(
      (subjectsData || []).map(async (s) => {
        const { count } = await supabase
          .from("note_blocks")
          .select("*, notes!inner(subject_id)", { count: "exact", head: true })
          .eq("notes.subject_id", s.id);
        return { ...s, note_count: count ?? 0 };
      })
    );

    setSubjects(withCount);
    setLoading(false);
  };

  const openScopeDialog = async (subjectId: string, name: string) => {
    setScopeSubjectId(subjectId);
    setScopeSubjectName(name);
    setScopeAllTopics(true);
    setScopeNoteId(null);
    setNotesInSubject([]);
    setScopeOpen(true);
    setNotesLoading(true);
    try {
      const { data: notes } = await supabase
        .from("notes")
        .select("id, title")
        .eq("subject_id", subjectId)
        .order("title");
      setNotesInSubject(notes || []);
    } catch (_) {
      setNotesInSubject([]);
    } finally {
      setNotesLoading(false);
    }
  };

  const startSession = async (subjectId: string, name: string, noteId?: string | null) => {
    if (!user) return;
    setScopeOpen(false);
    setSessionLoading(true);
    setSessionEnded(false);
    setCurrentIndex(0);
    setShowAnswer(false);
    setCorrectCount(0);
    setTimeRemaining(EXAM_CONFIG.DURATION_MS);
    setSubjectName(name);

    try {
      let query = supabase
        .from("note_blocks")
        .select("id, content, note_id, notes!inner(subject_id, subjects!inner(user_id))")
        .eq("notes.subjects.user_id", user.id);

      if (noteId) {
        query = query.eq("note_id", noteId);
      } else {
        query = query.eq("notes.subject_id", subjectId);
      }

      const { data: blocks, error } = await query;

      if (error) throw error;

      if (!blocks || blocks.length === 0) {
        toast.error("No content in this subject yet. Add notes first.");
        setSessionLoading(false);
        return;
      }

      const blockIds = blocks.map((b) => b.id);
      const { data: questions } = await supabase
        .from("recall_questions")
        .select("id, question, block_id")
        .in("block_id", blockIds);

      const examItems: ExamItem[] = blocks.map((block) => ({
        block_id: block.id,
        block_content: block.content,
        questions: (questions || []).filter((q) => q.block_id === block.id),
      }));

      const shuffled = shuffle(examItems).slice(0, EXAM_CONFIG.MAX_ITEMS);
      setItems(shuffled);
      setSessionLoading(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load exam. Try again.");
      setSessionLoading(false);
    }
  };

  // Countdown timer (starts when session has items; runs until time hits 0)
  useEffect(() => {
    if (items.length === 0 || timeRemaining <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1000) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setSessionEnded(true);
          toast.info("Time's up!");
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [items.length]);

  const handleAnswer = (correct: boolean) => {
    if (correct) setCorrectCount((c) => c + 1);
    setShowAnswer(false);
    if (currentIndex + 1 >= items.length) {
      setSessionEnded(true);
      toast.success("Exam complete!");
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const exitSession = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setItems([]);
    setSessionEnded(false);
    setTimeRemaining(0);
  };

  // Loading
  if (profileLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </AppLayout>
    );
  }

  // Premium gate: Exam Mode is premium-only
  if (!isPremium) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto py-12 text-center space-y-6">
          <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto">
            <Lock className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold">Exam Mode is Premium</h1>
          <p className="text-muted-foreground">
            Upgrade to Premium to run timed exam sessions on all topics or a specific topic per subject. Questions appear in Review too.
          </p>
          <ul className="text-sm text-muted-foreground text-left max-w-sm mx-auto space-y-2">
            <li>• Choose subject → all topics or one note (topic)</li>
            <li>• Timed session with AI-generated recall questions</li>
            <li>• Same questions available in the Review tab</li>
          </ul>
          <Button size="lg" asChild>
            <Link to="/profile">Upgrade to Premium — $5/month</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  // Results screen
  if (sessionEnded && items.length > 0) {
    const score = correctCount;
    const total = items.length;
    const pct = total ? Math.round((score / total) * 100) : 0;
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto py-12 text-center space-y-6">
          <div className="bg-accent/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
            <Trophy className="h-10 w-10 text-accent" />
          </div>
          <h1 className="text-3xl font-display font-bold">Exam Complete</h1>
          <p className="text-muted-foreground">{subjectName}</p>
          <div className="text-4xl font-bold">
            {score} / {total}
          </div>
          <p className="text-muted-foreground">{pct}% correct</p>
          <Button size="lg" onClick={exitSession} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Exam Mode
          </Button>
        </div>
      </AppLayout>
    );
  }

  // Active session
  if (items.length > 0) {
    const current = items[currentIndex];
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-display font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-accent" />
              {subjectName}
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm font-mono font-medium tabular-nums text-muted-foreground">
                {formatTime(timeRemaining)}
              </span>
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} / {items.length}
              </span>
            </div>
          </div>

          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="h-2 rounded-full bg-accent transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
            />
          </div>

          <Card className="shadow-elevated">
            <CardContent className="p-8">
              {current.questions.length > 0 ? (
                <div className="space-y-4">
                  {current.questions.map((q, i) => (
                    <p key={q.id} className="text-lg font-medium font-display">
                      {q.question}
                    </p>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-lg font-medium font-display">What are the key points from this content?</p>
                  <p className="text-sm text-muted-foreground">Recall the main ideas, then show the answer.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            variant="outline"
            onClick={() => setShowAnswer(!showAnswer)}
            className="w-full gap-2"
          >
            {showAnswer ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showAnswer ? "Hide Answer" : "Show Answer"}
          </Button>

          {showAnswer && (
            <>
              <Card className="border-accent/20 bg-accent/5">
                <CardContent className="p-6">
                  <p className="text-base leading-relaxed whitespace-pre-wrap">{current.block_content}</p>
                </CardContent>
              </Card>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleAnswer(false)}
                  className="flex flex-col py-4 h-auto border-destructive/30 hover:bg-destructive/10 hover:text-destructive gap-1"
                >
                  <XCircle className="h-5 w-5" />
                  <span className="font-display font-semibold">Missed it</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleAnswer(true)}
                  className="flex flex-col py-4 h-auto border-success/30 hover:bg-success/10 hover:text-success gap-1"
                >
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-display font-semibold">Got it</span>
                </Button>
              </div>
            </>
          )}

          <Button variant="ghost" size="sm" onClick={exitSession} className="text-muted-foreground">
            End exam early
          </Button>
        </div>
      </AppLayout>
    );
  }

  // Subject selection
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Trophy className="h-8 w-8 text-accent" />
            Exam Simulation
          </h1>
          <p className="text-muted-foreground">Test your knowledge under pressure with timed sessions.</p>
        </div>

        {subjects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No subjects yet. Create a subject and add notes to take an exam.</p>
              <Button className="mt-4" onClick={() => navigate("/dashboard")}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => (
              <Card key={subject.id} className="group hover:border-accent/50 transition-all">
                <CardHeader>
                  <Badge variant="outline" className="mb-2 uppercase text-[10px] tracking-widest w-fit">
                    {subject.name}
                  </Badge>
                  <CardTitle className="text-xl">{subject.name} Exam</CardTitle>
                  <CardDescription>
                    {subject.note_count} block{subject.note_count !== 1 ? "s" : ""} · 15 min
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      15 Mins
                    </span>
                    <span className="flex items-center gap-1">
                      <ChevronRight className="h-3 w-3" />
                      Up to {EXAM_CONFIG.MAX_ITEMS} questions
                    </span>
                  </div>
                  <Button
                    className="w-full font-bold"
                    onClick={() => openScopeDialog(subject.id, subject.name)}
                    disabled={sessionLoading || subject.note_count === 0}
                  >
                    Start Exam
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Scope dialog: All topics vs specific topic (note) */}
        <Dialog open={scopeOpen} onOpenChange={setScopeOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Exam scope</DialogTitle>
              <DialogDescription>
                Test on all topics in this subject or pick one note (topic).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <RadioGroup
                value={scopeAllTopics ? "all" : "one"}
                onValueChange={(v) => {
                  setScopeAllTopics(v === "all");
                  if (v === "all") setScopeNoteId(null);
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="scope-all" />
                  <Label htmlFor="scope-all" className="font-normal cursor-pointer">
                    All topics in {scopeSubjectName}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="one" id="scope-one" disabled={notesInSubject.length === 0} />
                  <Label htmlFor="scope-one" className="font-normal cursor-pointer">
                    Specific topic
                  </Label>
                </div>
              </RadioGroup>
              {!scopeAllTopics && (
                <div className="pl-6">
                  {notesLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : notesInSubject.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No notes in this subject.</p>
                  ) : (
                    <Select
                      value={scopeNoteId || ""}
                      onValueChange={(v) => setScopeNoteId(v || null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a note (topic)..." />
                      </SelectTrigger>
                      <SelectContent>
                        {notesInSubject.map((n) => (
                          <SelectItem key={n.id} value={n.id}>
                            {n.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>
            <Button
              className="w-full font-bold"
              onClick={() =>
                scopeSubjectId &&
                startSession(
                  scopeSubjectId,
                  scopeSubjectName,
                  scopeAllTopics ? undefined : scopeNoteId || undefined
                )
              }
              disabled={
                sessionLoading ||
                !scopeSubjectId ||
                (!scopeAllTopics && !scopeNoteId)
              }
            >
              {sessionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start Session"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default ExamMode;
