-- Fix the INSERT policy that has null qual

-- Drop the broken policy
DROP POLICY IF EXISTS "Task participants can create progress updates" ON task_progress_updates;

-- Recreate with proper WITH CHECK clause
CREATE POLICY "Task participants can create progress updates"
  ON task_progress_updates FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_progress_updates.task_id
      AND (tasks.created_by = auth.uid() OR tasks.assigned_to = auth.uid())
    )
  );

-- Verify the fix
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'task_progress_updates' AND cmd = 'INSERT';




