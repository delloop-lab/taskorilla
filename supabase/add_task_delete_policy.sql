-- Add DELETE policy for tasks
-- This allows task creators to delete their own tasks

CREATE POLICY "Users can delete their own tasks"
  ON tasks FOR DELETE
  USING (created_by = auth.uid());





