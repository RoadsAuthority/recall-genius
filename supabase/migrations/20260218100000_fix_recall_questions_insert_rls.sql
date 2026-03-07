-- Fix recall_questions INSERT RLS: use scalar subquery so WITH CHECK passes for user-owned blocks.
-- Resolves 403 Forbidden when inserting after generating questions.

DROP POLICY IF EXISTS "Users can create own recall_questions" ON public.recall_questions;

CREATE POLICY "Users can create own recall_questions" ON public.recall_questions
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = (
      SELECT s.user_id
      FROM public.note_blocks nb
      INNER JOIN public.notes n ON n.id = nb.note_id
      INNER JOIN public.subjects s ON s.id = n.subject_id
      WHERE nb.id = recall_questions.block_id
      LIMIT 1
    )
  );
