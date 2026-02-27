-- Fix helper vs tasker ratings for all users
-- This defines a consistent view and RPC function that:
-- - Counts ratings as HELPER when the user was assigned_to the task
-- - Counts ratings as TASKER when the user created the task

-- Optional: drop existing view/function if they exist
DROP VIEW IF EXISTS public.user_ratings_summary;
DROP FUNCTION IF EXISTS public.get_user_ratings_summary();

-- View used by .from('user_ratings_summary')
CREATE VIEW public.user_ratings_summary AS
SELECT
  p.id AS id,
  COALESCE(p.full_name, p.email) AS name,
  AVG(CASE WHEN t.created_by = r.reviewee_id THEN r.rating END)::NUMERIC(3,2) AS tasker_avg_rating,
  COUNT(CASE WHEN t.created_by = r.reviewee_id THEN 1 END)::INT       AS tasker_review_count,
  AVG(CASE WHEN t.assigned_to = r.reviewee_id THEN r.rating END)::NUMERIC(3,2) AS helper_avg_rating,
  COUNT(CASE WHEN t.assigned_to = r.reviewee_id THEN 1 END)::INT      AS helper_review_count
FROM public.profiles p
LEFT JOIN public.reviews r
  ON r.reviewee_id = p.id
LEFT JOIN public.tasks t
  ON t.id = r.task_id
GROUP BY
  p.id,
  COALESCE(p.full_name, p.email);

-- RPC used by supabase.rpc('get_user_ratings_summary')
-- SECURITY DEFINER so it can see all tasks regardless of RLS,
-- while callers are still restricted by RLS for direct table access.
CREATE OR REPLACE FUNCTION public.get_user_ratings_summary()
RETURNS TABLE (
  reviewee_id UUID,
  tasker_avg_rating NUMERIC(3,2),
  tasker_review_count INTEGER,
  helper_avg_rating NUMERIC(3,2),
  helper_review_count INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS reviewee_id,
    AVG(CASE WHEN t.created_by = r.reviewee_id THEN r.rating END)::NUMERIC(3,2) AS tasker_avg_rating,
    COUNT(CASE WHEN t.created_by = r.reviewee_id THEN 1 END)::INT       AS tasker_review_count,
    AVG(CASE WHEN t.assigned_to = r.reviewee_id THEN r.rating END)::NUMERIC(3,2) AS helper_avg_rating,
    COUNT(CASE WHEN t.assigned_to = r.reviewee_id THEN 1 END)::INT      AS helper_review_count
  FROM public.profiles p
  LEFT JOIN public.reviews r
    ON r.reviewee_id = p.id
  LEFT JOIN public.tasks t
    ON t.id = r.task_id
  GROUP BY
    p.id;
$$;

