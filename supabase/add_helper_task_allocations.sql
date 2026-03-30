-- Track helper allocations for tasks (manual/automatic matching notifications)
CREATE TABLE IF NOT EXISTS helper_task_allocations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  helper_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  allocated_via TEXT NOT NULL DEFAULT 'admin_manual',
  channels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  first_allocated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_notified_channels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, helper_id)
);

CREATE INDEX IF NOT EXISTS idx_helper_task_allocations_task_id
  ON helper_task_allocations(task_id);

CREATE INDEX IF NOT EXISTS idx_helper_task_allocations_helper_id
  ON helper_task_allocations(helper_id);

CREATE INDEX IF NOT EXISTS idx_helper_task_allocations_last_notified_at
  ON helper_task_allocations(last_notified_at DESC);

ALTER TABLE helper_task_allocations ENABLE ROW LEVEL SECURITY;

-- Reuse (or create) admin helper predicate
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

DROP POLICY IF EXISTS "Admins can view helper task allocations" ON helper_task_allocations;
CREATE POLICY "Admins can view helper task allocations"
  ON helper_task_allocations FOR SELECT
  USING (public.is_admin_or_superadmin());

DROP POLICY IF EXISTS "Admins can create helper task allocations" ON helper_task_allocations;
CREATE POLICY "Admins can create helper task allocations"
  ON helper_task_allocations FOR INSERT
  WITH CHECK (public.is_admin_or_superadmin());

DROP POLICY IF EXISTS "Admins can update helper task allocations" ON helper_task_allocations;
CREATE POLICY "Admins can update helper task allocations"
  ON helper_task_allocations FOR UPDATE
  USING (public.is_admin_or_superadmin())
  WITH CHECK (public.is_admin_or_superadmin());

-- Optional historical backfill from helper_task_match email logs
INSERT INTO helper_task_allocations (
  task_id,
  helper_id,
  allocated_via,
  channels,
  first_allocated_at,
  last_notified_at,
  last_notified_channels,
  metadata
)
SELECT
  el.related_task_id AS task_id,
  el.related_user_id AS helper_id,
  'historical_email_log_backfill' AS allocated_via,
  ARRAY['email']::TEXT[] AS channels,
  MIN(el.created_at) AS first_allocated_at,
  MAX(el.created_at) AS last_notified_at,
  ARRAY['email']::TEXT[] AS last_notified_channels,
  jsonb_build_object('source', 'email_logs', 'email_type', 'helper_task_match') AS metadata
FROM email_logs el
WHERE el.email_type = 'helper_task_match'
  AND el.related_task_id IS NOT NULL
  AND el.related_user_id IS NOT NULL
GROUP BY el.related_task_id, el.related_user_id
ON CONFLICT (task_id, helper_id) DO NOTHING;
