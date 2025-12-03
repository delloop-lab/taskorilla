-- Fix RLS policies to allow anonymous users to view helper profiles
-- This ensures helper profiles are publicly accessible

-- Ensure profiles SELECT policy allows anonymous access
-- Drop existing policy if it exists (check for variations)
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Public can view helper profiles" ON profiles;
DROP POLICY IF EXISTS "Anonymous can view profiles" ON profiles;

-- Create policy that allows anyone (including anonymous) to view profiles
-- This is essential for public helper profiles
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);

-- Ensure reviews are publicly viewable (for helper profiles)
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view reviews" ON reviews;
DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
DROP POLICY IF EXISTS "Public can view reviews" ON reviews;

-- Allow anyone to view reviews (needed for helper profile pages)
CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  USING (true);

-- Ensure tasks are viewable for completed tasks (for helper portfolios)
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can view completed tasks" ON tasks;

-- Allow viewing completed tasks (needed to show helper's completed work)
CREATE POLICY "Anyone can view completed tasks"
  ON tasks FOR SELECT
  USING (status = 'completed');

-- Ensure task_completion_photos are publicly viewable
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can view completion photos" ON task_completion_photos;
DROP POLICY IF EXISTS "Public can view completion photos" ON task_completion_photos;

-- Allow viewing completion photos (needed for helper portfolios)
CREATE POLICY "Anyone can view completion photos"
  ON task_completion_photos FOR SELECT
  USING (true);

-- Note: The existing "Anyone can view open tasks" policy should already allow viewing open tasks
-- But we're adding this for completed tasks specifically for helper portfolios

-- Verify policies are created
-- You can check in Supabase Dashboard → Authentication → Policies

