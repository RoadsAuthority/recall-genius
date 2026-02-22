
-- Definitions table
CREATE TABLE public.definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  definition TEXT NOT NULL,
  source_block_id UUID REFERENCES public.note_blocks(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own definitions" ON public.definitions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own definitions" ON public.definitions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own definitions" ON public.definitions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own definitions" ON public.definitions FOR DELETE USING (auth.uid() = user_id);

-- Concepts table
CREATE TABLE public.concepts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  block_id UUID REFERENCES public.note_blocks(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('definition', 'importance', 'characteristic', 'example', 'formula')),
  term TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own concepts" ON public.concepts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own concepts" ON public.concepts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own concepts" ON public.concepts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own concepts" ON public.concepts FOR DELETE USING (auth.uid() = user_id);
