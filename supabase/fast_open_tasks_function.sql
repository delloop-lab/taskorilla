-- Create a fast function to fetch open tasks
-- This bypasses RLS for better performance since open tasks are publicly viewable anyway

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_open_tasks(integer);

-- Create the function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION get_open_tasks(task_limit integer DEFAULT 50)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  budget decimal,
  status text,
  created_by uuid,
  assigned_to uuid,
  category_id uuid,
  sub_category_id uuid,
  location text,
  due_date timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  image_url text,
  latitude double precision,
  longitude double precision,
  required_skills text[],
  required_professions text[],
  hidden_by_admin boolean,
  archived boolean,
  willing_to_help boolean
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    t.id,
    t.title,
    t.description,
    t.budget,
    t.status,
    t.created_by,
    t.assigned_to,
    t.category_id,
    t.sub_category_id,
    t.location,
    t.due_date,
    t.created_at,
    t.updated_at,
    t.image_url,
    t.latitude,
    t.longitude,
    t.required_skills,
    t.required_professions,
    t.hidden_by_admin,
    t.archived,
    t.willing_to_help
  FROM tasks t
  WHERE t.status = 'open'
    AND t.hidden_by_admin = false
    AND t.archived = false
    AND t.assigned_to IS NULL
  ORDER BY t.created_at DESC
  LIMIT task_limit;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION get_open_tasks(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_open_tasks(integer) TO anon;

-- Add comment
COMMENT ON FUNCTION get_open_tasks IS 'Fast function to fetch open tasks, bypassing RLS for performance';
