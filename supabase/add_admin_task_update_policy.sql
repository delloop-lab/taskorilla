-- Add RLS policy to allow admins/superadmins to update any task
-- This is needed for admin moderation features like hiding tasks

-- Use the existing is_admin() function to check if user is admin or superadmin
CREATE POLICY "Admins can update any task"
  ON tasks FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Note: This policy works alongside the existing "Users can update their own tasks" policy
-- Users can still update their own tasks, and admins can update any task




