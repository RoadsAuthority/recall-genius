import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, FileText, Layers, HelpCircle, Package, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

type ToolId = "summary" | "flashcards" | "practice" | "study-pack";

const TOOL_META: Record<
  ToolId,
  { label: string; icon: typeof FileText; description: string; premiumOnly: boolean }
> = {
  summary: {
    label: "Summary",
    icon: FileText,
    description: "Summarize notes into key points.",
    premiumOnly: false,
  },
  practice: {
    label: "Study Questions",
    icon: HelpCircle,
    description: "Generate practice questions from your content.",
    premiumOnly: false,
  },
  flashcards: {
    label: "Flashcards",
    icon: Layers,
    description: "Auto-generate flashcards from content.",
    premiumOnly: true,
  },
  "study-pack": {
    label: "Study Pack",
    icon: Package,
    description: "Summary + concepts + flashcards + questions in one.",
    premiumOnly: true,
  },
};

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
  const [activeTool, setActiveTool] = useState<ToolId>("summary");
  const [content, setContent] = useState("");
  const [result, setResult] = useState<StudyPackResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canUseTool = useMemo(() => {
    return (tool: ToolId) => !TOOL_META[tool].premiumOnly || isPremium;
  }, [isPremium]);

  const runGenerate = async (tool: ToolId) => {
    if (!canUseTool(tool)) {
      toast.error("Premium feature", {
        description: "Upgrade to Premium to unlock this AI tool.",
      });
      return;
    }
    if (!content.trim() || content.trim().length < 50) {
      toast.error("Paste at least 50 characters of notes to generate.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const body = { content: content.trim() };
      const fn =
        tool === "summary"
          ? "summarize-content"
          : tool === "flashcards"
            ? "generate-flashcards"
            : tool === "practice"
              ? "generate-study-pack"
              : "generate-study-pack";

      const { data, error: fnError } = await supabase.functions.invoke(fn, { body });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      if (tool === "summary") {
        setResult({ summary: (data as { summary?: string })?.summary ?? "" });
      } else if (tool === "flashcards") {
        const raw = (data as { flashcards?: { question: string; answer: string }[] })?.flashcards ?? [];
        setResult({
          flashcards: raw.map((f) => ({ term: f.question, definition: f.answer })),
        });
      } else if (tool === "practice") {
        const pack = data as StudyPackResult;
        setResult({ practice_questions: pack.practice_questions ?? [] });
      } else {
        setResult(data as StudyPackResult);
      }
      toast.success("Done!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to generate.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setError(null);
    setResult(null);
  }, [activeTool]);

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
          <div className="space-y-3">
            <div>
              <Label htmlFor="ai-notes">Your notes</Label>
              <Textarea
                id="ai-notes"
                placeholder="Paste or type your notes here…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[140px] mt-1.5 resize-y bg-background/60"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground mt-1">Minimum 50 characters.</p>
            </div>

            <Tabs value={activeTool} onValueChange={(v) => setActiveTool(v as ToolId)}>
              <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4">
                {(["summary", "practice", "flashcards", "study-pack"] as ToolId[]).map((id) => {
                  const meta = TOOL_META[id];
                  const locked = meta.premiumOnly && !isPremium;
                  return (
                    <TabsTrigger key={id} value={id} disabled={locked} className="gap-2">
                      <meta.icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{meta.label}</span>
                      {locked && <Lock className="h-3 w-3" />}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {(["summary", "practice", "flashcards", "study-pack"] as ToolId[]).map((id) => {
                const meta = TOOL_META[id];
                const locked = meta.premiumOnly && !isPremium;
                return (
                  <TabsContent key={id} value={id} className="space-y-3">
                    <div className="flex items-start justify-between gap-3 rounded-lg border bg-background/50 p-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm flex items-center gap-2">
                          <meta.icon className="h-4 w-4 text-accent" />
                          {meta.label}
                          {locked && (
                            <span className="text-xs text-muted-foreground inline-flex items-center gap-1 ml-2">
                              <Lock className="h-3 w-3" /> Premium
                            </span>
                          )}
                        </p>
                        {!compact && (
                          <p className="text-xs text-muted-foreground mt-1">{meta.description}</p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 shrink-0"
                        disabled={locked || loading || content.trim().length < 50}
                        onClick={() => void runGenerate(id)}
                      >
                        {loading && activeTool === id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Generating…
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Generate
                          </>
                        )}
                      </Button>
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    {result && activeTool === id && (
                      <div className="rounded-lg border bg-card p-4 text-sm">
                        {id === "summary" && result.summary && (
                          <p className="text-muted-foreground whitespace-pre-wrap">{result.summary}</p>
                        )}

                        {id === "flashcards" && result.flashcards && result.flashcards.length > 0 && (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {result.flashcards.map((f, i) => (
                              <div key={i} className="rounded-lg border bg-background/60 p-3">
                                <p className="font-medium text-foreground">{f.term}</p>
                                <p className="text-xs text-muted-foreground mt-1">{f.definition}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {id === "practice" && result.practice_questions && result.practice_questions.length > 0 && (
                          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                            {result.practice_questions.map((q, i) => (
                              <li key={i}>{q}</li>
                            ))}
                          </ol>
                        )}

                        {id === "study-pack" && (
                          <div className="space-y-4">
                            {result.summary && (
                              <div>
                                <p className="font-semibold mb-1">Summary</p>
                                <p className="text-muted-foreground whitespace-pre-wrap">{result.summary}</p>
                              </div>
                            )}
                            {result.key_concepts && result.key_concepts.length > 0 && (
                              <div>
                                <p className="font-semibold mb-1">Key Concepts</p>
                                <ul className="list-disc list-inside text-muted-foreground">
                                  {result.key_concepts.map((c, i) => (
                                    <li key={i}>{c}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {result.flashcards && result.flashcards.length > 0 && (
                              <div>
                                <p className="font-semibold mb-2">Flashcards</p>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  {result.flashcards.map((f, i) => (
                                    <div key={i} className="rounded-lg border bg-background/60 p-3">
                                      <p className="font-medium text-foreground">{f.term}</p>
                                      <p className="text-xs text-muted-foreground mt-1">{f.definition}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {result.practice_questions && result.practice_questions.length > 0 && (
                              <div>
                                <p className="font-semibold mb-1">Practice Questions</p>
                                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                                  {result.practice_questions.map((q, i) => (
                                    <li key={i}>{q}</li>
                                  ))}
                                </ol>
                              </div>
                            )}
                            {result.multiple_choice && result.multiple_choice.length > 0 && (
                              <div>
                                <p className="font-semibold mb-2">Multiple Choice</p>
                                <div className="space-y-3">
                                  {result.multiple_choice.map((mc, i) => (
                                    <div key={i} className="rounded-lg border bg-background/60 p-3">
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

                        {(id === "summary" && !result.summary) ||
                        (id === "practice" && (!result.practice_questions || result.practice_questions.length === 0)) ||
                        (id === "flashcards" && (!result.flashcards || result.flashcards.length === 0)) ? (
                          <p className="text-muted-foreground">No results returned. Try adding more context.</p>
                        ) : null}
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default AIStudyToolsSection;
