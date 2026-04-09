-- Audit table for welcome email queue attempts.
-- This is additive-only observability and does not affect queue/send behavior.
CREATE TABLE IF NOT EXISTS public.welcome_email_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_email TEXT,
  template_type TEXT,
  source TEXT NOT NULL DEFAULT 'unknown',
  ok BOOLEAN NOT NULL,
  skipped_reason TEXT,
  error_reason TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_welcome_email_attempts_created_at
  ON public.welcome_email_attempts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_welcome_email_attempts_user_created_at
  ON public.welcome_email_attempts (related_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_welcome_email_attempts_failures_created_at
  ON public.welcome_email_attempts (created_at DESC)
  WHERE ok = FALSE;

ALTER TABLE public.welcome_email_attempts ENABLE ROW LEVEL SECURITY;

-- Reused admin/superadmin gate from email logs migration.
CREATE OR REPLACE FUNCTION public.is_admin_or_superadmin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN user_role IN ('admin', 'superadmin');
END;
$$;

DROP POLICY IF EXISTS "Admins can view welcome email attempts" ON public.welcome_email_attempts;
CREATE POLICY "Admins can view welcome email attempts"
  ON public.welcome_email_attempts FOR SELECT
  USING (public.is_admin_or_superadmin());

CREATE OR REPLACE VIEW public.confirmed_users_missing_welcome_queue AS
SELECT
  u.id AS user_id,
  u.email,
  u.created_at AS user_created_at,
  u.email_confirmed_at,
  MAX(se.created_at) AS latest_scheduled_email_at,
  MAX(wa.created_at) FILTER (WHERE wa.ok = TRUE) AS latest_successful_attempt_at,
  COUNT(se.id) FILTER (
    WHERE se.template_type IN ('tasker_welcome', 'helper_welcome')
  ) AS welcome_rows_count
FROM auth.users u
LEFT JOIN public.scheduled_emails se
  ON se.related_user_id = u.id
LEFT JOIN public.welcome_email_attempts wa
  ON wa.related_user_id = u.id
WHERE u.email_confirmed_at IS NOT NULL
  AND u.email_confirmed_at <= NOW() - INTERVAL '10 minutes'
GROUP BY u.id, u.email, u.created_at, u.email_confirmed_at
HAVING COUNT(se.id) FILTER (
  WHERE se.template_type IN ('tasker_welcome', 'helper_welcome')
) = 0
AND COALESCE(MAX(wa.created_at) FILTER (WHERE wa.ok = TRUE), to_timestamp(0)) = to_timestamp(0);
