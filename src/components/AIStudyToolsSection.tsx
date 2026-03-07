import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, FileText, Layers, HelpCircle, Package, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

type ToolId = "summary" | "flashcards" | "practice" | "study-pack";

const AI_TOOL_ITEMS: { id: ToolId; label: string; icon: typeof FileText; description: string }[] = [
  { id: "summary", label: "AI Summary", icon: FileText, description: "Summarize notes into key points." },
  { id: "flashcards", label: "AI Flashcards", icon: Layers, description: "Auto-generate flashcards from content." },
  { id: "practice", label: "AI Practice Questions", icon: HelpCircle, description: "Generate practice questions and answers." },
  { id: "study-pack", label: "AI Study Pack Generator", icon: Package, description: "Create full study packs from your notes." },
];

interface StudyPackResult {
  summary?: string;
  key_concepts?: string[];
  flashcards?: { term: string; definition: string }[];
  practice_questions?: string[];
  multiple_choice?: { question: string; options: string[]; correct_index: number }[];
}

export interface AIStudyToolsSectionProps {
  title?: string;
  description?: string;
  compact?: boolean;
  className?: string;
}

export function AIStudyToolsSection({
  title = "AI Study Tools",
  description = "Premium AI features. Paste notes and generate summaries, flashcards, or full study packs.",
  compact = false,
  className = "",
}: AIStudyToolsSectionProps) {
  const { isPremium } = useProfile();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<ToolId | null>(null);
  const [content, setContent] = useState("");
  const [result, setResult] = useState<StudyPackResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openTool = (toolId: ToolId) => {
    if (!isPremium) {
      toast.error("Upgrade to Premium to use AI Study Tools.");
      return;
    }
    setSelectedTool(toolId);
    setContent("");
    setResult(null);
    setError(null);
    setModalOpen(true);
  };

  const runGenerate = async () => {
    if (!selectedTool || !content.trim() || content.trim().length < 50) {
      toast.error("Paste at least 50 characters of notes to generate.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-study-pack", {
        body: { content: content.trim() },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      const pack = data as StudyPackResult;
      setResult(pack);
      toast.success("Done!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to generate.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedTool(null);
    setContent("");
    setResult(null);
    setError(null);
  };

  const selectedItem = AI_TOOL_ITEMS.find((t) => t.id === selectedTool);

  return (
    <>
      <Card className={`border-accent/20 bg-accent/5 ${className}`}>
        <CardHeader className={compact ? "pb-2" : ""}>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-accent" />
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className={compact ? "space-y-2" : "space-y-3"}>
          {AI_TOOL_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border bg-background/50 p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{item.label}</p>
                    {!compact && (
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!isPremium && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Premium
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!isPremium}
                    onClick={() => openTool(item.id)}
                    aria-label={`Try ${item.label}`}
                  >
                    Try
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedItem && <selectedItem.icon className="h-5 w-5 text-accent" />}
              {selectedItem?.label}
            </DialogTitle>
            <DialogDescription>
              Paste your notes below (at least 50 characters). We&apos;ll generate{" "}
              {selectedTool === "summary" && "a summary"}
              {selectedTool === "flashcards" && "flashcards"}
              {selectedTool === "practice" && "practice questions"}
              {selectedTool === "study-pack" && "a full study pack (summary, concepts, flashcards, questions)"}.
            </DialogDescription>
          </DialogHeader>

          {!result ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="ai-notes">Your notes</Label>
                <Textarea
                  id="ai-notes"
                  placeholder="Paste or type your lecture notes, textbook excerpt, or any content to study..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[180px] mt-1.5 resize-y"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground mt-1">Minimum 50 characters.</p>
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button
                className="w-full gap-2"
                onClick={runGenerate}
                disabled={loading || content.trim().length < 50}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          ) : (
            <ScrollArea className="flex-1 max-h-[50vh] pr-4">
              <div className="space-y-4 text-sm">
                {selectedTool === "summary" && result.summary && (
                  <div>
                    <h4 className="font-semibold mb-2">Summary</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap">{result.summary}</p>
                  </div>
                )}
                {selectedTool === "flashcards" && result.flashcards && result.flashcards.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Flashcards</h4>
                    <div className="space-y-3">
                      {result.flashcards.map((f, i) => (
                        <div key={i} className="rounded-lg border bg-card p-3">
                          <p className="font-medium">{f.term}</p>
                          <p className="text-muted-foreground text-xs mt-1">{f.definition}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedTool === "practice" && result.practice_questions && result.practice_questions.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Practice Questions</h4>
                    <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                      {result.practice_questions.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ol>
                  </div>
                )}
                {selectedTool === "study-pack" && result && (
                  <div className="space-y-4">
                    {result.summary && (
                      <div>
                        <h4 className="font-semibold mb-2">Summary</h4>
                        <p className="text-muted-foreground whitespace-pre-wrap">{result.summary}</p>
                      </div>
                    )}
                    {result.key_concepts && result.key_concepts.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Key Concepts</h4>
                        <ul className="list-disc list-inside text-muted-foreground">
                          {result.key_concepts.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.flashcards && result.flashcards.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Flashcards</h4>
                        <div className="space-y-2">
                          {result.flashcards.map((f, i) => (
                            <div key={i} className="rounded-lg border bg-card p-2">
                              <p className="font-medium text-xs">{f.term}</p>
                              <p className="text-muted-foreground text-xs">{f.definition}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.practice_questions && result.practice_questions.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Practice Questions</h4>
                        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                          {result.practice_questions.map((q, i) => (
                            <li key={i}>{q}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {result.multiple_choice && result.multiple_choice.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Multiple Choice</h4>
                        <div className="space-y-3">
                          {result.multiple_choice.map((mc, i) => (
                            <div key={i} className="rounded-lg border bg-card p-3">
                              <p className="font-medium">{mc.question}</p>
                              <ul className="mt-2 space-y-1 text-muted-foreground text-xs">
                                {mc.options?.map((opt, j) => (
                                  <li key={j} className={j === mc.correct_index ? "text-accent font-medium" : ""}>
                                    {opt} {j === mc.correct_index && "✓"}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {result && (
            <Button variant="outline" onClick={() => { setResult(null); setContent(""); }}>
              Generate again
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AIStudyToolsSection;
