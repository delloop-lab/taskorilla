-- Allow helpers to update their own bid (amount/message) while it is still pending
-- and the task is still open. Task owners retain a separate UPDATE policy for
-- accept/reject flows.

CREATE POLICY "Bidders can update own pending bids on open tasks"
  ON bids FOR UPDATE
  USING (
    user_id = auth.uid()
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = bids.task_id
      AND tasks.status = 'open'
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = bids.task_id
      AND tasks.status = 'open'
    )
  );
