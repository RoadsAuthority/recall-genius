# send-reminders

Edge Function that sends in-app daily reminders to users with `reminder_frequency = 'daily'`, respecting `daily_reminder_count` (1–6) and at least 4 hours between reminders.

**Cron:** Call this function **hourly** (e.g. via Supabase cron, GitHub Actions, or cron-job.org) so reminders can fire at the right spacing. Set `CRON_SECRET` in Edge Function secrets and pass `Authorization: Bearer <CRON_SECRET>` when invoking.

**Invoke URL:** `POST https://<project-ref>.supabase.co/functions/v1/send-reminders`
