-- Add UPDATE policy for messages to allow receivers to mark messages as read
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can update messages they received" ON messages;

-- Create the policy
CREATE POLICY "Users can update messages they received"
  ON messages FOR UPDATE
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

