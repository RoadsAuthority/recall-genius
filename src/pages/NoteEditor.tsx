import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, Sparkles, Download } from "lucide-react";
import { EDITOR_CONFIG } from "@/lib/config";
import { exportNoteToMarkdown, exportNoteToText } from "@/lib/export";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Package, Lock, FileQuestion } from "lucide-react";

async function getGenerateQuestionsErrorMessage(e: unknown): Promise<string> {
  try {
    if (e instanceof FunctionsHttpError && e.context && typeof (e.context as Response).json === "function") {
      const body = await (e.context as Response).json();
      const msg = (body as { error?: string })?.error;
      if (msg) return msg;
    }
  } catch (_) {
    /* ignore */
  }
  return e instanceof Error ? e.message : "Failed to generate questions. Check your connection and try again.";
}

const NoteEditor = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium } = useProfile();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [generatingStudyTools, setGeneratingStudyTools] = useState(false);
  const [generatingStudyPack, setGeneratingStudyPack] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [studyPackOpen, setStudyPackOpen] = useState(false);
  const [studyPack, setStudyPack] = useState<{
    summary: string;
    key_concepts: string[];
    flashcards: { term: string; definition: string }[];
    practice_questions: string[];
    multiple_choice: { question: string; options: string[]; correct_index: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [subjectId, setSubjectId] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);
  const [selection, setSelection] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!noteId) return;

    const fetchNote = async () => {
      const { data: note } = await supabase
        .from("notes")
        .select("title, subject_id, created_at")
        .eq("id", noteId)
        .maybeSingle();

      if (note) {
        setTitle(note.title);
        setSubjectId(note.subject_id);
        if (note.created_at) {
          setLastSaved(new Date(note.created_at));
        }
      }

      // Load existing blocks
      const { data: blocks } = await supabase
        .from("note_blocks")
        .select("content, block_order")
        .eq("note_id", noteId)
        .order("block_order", { ascending: true });

      if (blocks && blocks.length > 0) {
        setContent(blocks.map((b) => b.content).join("\n\n"));
      }

      setLoading(false);
      isInitialLoadRef.current = false;
    };

    fetchNote();
  }, [noteId]);

  // Auto-save only — fires after 2s of inactivity
  useEffect(() => {
    if (isInitialLoadRef.current || !noteId || !content.trim() || !title.trim())
      return;

    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);

    setHasUnsavedChanges(true);

    autoSaveTimeoutRef.current = setTimeout(() => {
      saveNote(true);
    }, EDITOR_CONFIG.AUTO_SAVE_DELAY);

    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [content, title, noteId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!saving && noteId && content.trim()) {
          saveNote(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [content, noteId, saving]);

  const saveNote = useCallback(
    async (silent = false) => {
      if (!noteId || !content.trim() || !title.trim()) return;
      setSaving(true);

      try {
        // Update note title
        const { error: noteError } = await supabase
          .from("notes")
          .update({ title: title.trim() })
          .eq("id", noteId);

        if (noteError) throw noteError;

        // Split content into blocks (by double newline or single newline for paragraphs)
        const paragraphs = content
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter((p) => p.length > 5); // Filter out very short or empty blocks

        // Only delete if we have new content to replace it with, or handle empty state
        if (paragraphs.length === 0) {
          if (!silent)
            toast.error("Please add more substantial content before saving.");
          return;
        }

        // Delete existing blocks for this note
        await supabase.from("note_blocks").delete().eq("note_id", noteId);

        // Insert new blocks
        const blocksToInsert = paragraphs.map((p, i) => ({
          note_id: noteId,
          content: p,
          block_order: i,
          confidence_score: 0,
          next_review: new Date().toISOString(),
        }));

        const { data: insertedBlocks, error } = await supabase
          .from("note_blocks")
          .insert(blocksToInsert)
          .select("id, content");

        if (error) throw error;

        // Extract and save definitions automatically
        const definitionsToInsert = [];
        const extractionPatterns = [
          /^([^.]+?)\s+is\s+([^.]+?)(?:\.|$)/i,
          /^([^.]+?)\s+refers to\s+([^.]+?)(?:\.|$)/i,
          /^([^.]+?)\s+is defined as\s+([^.]+?)(?:\.|$)/i,
          /^([^.]+?)\s+can be described as\s+([^.]+?)(?:\.|$)/i,
          /^([^.]+?)\s+is the process of\s+([^.]+?)(?:\.|$)/i,
        ];

        const seenTerms = new Set<string>();
        for (const block of insertedBlocks) {
          for (const pattern of extractionPatterns) {
            const match = block.content.match(pattern);
            if (
              match &&
              match[1] &&
              match[2] &&
              match[1].length < 50 &&
              match[2].length > 10
            ) {
              const termKey = match[1].trim().toLowerCase();
              if (seenTerms.has(termKey)) break;
              seenTerms.add(termKey);
              definitionsToInsert.push({
                user_id: (await supabase.auth.getUser()).data.user?.id,
                subject_id: subjectId,
                term: match[1].trim(),
                definition: match[2].trim(),
                source_block_id: block.id,
              });
              break;
            }
          }
        }

        if (definitionsToInsert.length > 0) {
          // Delete old definitions for these blocks to avoid duplicates on resave
          const blockIds = insertedBlocks.map((b) => b.id);
          await supabase
            .from("definitions")
            .delete()
            .in("source_block_id", blockIds);

          const { error: defError } = await supabase
            .from("definitions")
            .insert(definitionsToInsert);
          if (defError) console.error("Error saving definitions:", defError);
        }

        if (!silent) {
          toast.success(isPremium ? "Note saved! Generating recall questions..." : "Note saved!");
        }

        // Generate questions via edge function (Premium only — no AI on Free)
        if (isPremium && insertedBlocks && insertedBlocks.length > 0) {
          try {
            const response = await supabase.functions.invoke(
              "generate-questions",
              {
                body: {
                  blocks: insertedBlocks.map((b) => ({
                    id: b.id,
                    content: b.content,
                  })),
                },
              },
            );

            if (response.error) throw response.error;

            const results = response.data;
            if (Array.isArray(results)) {
              // Delete old questions for these blocks
              const blockIds = insertedBlocks.map((b) => b.id);
              await supabase
                .from("recall_questions")
                .delete()
                .in("block_id", blockIds);

              // Insert new questions
              const questionsToInsert = results.flatMap(
                (r: { block_id: string; questions: string[] }) =>
                  r.questions.map((q: string) => ({
                    block_id: r.block_id,
                    question: q,
                  })),
              );

              if (questionsToInsert.length > 0) {
                await supabase
                  .from("recall_questions")
                  .insert(questionsToInsert);
                if (!silent) {
                  toast.success(
                    `${questionsToInsert.length} recall questions generated!`,
                  );
                }
              }
            }
          } catch (aiError) {
            console.error("AI question generation failed:", aiError);
            if (!silent) {
              const msg = await getGenerateQuestionsErrorMessage(aiError);
              toast.error(msg);
            }
          }
        }

        setLastSaved(new Date());
        setHasUnsavedChanges(false);
      } catch (error: any) {
        if (!silent) {
          toast.error("Failed to save note");
        }
        console.error(error);
      } finally {
        setSaving(false);
      }
    },
    [noteId, content, title, subjectId, isPremium],
  );

  const handleRegenerateQuestions = async () => {
    if (!noteId) return;
    setGeneratingQuestions(true);
    toast.loading("Generating questions with AI...");
    try {
      const { data: blocks, error: blocksError } = await supabase
        .from("note_blocks")
        .select("id, content")
        .eq("note_id", noteId)
        .order("block_order", { ascending: true });

      if (blocksError) throw blocksError;
      if (!blocks || blocks.length === 0) {
        toast.dismiss();
        toast.error("Save the note first so we have blocks to generate questions from.");
        setGeneratingQuestions(false);
        return;
      }

      const response = await supabase.functions.invoke("generate-questions", {
        body: { blocks: blocks.map((b) => ({ id: b.id, content: b.content })) },
      });

      if (response.error) throw response.error;

      const results = response.data;
      if (!Array.isArray(results)) {
        toast.dismiss();
        toast.error("Could not generate questions. Try again.");
        setGeneratingQuestions(false);
        return;
      }

      const blockIds = blocks.map((b) => b.id);
      await supabase.from("recall_questions").delete().in("block_id", blockIds);

      const questionsToInsert = results.flatMap(
        (r: { block_id: string; questions: string[] }) =>
          (r.questions || []).map((q: string) => ({
            block_id: r.block_id,
            question: q,
          })),
      );

      if (questionsToInsert.length > 0) {
        await supabase.from("recall_questions").insert(questionsToInsert);
        toast.dismiss();
        toast.success(`${questionsToInsert.length} recall questions generated from your notes.`);
      } else {
        toast.dismiss();
        toast.info("No questions returned. Try saving the note again or rephrasing content.");
      }
    } catch (e) {
      toast.dismiss();
      console.error("Regenerate questions error:", e);
      const msg = await getGenerateQuestionsErrorMessage(e);
      toast.error(msg);
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const handleTextSelection = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const selectedText = textarea.value
      .substring(textarea.selectionStart, textarea.selectionEnd)
      .trim();
    if (selectedText.length > 0) {
      // Basic positioning for the popup (simplified)
      const rect = textarea.getBoundingClientRect();
      setSelection({
        text: selectedText,
        x: rect.left + 20,
        y: rect.top + 50,
      });
    } else {
      setSelection(null);
    }
  };

  const saveConcept = async (type: string) => {
    if (!selection || !noteId || !subjectId) return;

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      // We need to find which block this concept belongs to (optional, but good for context)
      // For now, we'll just save it without block_id if it's too complex to map back from a large textarea
      const term = selection.text
        .split(/[:\-\n]/)[0]
        .trim()
        .substring(0, 50);
      const description = selection.text;

      const { error } = await supabase.from("concepts").insert({
        user_id: user.user.id,
        subject_id: subjectId,
        type,
        term,
        description,
      });

      if (error) throw error;

      toast.success(`Saved as ${type}`);
      setSelection(null);
    } catch (error) {
      console.error("Error saving concept:", error);
      toast.error("Failed to save concept");
    }
  };

  const handleSummarize = async () => {
    if (!content.trim()) {
      toast.error("Add some content first to summarize");
      return;
    }

    toast.loading("Generating AI summary...");

    try {
      const { data, error } = await supabase.functions.invoke(
        "summarize-content",
        {
          body: { content },
        },
      );

      if (error) throw error;

      toast.dismiss();
      toast.success("AI Summary", {
        description: data.summary,
        duration: 15000,
      });
    } catch (err: any) {
      toast.dismiss();
      console.error("Summarization error:", err);
      const errorMessage =
        err.context?.error || err.message || "AI summarization failed";
      toast.error(errorMessage);
    }
  };

  const handleGenerateStudyTools = async () => {
    if (!content.trim() || content.length < 100 || !noteId || !subjectId)
      return;

    // Ensure authenticated session before calling any Edge Function
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please sign in to generate study tools.");
      return;
    }

    setGeneratingStudyTools(true);
    toast.loading("Generating study tools...");

    let successCount = 0;

    // 1. Summary
    try {
      const { data, error } = await supabase.functions.invoke(
        "summarize-content",
        { body: { content } },
      );
      if (error) throw error;
      if (data?.summary) successCount++;
    } catch (err) {
      console.error("summarize-content error:", err);
    }

    // 2. Questions (triggered via saveNote which already handles this)
    await saveNote(true);

    // 3. Flashcards
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-flashcards",
        { body: { content } },
      );
      if (error) throw error;
      if (data?.flashcards?.length) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("flashcards")
          .delete()
          .eq("note_id", noteId);
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any).from("flashcards").insert(
            data.flashcards.map((f: { question: string; answer: string }) => ({
              user_id: userData.user!.id,
              subject_id: subjectId,
              note_id: noteId,
              question: f.question,
              answer: f.answer,
            })),
          );
          successCount++;
        }
      }
    } catch (err) {
      console.error("generate-flashcards error:", err);
    }

    toast.dismiss();
    setGeneratingStudyTools(false);
    if (successCount > 0) {
      toast.success("Study tools generated!", {
        description: "Summary and flashcards are ready.",
      });
    } else {
      toast.error("Generation failed. Check your Groq quota and try again.");
    }
  };

  const handleExplainAI = async (level: "beginner" | "expert") => {
    if (!selection) return;

    toast.loading(`Generating AI explanation (${level})...`);

    try {
      const { data, error } = await supabase.functions.invoke(
        "explain-concept",
        {
          body: { term: selection.text, level },
        },
      );

      if (error) throw error;

      toast.dismiss();
      // Show explanation in a dialog or toast (using toast for speed now)
      toast.success("AI Explanation", {
        description: data.explanation,
        duration: 10000,
      });
    } catch (err: any) {
      toast.dismiss();
      console.error("AI explanation error:", err);
      const errorMessage =
        err.context?.error || err.message || "AI explanation failed";
      toast.error(errorMessage);
    }
  };

  const handleGenerateStudyPack = async () => {
    if (!content.trim() || content.length < 50) {
      toast.error("Add more note content first (at least 50 characters).");
      return;
    }
    setGeneratingStudyPack(true);
    toast.loading("Generating study pack...");
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-study-pack",
        { body: { content } }
      );
      if (error) throw error;
      if (!data || (!data.summary && !data.key_concepts?.length && !data.flashcards?.length)) {
        throw new Error("No study pack content returned");
      }
      setStudyPack({
        summary: data.summary ?? "",
        key_concepts: data.key_concepts ?? [],
        flashcards: data.flashcards ?? [],
        practice_questions: data.practice_questions ?? [],
        multiple_choice: data.multiple_choice ?? [],
      });
      setStudyPackOpen(true);
      toast.dismiss();
      toast.success("Study pack ready");
    } catch (err: unknown) {
      toast.dismiss();
      console.error("Study pack error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to generate study pack"
      );
    } finally {
      setGeneratingStudyPack(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!content.trim() || !noteId || !subjectId) return;

    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-flashcards",
        {
          body: { content },
        },
      );

      if (error) throw error;

      const flashcards = data.flashcards;
      if (Array.isArray(flashcards) && flashcards.length > 0) {
        // Delete old flashcards for this note to avoid duplicates on auto-update
        await supabase.from("flashcards").delete().eq("note_id", noteId);

        const { user } = await supabase.auth.getUser();
        if (!user.user) return;

        const flashcardsToInsert = flashcards.map(
          (f: { question: string; answer: string }) => ({
            user_id: user.user.id,
            subject_id: subjectId,
            note_id: noteId,
            question: f.question,
            answer: f.answer,
          }),
        );

        const { error: insertError } = await supabase
          .from("flashcards")
          .insert(flashcardsToInsert);
        if (insertError) throw insertError;

        console.log(`Generated ${flashcardsToInsert.length} flashcards`);
      }
    } catch (err) {
      console.error("Flashcard generation error:", err);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-muted animate-pulse rounded" />
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          </div>
          <div className="bg-card rounded-lg border p-1">
            <div className="min-h-[60vh] bg-muted animate-pulse rounded" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4 max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/subject/${subjectId}`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
              className="text-xl font-display font-bold border-0 focus-visible:ring-2 bg-transparent px-0 h-auto"
            />
          </div>
          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Unsaved changes
              </span>
            )}
            {lastSaved && !hasUnsavedChanges && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    isPremium &&
                    exportNoteToMarkdown(
                      noteId || "",
                      title || "Untitled",
                      content,
                    )
                  }
                  disabled={!content.trim() || !isPremium}
                  className={!isPremium ? "opacity-70" : ""}
                >
                  Export as Markdown
                  {!isPremium && <Lock className="ml-2 h-3 w-3 shrink-0" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    exportNoteToText(noteId || "", title || "Untitled", content)
                  }
                  disabled={!content.trim()}
                >
                  Export as Text
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Study Pack — Premium only (Smart summaries) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={isPremium ? handleGenerateStudyPack : undefined}
                    disabled={
                      !isPremium ||
                      !content.trim() ||
                      content.length < 50 ||
                      generatingStudyPack
                    }
                    className="gap-2 text-accent border-accent/20 hover:bg-accent/5"
                  >
                    {generatingStudyPack ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Package className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">
                      {generatingStudyPack ? "Generating..." : "Study Pack"}
                    </span>
                    {!isPremium && <Lock className="h-3 w-3 opacity-70" />}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {isPremium
                  ? "Smart summaries, key concepts, flashcards, practice questions"
                  : "Premium — upgrade for Study Pack (smart summaries)"}
              </TooltipContent>
            </Tooltip>
            {/* Premium AI: Generate Study Tools */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={isPremium ? handleGenerateStudyTools : undefined}
                    disabled={
                      !isPremium ||
                      !content.trim() ||
                      content.length < 100 ||
                      generatingStudyTools
                    }
                    className="gap-2 text-accent border-accent/20 hover:bg-accent/5"
                  >
                    {generatingStudyTools ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">
                      {generatingStudyTools
                        ? "Generating..."
                        : "Generate Study Tools"}
                    </span>
                    {!isPremium && <Lock className="h-3 w-3 opacity-70" />}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {isPremium
                  ? "Generate summary and flashcards from this note"
                  : "Premium feature — upgrade to use AI study tools"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={isPremium ? handleRegenerateQuestions : undefined}
                    disabled={!isPremium || generatingQuestions || !noteId}
                    className="gap-2"
                  >
                    {generatingQuestions ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileQuestion className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">
                      {generatingQuestions ? "Generating..." : "Generate questions"}
                    </span>
                    {!isPremium && <Lock className="h-3 w-3 opacity-70" />}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {isPremium
                  ? "AI study questions from saved blocks. Save first, then click."
                  : "Premium — upgrade for AI study questions"}
              </TooltipContent>
            </Tooltip>
            <Button
              onClick={() => saveNote(false)}
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving..." : isPremium ? "Save & Generate" : "Save"}
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-lg border p-1 relative">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onSelect={handleTextSelection}
            placeholder="Start typing your notes here...&#10;&#10;Each paragraph (separated by a blank line) becomes a block that generates recall questions.&#10;&#10;Tip: Write clear, focused paragraphs. Each paragraph will be converted into reviewable blocks with AI-generated questions."
            className="min-h-[60vh] border-0 focus-visible:ring-0 resize-none text-base leading-relaxed font-mono"
          />

          {selection && (
            <div
              className="absolute z-50 bg-popover text-popover-foreground border rounded-md shadow-lg p-1 flex flex-col gap-1 w-48"
              style={{ top: "10px", right: "10px" }} // Fixed position for simplicity in textarea
            >
              <div className="text-[10px] font-bold px-2 py-1 text-muted-foreground uppercase">
                Save Selection As:
              </div>
              <button
                onClick={() => saveConcept("definition")}
                className="text-left px-2 py-1 text-sm hover:bg-accent rounded-sm transition-colors"
                type="button"
              >
                Definition
              </button>
              <button
                onClick={() => saveConcept("importance")}
                className="text-left px-2 py-1 text-sm hover:bg-accent rounded-sm transition-colors"
                type="button"
              >
                Important Concept
              </button>
              <button
                onClick={() => saveConcept("characteristic")}
                className="text-left px-2 py-1 text-sm hover:bg-accent rounded-sm transition-colors"
                type="button"
              >
                Characteristic
              </button>
              <button
                onClick={() => saveConcept("example")}
                className="text-left px-2 py-1 text-sm hover:bg-accent rounded-sm transition-colors"
                type="button"
              >
                Example
              </button>
              <button
                onClick={() => saveConcept("formula")}
                className="text-left px-2 py-1 text-sm hover:bg-accent rounded-sm transition-colors"
                type="button"
              >
                Formula
              </button>
              <div className="border-t my-1" />
              <div className="text-[10px] font-bold px-2 py-1 text-accent uppercase flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                AI Insight
              </div>
              <button
                onClick={() => handleExplainAI("beginner")}
                className="text-left px-2 py-1 text-sm hover:bg-accent rounded-sm transition-colors"
                type="button"
              >
                Explain like I'm 5
              </button>
              <button
                onClick={() => handleExplainAI("expert")}
                className="text-left px-2 py-1 text-sm hover:bg-accent rounded-sm transition-colors"
                type="button"
              >
                Expert Explanation
              </button>
              <div className="border-t my-1" />
              <button
                onClick={() => setSelection(null)}
                className="text-left px-2 py-1 text-xs text-muted-foreground hover:bg-accent rounded-sm transition-colors"
                type="button"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <span>
              Separate paragraphs with blank lines. Each paragraph becomes a
              review block with auto-generated questions.
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-xs">
            <span>Ctrl+S to save</span>
          </div>
        </div>

        {/* Study Pack result dialog — improved layout */}
        <Dialog open={studyPackOpen} onOpenChange={setStudyPackOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-accent" />
                Study Pack
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Summary, key concepts, flashcards, practice questions, and multiple choice from this note.
              </p>
            </DialogHeader>
            {studyPack && (
              <ScrollArea className="flex-1 pr-4 -mr-4">
                <div className="space-y-6 text-sm">
                  {studyPack.summary && (
                    <section className="space-y-2">
                      <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-accent text-xs font-bold">1</span>
                        Summary
                      </h3>
                      <div className="rounded-xl border bg-card/50 p-4">
                        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {studyPack.summary}
                        </p>
                      </div>
                    </section>
                  )}
                  {studyPack.key_concepts?.length > 0 && (
                    <section className="space-y-2">
                      <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-accent text-xs font-bold">2</span>
                        Key Concepts
                      </h3>
                      <div className="rounded-xl border bg-card/50 p-4">
                        <ul className="list-disc list-inside space-y-1.5 text-muted-foreground">
                          {studyPack.key_concepts.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    </section>
                  )}
                  {studyPack.flashcards?.length > 0 && (
                    <section className="space-y-2">
                      <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-accent text-xs font-bold">3</span>
                        Flashcards
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {studyPack.flashcards.map((f, i) => (
                          <div
                            key={i}
                            className="rounded-xl border bg-card p-3 space-y-1.5 shadow-sm"
                          >
                            <p className="font-medium text-foreground text-xs uppercase tracking-wider text-muted-foreground">Term</p>
                            <p className="font-medium text-foreground">{f.term}</p>
                            <p className="text-xs text-muted-foreground border-t pt-2 mt-2">Definition</p>
                            <p className="text-muted-foreground">{f.definition}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                  {studyPack.practice_questions?.length > 0 && (
                    <section className="space-y-2">
                      <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-accent text-xs font-bold">4</span>
                        Practice Questions
                      </h3>
                      <div className="rounded-xl border bg-card/50 p-4 space-y-3">
                        <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                          {studyPack.practice_questions.map((q, i) => (
                            <li key={i} className="pl-1">{q}</li>
                          ))}
                        </ol>
                      </div>
                    </section>
                  )}
                  {studyPack.multiple_choice?.length > 0 && (
                    <section className="space-y-2">
                      <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-accent text-xs font-bold">5</span>
                        Multiple Choice
                      </h3>
                      <div className="space-y-4">
                        {studyPack.multiple_choice.map((mc, i) => (
                          <div
                            key={i}
                            className="rounded-xl border bg-card p-4 space-y-3 shadow-sm"
                          >
                            <p className="font-medium text-foreground">
                              {i + 1}. {mc.question}
                            </p>
                            <ul className="space-y-1.5 text-muted-foreground">
                              {mc.options?.map((opt, j) => (
                                <li
                                  key={j}
                                  className={
                                    j === mc.correct_index
                                      ? "text-accent font-medium flex items-center gap-2"
                                      : "flex items-center gap-2"
                                  }
                                >
                                  <span className="text-muted-foreground/70">{String.fromCharCode(65 + j)}.</span>
                                  {opt}
                                  {j === mc.correct_index && " ✓"}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default NoteEditor;
