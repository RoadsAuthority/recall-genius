-- Daily reminder count (1–6). Reminders spaced at least 4 hours apart (max 6 per day).
ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS daily_reminder_count INTEGER NOT NULL DEFAULT 2
    CHECK (daily_reminder_count >= 1 AND daily_reminder_count <= 6);

ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.notification_settings.daily_reminder_count IS 'When reminder_frequency is daily: how many times per day (1–6). At least 4 hours between reminders.';
COMMENT ON COLUMN public.notification_settings.last_reminder_sent_at IS 'Last time we sent an in-app reminder; used to enforce spacing.';
