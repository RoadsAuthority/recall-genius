
-- Subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subjects" ON public.subjects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own subjects" ON public.subjects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subjects" ON public.subjects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own subjects" ON public.subjects FOR DELETE USING (auth.uid() = user_id);

-- Notes table
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notes" ON public.notes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.subjects WHERE subjects.id = notes.subject_id AND subjects.user_id = auth.uid())
);
CREATE POLICY "Users can create own notes" ON public.notes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.subjects WHERE subjects.id = notes.subject_id AND subjects.user_id = auth.uid())
);
CREATE POLICY "Users can update own notes" ON public.notes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.subjects WHERE subjects.id = notes.subject_id AND subjects.user_id = auth.uid())
);
CREATE POLICY "Users can delete own notes" ON public.notes FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.subjects WHERE subjects.id = notes.subject_id AND subjects.user_id = auth.uid())
);

-- Note blocks table
CREATE TABLE public.note_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  block_order INTEGER NOT NULL DEFAULT 0,
  confidence_score INTEGER NOT NULL DEFAULT 0,
  next_review TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.note_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own note_blocks" ON public.note_blocks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.notes JOIN public.subjects ON subjects.id = notes.subject_id WHERE notes.id = note_blocks.note_id AND subjects.user_id = auth.uid())
);
CREATE POLICY "Users can create own note_blocks" ON public.note_blocks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.notes JOIN public.subjects ON subjects.id = notes.subject_id WHERE notes.id = note_blocks.note_id AND subjects.user_id = auth.uid())
);
CREATE POLICY "Users can update own note_blocks" ON public.note_blocks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.notes JOIN public.subjects ON subjects.id = notes.subject_id WHERE notes.id = note_blocks.note_id AND subjects.user_id = auth.uid())
);
CREATE POLICY "Users can delete own note_blocks" ON public.note_blocks FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.notes JOIN public.subjects ON subjects.id = notes.subject_id WHERE notes.id = note_blocks.note_id AND subjects.user_id = auth.uid())
);

-- Recall questions table
CREATE TABLE public.recall_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  block_id UUID NOT NULL REFERENCES public.note_blocks(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.recall_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own recall_questions" ON public.recall_questions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.note_blocks
    JOIN public.notes ON notes.id = note_blocks.note_id
    JOIN public.subjects ON subjects.id = notes.subject_id
    WHERE note_blocks.id = recall_questions.block_id AND subjects.user_id = auth.uid()
  )
);
CREATE POLICY "Users can create own recall_questions" ON public.recall_questions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.note_blocks
    JOIN public.notes ON notes.id = note_blocks.note_id
    JOIN public.subjects ON subjects.id = notes.subject_id
    WHERE note_blocks.id = recall_questions.block_id AND subjects.user_id = auth.uid()
  )
);
CREATE POLICY "Users can delete own recall_questions" ON public.recall_questions FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.note_blocks
    JOIN public.notes ON notes.id = note_blocks.note_id
    JOIN public.subjects ON subjects.id = notes.subject_id
    WHERE note_blocks.id = recall_questions.block_id AND subjects.user_id = auth.uid()
  )
);
