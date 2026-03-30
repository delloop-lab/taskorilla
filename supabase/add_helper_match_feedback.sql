-- Admin feedback for helper-task-type suitability.
CREATE TABLE IF NOT EXISTS helper_match_feedback (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  helper_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type_key TEXT NOT NULL,
  feedback TEXT NOT NULL DEFAULT 'exclude',
  reason TEXT NOT NULL DEFAULT 'not_suitable',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  CONSTRAINT helper_match_feedback_feedback_check CHECK (feedback IN ('exclude')),
  CONSTRAINT helper_match_feedback_unique_helper_type UNIQUE(helper_id, task_type_key)
);

CREATE INDEX IF NOT EXISTS idx_helper_match_feedback_task_id
  ON helper_match_feedback(task_id);
CREATE INDEX IF NOT EXISTS idx_helper_match_feedback_helper_id
  ON helper_match_feedback(helper_id);
CREATE INDEX IF NOT EXISTS idx_helper_match_feedback_task_type_key
  ON helper_match_feedback(task_type_key);
CREATE INDEX IF NOT EXISTS idx_helper_match_feedback_created_at
  ON helper_match_feedback(created_at DESC);

ALTER TABLE helper_match_feedback ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_helper_match_feedback_updated_at ON helper_match_feedback;
CREATE TRIGGER update_helper_match_feedback_updated_at
  BEFORE UPDATE ON helper_match_feedback
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

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

DROP POLICY IF EXISTS "Admins can view helper match feedback" ON helper_match_feedback;
CREATE POLICY "Admins can view helper match feedback"
  ON helper_match_feedback FOR SELECT
  USING (public.is_admin_or_superadmin());

DROP POLICY IF EXISTS "Admins can create helper match feedback" ON helper_match_feedback;
CREATE POLICY "Admins can create helper match feedback"
  ON helper_match_feedback FOR INSERT
  WITH CHECK (public.is_admin_or_superadmin());

DROP POLICY IF EXISTS "Admins can update helper match feedback" ON helper_match_feedback;
CREATE POLICY "Admins can update helper match feedback"
  ON helper_match_feedback FOR UPDATE
  USING (public.is_admin_or_superadmin())
  WITH CHECK (public.is_admin_or_superadmin());

DROP POLICY IF EXISTS "Admins can delete helper match feedback" ON helper_match_feedback;
CREATE POLICY "Admins can delete helper match feedback"
  ON helper_match_feedback FOR DELETE
  USING (public.is_admin_or_superadmin());

