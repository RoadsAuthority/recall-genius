import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, Sparkles, Download, Upload, ChevronLeft, ChevronRight } from "lucide-react";
import { EDITOR_CONFIG } from "@/lib/config";
import { exportNoteToMarkdown, exportNoteToText } from "@/lib/export";
import { extractTextFromPdf } from "@/lib/pdf";
import { apiRequest } from "@/lib/apiClient";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Package, Lock, FileQuestion } from "lucide-react";

async function getGenerateQuestionsErrorMessage(e: unknown): Promise<string> {
  return e instanceof Error ? e.message : "Failed to generate questions. Check your connection and try again.";
}

const NoteEditor = () => {
  const FREE_QUIZ_QUESTION_LIMIT = 5;
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
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [importingPdf, setImportingPdf] = useState(false);
  const [isAiRailOpen, setIsAiRailOpen] = useState(true);

  useEffect(() => {
    if (!noteId) return;

    const fetchNote = async () => {
      const response = await apiRequest<{
        data: {
          title: string;
          subject_id: string;
          created_at: string;
          blocks: { content: string; block_order: number }[];
        };
      }>(`/api/notes/${encodeURIComponent(noteId)}`);

      const note = response.data;
      if (note) {
        setTitle(note.title);
        setSubjectId(note.subject_id);
        if (note.created_at) setLastSaved(new Date(note.created_at));
        if (Array.isArray(note.blocks) && note.blocks.length > 0) {
          setContent(note.blocks.map((b) => b.content).join("\n\n"));
        }
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

        const saveResponse = await apiRequest<{
          data: { inserted_blocks: { id: string; content: string }[] };
        }>(`/api/notes/${encodeURIComponent(noteId)}/content`, {
          method: "PUT",
          body: JSON.stringify({ title: title.trim(), blocks: paragraphs }),
        });
        const insertedBlocks = saveResponse.data.inserted_blocks;

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
                user_id: user?.id,
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
          await apiRequest<{ ok: boolean }>("/api/definitions/replace", {
            method: "POST",
            body: JSON.stringify({
              block_ids: blockIds,
              definitions: definitionsToInsert,
            }),
          });
        }

        if (!silent) {
          toast.success(isPremium ? "Note saved! Generating recall questions..." : "Note saved!");
        }

        // Generate questions via edge function (available on Free + Premium)
        if (insertedBlocks && insertedBlocks.length > 0) {
          try {
            const results = await apiRequest<any[]>("/api/ai/generate-questions", {
              method: "POST",
              body: JSON.stringify({
                blocks: insertedBlocks.map((b) => ({
                  id: b.id,
                  content: b.content,
                })),
              }),
            });
            if (Array.isArray(results)) {
              // Delete old questions for these blocks
              const blockIds = insertedBlocks.map((b) => b.id);
              const questionsToInsert = results.flatMap(
                (r: { block_id: string; questions: string[] }) =>
                  r.questions.map((q: string) => ({
                    block_id: r.block_id,
                    question: q,
                  })),
              );

              const limitedQuestions = isPremium
                ? questionsToInsert
                : questionsToInsert.slice(0, FREE_QUIZ_QUESTION_LIMIT);

              if (limitedQuestions.length > 0) {
                await apiRequest<{ ok: boolean }>("/api/recall-questions/replace", {
                  method: "POST",
                  body: JSON.stringify({
                    block_ids: blockIds,
                    questions: limitedQuestions,
                  }),
                });
                if (!silent) {
                  toast.success(
                    `${limitedQuestions.length} recall questions generated!`,
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
      const noteResponse = await apiRequest<{
        data: { blocks: { id: string; content: string }[] };
      }>(`/api/notes/${encodeURIComponent(noteId)}`);
      const blocks = noteResponse.data.blocks;
      if (!blocks || blocks.length === 0) {
        toast.dismiss();
        toast.error("Save the note first so we have blocks to generate questions from.");
        setGeneratingQuestions(false);
        return;
      }

      const results = await apiRequest<any[]>("/api/ai/generate-questions", {
        method: "POST",
        body: JSON.stringify({ blocks: blocks.map((b) => ({ id: b.id, content: b.content })) }),
      });
      if (!Array.isArray(results)) {
        toast.dismiss();
        toast.error("Could not generate questions. Try again.");
        setGeneratingQuestions(false);
        return;
      }

      const blockIds = blocks.map((b) => b.id);

      const questionsToInsert = results.flatMap(
        (r: { block_id: string; questions: string[] }) =>
          (r.questions || []).map((q: string) => ({
            block_id: r.block_id,
            question: q,
          })),
      );

      const limitedQuestions = isPremium
        ? questionsToInsert
        : questionsToInsert.slice(0, FREE_QUIZ_QUESTION_LIMIT);

      if (limitedQuestions.length > 0) {
        await apiRequest<{ ok: boolean }>("/api/recall-questions/replace", {
          method: "POST",
          body: JSON.stringify({
            block_ids: blockIds,
            questions: limitedQuestions,
          }),
        });
        toast.dismiss();
        toast.success(`${limitedQuestions.length} recall questions generated from your notes.`);
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
      if (!user) throw new Error("Not authenticated");

      // We need to find which block this concept belongs to (optional, but good for context)
      // For now, we'll just save it without block_id if it's too complex to map back from a large textarea
      const term = selection.text
        .split(/[:\-\n]/)[0]
        .trim()
        .substring(0, 50);
      const description = selection.text;

      await apiRequest<{ ok: boolean }>("/api/concepts", {
        method: "POST",
        body: JSON.stringify({
          user_id: user.id,
          subject_id: subjectId,
          type,
          term,
          description,
        }),
      });

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
      const data = await apiRequest<{ summary: string }>("/api/ai/summarize-content", {
        method: "POST",
        body: JSON.stringify({ content }),
      });

      toast.dismiss();
      toast.success("AI Summary", {
        description: data.summary,
        duration: 15000,
      });
    } catch (err: any) {
      toast.dismiss();
      console.error("Summarization error:", err);
      const errorMessage = err instanceof Error ? err.message : "AI summarization failed";
      toast.error(errorMessage);
    }
  };

  const handleGenerateStudyTools = async () => {
    if (!content.trim() || content.length < 100 || !noteId || !subjectId)
      return;

    if (!user) {
      toast.error("Please sign in to generate study tools.");
      return;
    }

    setGeneratingStudyTools(true);
    toast.loading("Generating study tools...");

    let successCount = 0;

    // 1. Summary
    try {
      const data = await apiRequest<{ summary?: string }>("/api/ai/summarize-content", {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      if (data?.summary) successCount++;
    } catch (err) {
      console.error("summarize-content error:", err);
    }

    // 2. Questions (triggered via saveNote which already handles this)
    await saveNote(true);

    // 3. Flashcards
    try {
      const data = await apiRequest<{ flashcards?: { question: string; answer: string }[] }>("/api/ai/generate-flashcards", {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      if (data?.flashcards?.length) {
        if (user) {
          await apiRequest<{ ok: boolean }>("/api/flashcards/replace", {
            method: "POST",
            body: JSON.stringify({
              note_id: noteId,
              flashcards: data.flashcards.map((f: { question: string; answer: string }) => ({
                user_id: user.id,
                subject_id: subjectId,
                question: f.question,
                answer: f.answer,
              })),
            }),
          });
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
      toast.error("Generation failed. Check your AI service setup and try again.");
    }
  };

  const handleExplainAI = async (level: "beginner" | "expert") => {
    if (!selection) return;

    toast.loading(`Generating AI explanation (${level})...`);

    const data = await apiRequest<{ explanation?: string; error?: string }>("/api/ai/explain-concept", {
      method: "POST",
      body: JSON.stringify({ term: selection.text, level, user_id: user?.id, subject_id: subjectId }),
    });

    toast.dismiss();

    if (data?.explanation) {
      toast.success("AI Explanation", {
        description: data.explanation,
        duration: 10000,
      });
    } else {
      toast.error("No explanation returned.");
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
      const data = await apiRequest<any>("/api/ai/generate-study-pack", {
        method: "POST",
        body: JSON.stringify({ content })
      });
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
      const data = await apiRequest<any>("/api/ai/generate-flashcards", {
        method: "POST",
        body: JSON.stringify({ content }),
      });

      const flashcards = data.flashcards;
      if (Array.isArray(flashcards) && flashcards.length > 0) {
        // Delete old flashcards for this note to avoid duplicates on auto-update
        if (!user) return;

        const flashcardsToInsert = flashcards.map(
          (f: { question: string; answer: string }) => ({
            user_id: user.id,
            subject_id: subjectId,
            note_id: noteId,
            question: f.question,
            answer: f.answer,
          }),
        );

        await apiRequest<{ ok: boolean }>("/api/flashcards/replace", {
          method: "POST",
          body: JSON.stringify({
            note_id: noteId,
            flashcards: flashcardsToInsert,
          }),
        });

        console.log(`Generated ${flashcardsToInsert.length} flashcards`);
      }
    } catch (err) {
      console.error("Flashcard generation error:", err);
    }
  };

  const handleImportPdf = async (file: File) => {
    // Guardrails: keep browser extraction snappy.
    const maxBytes = 15 * 1024 * 1024; // 15MB
    if (file.size > maxBytes) {
      toast.error("That PDF is too large to import in the browser (max 15MB).");
      return;
    }

    setImportingPdf(true);
    toast.loading("Importing PDF… extracting text");
    try {
      const { text, pagesExtracted, totalPages } = await extractTextFromPdf(file, {
        maxPages: 50,
        maxChars: 200_000,
      });

      if (!text || text.length < 20) {
        throw new Error("No selectable text found in this PDF. If it's scanned, try OCR first.");
      }

      setContent((prev) => {
        const prefix =
          prev.trim().length > 0 ? `${prev.trim()}\n\n---\nImported from PDF: ${file.name}\n---\n\n` : "";
        return `${prefix}${text}`;
      });

      toast.dismiss();
      toast.success("PDF imported", {
        description:
          totalPages > pagesExtracted
            ? `Imported text from the first ${pagesExtracted} of ${totalPages} pages.`
            : `Imported text from ${pagesExtracted} page${pagesExtracted === 1 ? "" : "s"}.`,
        duration: 6000,
      });
    } catch (e) {
      toast.dismiss();
      toast.error(e instanceof Error ? e.message : "Failed to import PDF");
      console.error("PDF import error:", e);
    } finally {
      setImportingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  };

  const renderAiWorkspace = (compact = false) => (
    <div className="rounded-lg border bg-accent/5 p-3 sm:p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            AI Workspace
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Generate study help directly from this note. Free plan includes summary, flashcards, and up to {FREE_QUIZ_QUESTION_LIMIT} quiz questions.
          </p>
        </div>
        {!isPremium && (
          <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-background border text-muted-foreground">
            Free Plan
          </span>
        )}
      </div>

      <div className={`grid gap-2 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-3"}`}>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerateStudyTools}
          disabled={!content.trim() || content.length < 100 || generatingStudyTools}
          className="justify-start gap-2 bg-background"
        >
          {generatingStudyTools ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generatingStudyTools ? "Generating..." : "Summary + Flashcards"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRegenerateQuestions}
          disabled={generatingQuestions || !noteId}
          className="justify-start gap-2 bg-background"
        >
          {generatingQuestions ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileQuestion className="h-4 w-4" />}
          {generatingQuestions ? "Generating..." : "Generate Quiz Questions"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={isPremium ? handleGenerateStudyPack : undefined}
          disabled={!isPremium || !content.trim() || content.length < 50 || generatingStudyPack}
          className="justify-start gap-2 bg-background"
        >
          {generatingStudyPack ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
          {generatingStudyPack ? "Generating..." : "Study Pack"}
          {!isPremium && <Lock className="h-3.5 w-3.5 ml-auto text-muted-foreground" />}
        </Button>
      </div>
    </div>
  );

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
      <div className="max-w-6xl mx-auto min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/subject/${subjectId}`)}
              className="shrink-0 min-h-10 min-w-10 p-0 sm:p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
              className="text-lg sm:text-xl font-display font-bold border-0 focus-visible:ring-2 bg-transparent px-0 h-auto min-w-0"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImportPdf(file);
              }}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pdfInputRef.current?.click()}
                    disabled={importingPdf}
                    className="gap-2"
                  >
                    {importingPdf ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">
                      {importingPdf ? "Importing…" : "Import PDF"}
                    </span>
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Import a PDF and convert it to text in this note (up to 50 pages / 15MB).
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
              {saving ? "Saving..." : "Save & Generate"}
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem] gap-4 items-start">
          <div className="space-y-4 min-w-0">
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

            <div className="lg:hidden">
              {renderAiWorkspace()}
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
          </div>

          <aside className="hidden lg:block sticky top-20">
            <div className="flex justify-end mb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsAiRailOpen((prev) => !prev)}
                aria-label={isAiRailOpen ? "Collapse AI rail" : "Expand AI rail"}
                className="h-8 w-8"
              >
                {isAiRailOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            </div>
            {isAiRailOpen ? (
              renderAiWorkspace(true)
            ) : (
              <Button
                variant="outline"
                className="w-full justify-center gap-2 bg-background"
                onClick={() => setIsAiRailOpen(true)}
              >
                <Sparkles className="h-4 w-4" />
                AI
              </Button>
            )}
          </aside>
        </div>

        {/* Study Pack result dialog — scrollable body */}
        <Dialog open={studyPackOpen} onOpenChange={setStudyPackOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-6 gap-4">
            <DialogHeader className="shrink-0 space-y-1">
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-accent" />
                Study Pack
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Summary, key concepts, flashcards, practice questions, and multiple choice from this note.
              </p>
            </DialogHeader>
            {studyPack && (
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-2 -mr-2" style={{ maxHeight: "min(70vh, 600px)" }}>
                <div className="space-y-6 text-sm pb-4">
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
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default NoteEditor;
