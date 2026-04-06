-- Support per-task weekly reminder chaining for tasker_bid_received template.
ALTER TABLE public.scheduled_emails
  ADD COLUMN IF NOT EXISTS related_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS related_bid_id UUID REFERENCES public.bids(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reminder_kind TEXT NOT NULL DEFAULT 'one_off',
  ADD COLUMN IF NOT EXISTS weekly_reminder_index INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_scheduled_emails_template_due
  ON public.scheduled_emails (template_type, send_after)
  WHERE sent_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_scheduled_emails_weekly_task_index
  ON public.scheduled_emails (template_type, related_task_id, weekly_reminder_index)
  WHERE template_type = 'tasker_bid_received'
    AND reminder_kind = 'weekly'
    AND sent_at IS NULL
    AND related_task_id IS NOT NULL
    AND weekly_reminder_index > 0;
