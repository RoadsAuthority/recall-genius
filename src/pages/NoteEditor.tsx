import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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

const NoteEditor = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium } = useProfile();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subjectId, setSubjectId] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);
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

  // Auto-save functionality
  useEffect(() => {
    if (isInitialLoadRef.current || !noteId || !content.trim() || !title.trim()) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    setHasUnsavedChanges(true);

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveNote(true); // true = silent save (auto-save)
    }, EDITOR_CONFIG.AUTO_SAVE_DELAY);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
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

  const saveNote = useCallback(async (silent = false) => {
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
        if (!silent) toast.error("Please add more substantial content before saving.");
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

      for (const block of insertedBlocks) {
        // Try to match definitions at the start of blocks/paragraphs
        for (const pattern of extractionPatterns) {
          const match = block.content.match(pattern);
          // Ensure term is not too long and definition is substantial
          if (match && match[1] && match[2] && match[1].length < 50 && match[2].length > 10) {
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
        await supabase.from("definitions").delete().in("source_block_id", blockIds);

        const { error: defError } = await supabase.from("definitions").insert(definitionsToInsert);
        if (defError) console.error("Error saving definitions:", defError);
      }

      if (!silent) {
        toast.success("Note saved! Generating recall questions...");
      }

      // Generate questions via edge function
      if (insertedBlocks && insertedBlocks.length > 0) {
        try {
          const response = await supabase.functions.invoke("generate-questions", {
            body: { blocks: insertedBlocks.map((b) => ({ id: b.id, content: b.content })) },
          });

          if (response.error) throw response.error;

          const results = response.data;
          if (Array.isArray(results)) {
            // Delete old questions for these blocks
            const blockIds = insertedBlocks.map((b) => b.id);
            await supabase.from("recall_questions").delete().in("block_id", blockIds);

            // Insert new questions
            const questionsToInsert = results.flatMap((r: { block_id: string; questions: string[] }) =>
              r.questions.map((q: string) => ({
                block_id: r.block_id,
                question: q,
              }))
            );

            if (questionsToInsert.length > 0) {
              await supabase.from("recall_questions").insert(questionsToInsert);
              if (!silent) {
                toast.success(`${questionsToInsert.length} recall questions generated!`);
              }
            }
          }
        } catch (aiError) {
          console.error("AI question generation failed:", aiError);
          if (!silent) {
            toast.error("Questions couldn't be generated. You can still review your blocks.");
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
  }, [noteId, content, title, subjectId]);

  const handleTextSelection = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd).trim();
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
      const term = selection.text.split(/[:\-\n]/)[0].trim().substring(0, 50);
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
      const { data, error } = await supabase.functions.invoke("summarize-content", {
        body: { content },
      });

      if (error) throw error;

      toast.dismiss();
      toast.success("AI Summary", {
        description: data.summary,
        duration: 15000,
      });
    } catch (err) {
      toast.dismiss();
      toast.error("AI summarization failed");
    }
  };

  const handleExplainAI = async (level: "beginner" | "expert") => {
    if (!selection) return;

    toast.loading(`Generating AI explanation (${level})...`);

    try {
      const { data, error } = await supabase.functions.invoke("explain-concept", {
        body: { term: selection.text, level },
      });

      if (error) throw error;

      toast.dismiss();
      // Show explanation in a dialog or toast (using toast for speed now)
      toast.success("AI Explanation", {
        description: data.explanation,
        duration: 10000,
      });
    } catch (err) {
      toast.dismiss();
      toast.error("AI explanation failed");
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
            <Button variant="ghost" size="sm" onClick={() => navigate(`/subject/${subjectId}`)}>
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
                  onClick={() => exportNoteToMarkdown(noteId || "", title || "Untitled", content)}
                  disabled={!content.trim()}
                >
                  Export as Markdown
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportNoteToText(noteId || "", title || "Untitled", content)}
                  disabled={!content.trim()}
                >
                  Export as Text
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={handleSummarize} className="gap-2 text-accent border-accent/20 hover:bg-accent/5">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">AI Summarize</span>
            </Button>
            <Button onClick={() => saveNote(false)} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save & Generate"}
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
              <div className="text-[10px] font-bold px-2 py-1 text-muted-foreground uppercase">Save Selection As:</div>
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
            <span>Separate paragraphs with blank lines. Each paragraph becomes a review block with auto-generated questions.</span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-xs">
            <span>Ctrl+S to save</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default NoteEditor;
