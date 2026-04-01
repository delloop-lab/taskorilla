-- Guide helpfulness feedback from Help Center pages
CREATE TABLE IF NOT EXISTS guide_feedback (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  guide_id TEXT NOT NULL,
  guide_title TEXT NOT NULL,
  guide_slug TEXT NOT NULL,
  feedback TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  session_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  CONSTRAINT guide_feedback_feedback_check CHECK (feedback IN ('yes', 'no'))
);

CREATE INDEX IF NOT EXISTS idx_guide_feedback_created_at
  ON guide_feedback(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_guide_feedback_guide_slug_created_at
  ON guide_feedback(guide_slug, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_guide_feedback_feedback_created_at
  ON guide_feedback(feedback, created_at DESC);

ALTER TABLE guide_feedback ENABLE ROW LEVEL SECURITY;

-- Reuse existing helper if present; create if missing.
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

DROP POLICY IF EXISTS "Anyone can insert guide feedback" ON guide_feedback;
CREATE POLICY "Anyone can insert guide feedback"
  ON guide_feedback FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view guide feedback" ON guide_feedback;
CREATE POLICY "Admins can view guide feedback"
  ON guide_feedback FOR SELECT
  USING (public.is_admin_or_superadmin());

DROP POLICY IF EXISTS "Admins can update guide feedback" ON guide_feedback;
CREATE POLICY "Admins can update guide feedback"
  ON guide_feedback FOR UPDATE
  USING (public.is_admin_or_superadmin())
  WITH CHECK (public.is_admin_or_superadmin());

DROP POLICY IF EXISTS "Admins can delete guide feedback" ON guide_feedback;
CREATE POLICY "Admins can delete guide feedback"
  ON guide_feedback FOR DELETE
  USING (public.is_admin_or_superadmin());

