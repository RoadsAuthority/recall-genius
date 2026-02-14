import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, Sparkles } from "lucide-react";

const NoteEditor = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subjectId, setSubjectId] = useState("");

  useEffect(() => {
    if (!noteId) return;

    const fetchNote = async () => {
      const { data: note } = await supabase
        .from("notes")
        .select("title, subject_id")
        .eq("id", noteId)
        .maybeSingle();

      if (note) {
        setTitle(note.title);
        setSubjectId(note.subject_id);
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
    };

    fetchNote();
  }, [noteId]);

  const saveNote = async () => {
    if (!noteId || !content.trim()) return;
    setSaving(true);

    try {
      // Split content into blocks (by double newline or single newline for paragraphs)
      const paragraphs = content
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

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

      toast.success("Note saved! Generating recall questions...");

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
              toast.success(`${questionsToInsert.length} recall questions generated!`);
            }
          }
        } catch (aiError) {
          console.error("AI question generation failed:", aiError);
          toast.error("Questions couldn't be generated. You can still review your blocks.");
        }
      }
    } catch (error: any) {
      toast.error("Failed to save note");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/subject/${subjectId}`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-display font-bold truncate">{title}</h1>
          </div>
          <Button onClick={saveNote} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save & Generate"}
          </Button>
        </div>

        <div className="bg-card rounded-lg border p-1">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start typing your notes here...&#10;&#10;Each paragraph (separated by a blank line) becomes a block that generates recall questions.&#10;&#10;Example:&#10;The mitochondria is the powerhouse of the cell. It produces ATP through cellular respiration.&#10;&#10;Binary search has a time complexity of O(log n). It works by dividing the search space in half."
            className="min-h-[60vh] border-0 focus-visible:ring-0 resize-none text-base leading-relaxed"
          />
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-accent" />
          <span>Separate paragraphs with blank lines. Each paragraph becomes a review block with auto-generated questions.</span>
        </div>
      </div>
    </AppLayout>
  );
};

export default NoteEditor;
