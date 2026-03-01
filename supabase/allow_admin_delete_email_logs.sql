-- Allow admins (not just superadmins) to delete email logs
-- Run this if admins were previously able to delete but can no longer
-- Safe to run multiple times (idempotent)

DROP POLICY IF EXISTS "Superadmins can delete email logs" ON email_logs;
DROP POLICY IF EXISTS "Admins can delete email logs" ON email_logs;

CREATE POLICY "Admins can delete email logs"
  ON email_logs FOR DELETE
  USING (public.is_admin_or_superadmin());
