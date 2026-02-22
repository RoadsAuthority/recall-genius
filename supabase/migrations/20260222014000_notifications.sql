
-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'reminder' CHECK (type IN ('reminder', 'system', 'premium')),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Helper to send a notification (for demo/logic)
-- In a real app, this might be triggered by a background job checking for due reviews.
CREATE OR REPLACE FUNCTION public.notify_user_review_due()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.next_review <= now() THEN
    INSERT INTO public.notifications (user_id, title, message)
    VALUES ((SELECT user_id FROM public.subjects s JOIN public.notes n ON n.subject_id = s.id WHERE n.id = NEW.note_id), 'Review Due', 'You have new notes ready for active recall!');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
