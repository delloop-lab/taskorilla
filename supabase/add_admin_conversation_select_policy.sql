-- Allow admin/superadmin to read any conversation and its messages for auditing

DROP POLICY IF EXISTS "Admins can view all conversations" ON conversations;
CREATE POLICY "Admins can view all conversations"
  ON conversations FOR SELECT
  USING (public.is_admin_or_superadmin());

DROP POLICY IF EXISTS "Admins can view all messages" ON messages;
CREATE POLICY "Admins can view all messages"
  ON messages FOR SELECT
  USING (public.is_admin_or_superadmin());
