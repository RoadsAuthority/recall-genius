import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Brain, Eye, EyeOff, CheckCircle, AlertTriangle, Sparkles, Clock } from "lucide-react";
import { REVIEW_CONFIG } from "@/lib/config";

interface ReviewItem {
  block_id: string;
  block_content: string;
  questions: { id: string; question: string }[];
}

const Review = () => {
  const { user } = useAuth();
  const { isPremium } = useProfile();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [practiceMode, setPracticeMode] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Check if we should be in practice mode
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "practice") {
      setPracticeMode(true);
    }

    fetchReviewItems(params.get("mode") === "practice");
  }, [user]);

  const fetchReviewItems = async (isPractice: boolean) => {
    setLoading(true);
    // Get blocks for review
    let query = supabase
      .from("note_blocks")
      .select("id, content, confidence_score, next_review, note_id, notes!inner(subject_id, subjects!inner(user_id))");

    // Only filter by due date if NOT in practice mode
    if (!isPractice) {
      query = query.lte("next_review", new Date().toISOString());
    }

    // Premium: Prioritize low confidence blocks
    if (isPremium) {
      query = query.order("confidence_score", { ascending: true });
    } else {
      query = query.order("next_review", { ascending: true });
    }

    const { data: blocks, error } = await query.limit(REVIEW_CONFIG.REVIEW_SESSION_LIMIT);

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    if (!blocks || blocks.length === 0) {
      setLoading(false);
      setCompleted(true);
      return;
    }

    // Fetch questions for these blocks
    const blockIds = blocks.map((b) => b.id);
    const { data: questions } = await supabase
      .from("recall_questions")
      .select("id, question, block_id")
      .in("block_id", blockIds);

    const reviewItems = blocks.map((block) => ({
      block_id: block.id,
      block_content: block.content,
      confidence_score: block.confidence_score,
      next_review: block.next_review,
      questions: (questions || []).filter((q) => q.block_id === block.id),
    }));

    setItems(reviewItems);
    setLoading(false);
  };

  const handleReview = async (difficulty: "forgot" | "hard" | "easy") => {
    const current = items[currentIndex];
    if (!current) return;

    const now = new Date();
    let nextReview: Date;
    let confidenceChange: number;

    switch (difficulty) {
      case "forgot":
        nextReview = new Date(now.getTime() + REVIEW_CONFIG.INTERVALS.FORGOT);
        confidenceChange = REVIEW_CONFIG.CONFIDENCE_CHANGES.FORGOT;
        break;
      case "hard":
        nextReview = new Date(now.getTime() + REVIEW_CONFIG.INTERVALS.HARD);
        confidenceChange = REVIEW_CONFIG.CONFIDENCE_CHANGES.HARD;
        break;
      case "easy":
        nextReview = new Date(now.getTime() + REVIEW_CONFIG.INTERVALS.EASY);
        confidenceChange = REVIEW_CONFIG.CONFIDENCE_CHANGES.EASY;
        break;
    }

    // Get current confidence
    const { data: blockData } = await supabase
      .from("note_blocks")
      .select("confidence_score")
      .eq("id", current.block_id)
      .maybeSingle();

    const currentConfidence = blockData?.confidence_score || 0;
    const newConfidence = Math.max(
      REVIEW_CONFIG.MIN_CONFIDENCE,
      Math.min(REVIEW_CONFIG.MAX_CONFIDENCE, currentConfidence + confidenceChange)
    );

    await supabase
      .from("note_blocks")
      .update({
        next_review: nextReview.toISOString(),
        confidence_score: newConfidence,
      })
      .eq("id", current.block_id);

    setShowAnswer(false);

    if (currentIndex + 1 >= items.length) {
      setCompleted(true);
      toast.success("Review session complete! 🎉");
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            <div className="h-5 w-16 bg-muted animate-pulse rounded" />
          </div>
          <div className="w-full bg-muted rounded-full h-2 animate-pulse" />
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </AppLayout>
    );
  }

  if (completed || items.length === 0) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto text-center py-16">
          <CheckCircle className="h-16 w-16 text-success mx-auto mb-6" />
          <h1 className="text-3xl font-display font-bold mb-3">All caught up!</h1>
          <p className="text-muted-foreground mb-8">
            {items.length === 0
              ? (practiceMode ? "You don't have any notes to practice yet. Create some notes first!" : "No blocks are due for review. You can still practice all your notes anytime!")
              : "You've completed your session. Great work!"}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate("/dashboard")} variant="outline">
              Back to Dashboard
            </Button>
            {!practiceMode && items.length === 0 && (
              <Button onClick={() => { setCompleted(false); setPracticeMode(true); fetchReviewItems(true); }} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Start Practice Session
              </Button>
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  const current = items[currentIndex];

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-accent" />
            {practiceMode ? "Practice" : "Review"}
            {practiceMode && (
              <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full uppercase tracking-wider ml-1">
                Practice Mode
              </span>
            )}
          </h1>
          <span className="text-sm text-muted-foreground font-medium">
            {currentIndex + 1} / {items.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="h-2 rounded-full gradient-accent transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
          />
        </div>

        {/* Question card */}
        <Card className="shadow-elevated">
          <CardContent className="p-8">
            {current.questions.length > 0 ? (
              <div className="space-y-4">
                {current.questions.map((q, i) => (
                  <div key={q.id}>
                    <p className="text-lg font-medium font-display">{q.question}</p>
                    {i < current.questions.length - 1 && <hr className="mt-4 border-border" />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-lg font-medium font-display">
                  What are the key points from this content?
                </p>
                <p className="text-sm text-muted-foreground">
                  Try to recall the main ideas, then show the answer to check yourself.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Answer toggle */}
        <Button
          variant="outline"
          onClick={() => setShowAnswer(!showAnswer)}
          className="w-full gap-2"
        >
          {showAnswer ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showAnswer ? "Hide Answer" : "Show Answer"}
        </Button>

        {showAnswer && (
          <div className="space-y-4">
            <Card className="border-accent/20 bg-accent/5">
              <CardContent className="p-6">
                <p className="text-base leading-relaxed whitespace-pre-wrap">{current.block_content}</p>
              </CardContent>
            </Card>

            {isPremium && (
              <div className="flex flex-col gap-3">
                {current.confidence_score < 40 && (
                  <div className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <div>
                      <span className="font-bold">Weakness Detected:</span> You've struggled with this concept recently. We'll prioritize it in your upcoming sessions.
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3 bg-accent/10 border border-accent/20 rounded-lg text-accent text-sm">
                  <Clock className="h-4 w-4 shrink-0" />
                  <div>
                    <span className="font-bold">Forgetfulness Prediction:</span> Based on your recall patterns, you're likely to forget this in about <span className="underline decoration-dotted">{Math.max(1, Math.floor(current.confidence_score / 15))} days</span> if not reviewed.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Difficulty buttons */}
        {showAnswer && (
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              onClick={() => handleReview("forgot")}
              className="flex flex-col py-4 h-auto border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            >
              <span className="font-display font-semibold">Forgot</span>
              <span className="text-xs text-muted-foreground">
                Review in {REVIEW_CONFIG.INTERVALS.FORGOT / (24 * 60 * 60 * 1000)} day
              </span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleReview("hard")}
              className="flex flex-col py-4 h-auto border-warning/30 hover:bg-warning/10 hover:text-warning"
            >
              <span className="font-display font-semibold">Hard</span>
              <span className="text-xs text-muted-foreground">
                Review in {REVIEW_CONFIG.INTERVALS.HARD / (24 * 60 * 60 * 1000)} days
              </span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleReview("easy")}
              className="flex flex-col py-4 h-auto border-success/30 hover:bg-success/10 hover:text-success"
            >
              <span className="font-display font-semibold">Easy</span>
              <span className="text-xs text-muted-foreground">
                Review in {REVIEW_CONFIG.INTERVALS.EASY / (24 * 60 * 60 * 1000)} days
              </span>
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Review;
