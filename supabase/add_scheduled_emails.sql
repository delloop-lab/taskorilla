-- Deferred transactional emails (e.g. tasker welcome 1h after signup)
CREATE TABLE IF NOT EXISTS public.scheduled_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  send_after TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  send_attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  template_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_scheduled_emails_due
  ON public.scheduled_emails (send_after)
  WHERE sent_at IS NULL;

ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;

-- No policies: anon/authenticated cannot access; service role bypasses RLS for cron + API.

COMMENT ON TABLE public.scheduled_emails IS 'Rows processed by /api/cron/process-scheduled-emails for delayed sends';
