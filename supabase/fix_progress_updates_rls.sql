-- Fix RLS policies for task_progress_updates table
-- The current policies are too restrictive - task owners should also be able to create updates

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Assigned helpers can create progress updates" ON task_progress_updates;
DROP POLICY IF EXISTS "Users can view progress updates for their tasks" ON task_progress_updates;

-- Create new policies that allow both task owner and assigned helper

-- SELECT: Both task owner and assigned helper can view progress updates
CREATE POLICY "Users can view progress updates for their tasks"
  ON task_progress_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_progress_updates.task_id
      AND (tasks.created_by = auth.uid() OR tasks.assigned_to = auth.uid())
    )
  );

-- INSERT: Both task owner and assigned helper can create progress updates
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

-- UPDATE: Users can only update their own progress updates
CREATE POLICY "Users can update their own progress updates"
  ON task_progress_updates FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete their own progress updates  
CREATE POLICY "Users can delete their own progress updates"
  ON task_progress_updates FOR DELETE
  USING (auth.uid() = user_id);

-- Also add admin access for superadmins
CREATE POLICY "Admins can view all progress updates"
  ON task_progress_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can manage all progress updates"
  ON task_progress_updates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON task_progress_updates TO authenticated;

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'task_progress_updates';

