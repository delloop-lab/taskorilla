-- Per-user page visit log (authenticated, non-admin traffic only; written from client).
-- Admins/superadmins are excluded in app code (lib/traffic.ts), same as aggregate traffic.
--
-- Production notes:
-- - Page keys are bounded (CHECK) so a client cannot spam oversized strings.
-- - INSERT RLS uses WITH CHECK (auth.uid() = user_id) so users cannot attribute visits to others.
-- - Consider retention (periodic DELETE) and privacy policy alignment for identifiable browsing data.

CREATE TABLE IF NOT EXISTS public.user_page_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visited_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  page TEXT NOT NULL CONSTRAINT user_page_visits_page_len CHECK (char_length(page) <= 200)
);

-- If the table already existed from an older migration without the length check, add it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_page_visits'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'user_page_visits'
      AND c.conname = 'user_page_visits_page_len'
  ) THEN
    ALTER TABLE public.user_page_visits
      ADD CONSTRAINT user_page_visits_page_len CHECK (char_length(page) <= 200);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_page_visits_user_visited
  ON public.user_page_visits (user_id, visited_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_page_visits_visited_at
  ON public.user_page_visits (visited_at DESC);

ALTER TABLE public.user_page_visits ENABLE ROW LEVEL SECURITY;

-- Ensure admin gate exists (idempotent if already applied from welcome_email_attempts migration).
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

DROP POLICY IF EXISTS "Users insert own page visits" ON public.user_page_visits;
CREATE POLICY "Users insert own page visits"
  ON public.user_page_visits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins select user page visits" ON public.user_page_visits;
CREATE POLICY "Admins select user page visits"
  ON public.user_page_visits FOR SELECT
  TO authenticated
  USING (public.is_admin_or_superadmin());

COMMENT ON TABLE public.user_page_visits IS 'Optional per-user page keys for admin diagnostics; not used for aggregate Traffic tab totals.';
