-- Allow admins/superadmins to view ALL tasks regardless of status
-- Without this, the admin panel can only see open tasks and tasks where
-- the admin is the creator or assigned helper.

CREATE POLICY "Admins can view all tasks"
  ON tasks FOR SELECT
  USING (public.is_admin());
