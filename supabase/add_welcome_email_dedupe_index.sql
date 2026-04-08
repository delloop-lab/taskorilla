-- Prevent duplicate unsent welcome emails for the same user/template pair.
-- This makes queueing idempotent under retries and concurrent callback requests.
CREATE UNIQUE INDEX IF NOT EXISTS uq_scheduled_emails_unsent_welcome_user_template
  ON public.scheduled_emails (related_user_id, template_type)
  WHERE sent_at IS NULL
    AND related_user_id IS NOT NULL
    AND template_type IN ('tasker_welcome', 'helper_welcome');
