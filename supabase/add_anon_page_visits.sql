-- Anonymous page-visit diagnostics for Admin > Traffic.
-- This table is optional and used only for detail drilldown.

CREATE TABLE IF NOT EXISTS public.anon_page_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visited_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  visitor_id TEXT NOT NULL CONSTRAINT anon_page_visits_visitor_len CHECK (char_length(visitor_id) <= 120),
  page TEXT NOT NULL CONSTRAINT anon_page_visits_page_len CHECK (char_length(page) <= 200)
);

CREATE INDEX IF NOT EXISTS idx_anon_page_visits_visitor_visited
  ON public.anon_page_visits (visitor_id, visited_at DESC);

CREATE INDEX IF NOT EXISTS idx_anon_page_visits_visited_at
  ON public.anon_page_visits (visited_at DESC);

ALTER TABLE public.anon_page_visits ENABLE ROW LEVEL SECURITY;

-- Ensure admin gate helper exists (idempotent).
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

DROP POLICY IF EXISTS "Anyone can insert anon page visits" ON public.anon_page_visits;
CREATE POLICY "Anyone can insert anon page visits"
  ON public.anon_page_visits FOR INSERT
  TO anon, authenticated
  WITH CHECK (char_length(visitor_id) <= 120 AND char_length(page) <= 200);

DROP POLICY IF EXISTS "Admins select anon page visits" ON public.anon_page_visits;
CREATE POLICY "Admins select anon page visits"
  ON public.anon_page_visits FOR SELECT
  TO authenticated
  USING (public.is_admin_or_superadmin());

COMMENT ON TABLE public.anon_page_visits IS 'Anonymous page-visit events keyed by local visitor id for traffic diagnostics.';
