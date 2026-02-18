import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Brain, Eye, EyeOff, CheckCircle } from "lucide-react";
import { REVIEW_CONFIG } from "@/lib/config";

interface ReviewItem {
  block_id: string;
  block_content: string;
  questions: { id: string; question: string }[];
}

const Review = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchReviewItems();
  }, [user]);

  const fetchReviewItems = async () => {
    // Get blocks due for review that belong to this user
    const { data: blocks, error } = await supabase
      .from("note_blocks")
      .select("id, content, note_id, notes!inner(subject_id, subjects!inner(user_id))")
      .lte("next_review", new Date().toISOString())
      .order("next_review", { ascending: true })
      .limit(REVIEW_CONFIG.REVIEW_SESSION_LIMIT);

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

    const reviewItems: ReviewItem[] = blocks.map((block) => ({
      block_id: block.id,
      block_content: block.content,
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
              ? "No blocks are due for review. Create some notes first!"
              : "You've completed your review session. Great work!"}
          </p>
          <Button onClick={() => navigate("/dashboard")} className="gap-2">
            Back to Dashboard
          </Button>
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
            Review
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
              <p className="text-lg font-medium text-muted-foreground italic">
                No questions generated for this block. Try to recall the content below.
              </p>
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
          <Card className="border-accent/20 bg-accent/5">
            <CardContent className="p-6">
              <p className="text-base leading-relaxed whitespace-pre-wrap">{current.block_content}</p>
            </CardContent>
          </Card>
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
