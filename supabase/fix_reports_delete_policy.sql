-- Fix DELETE policy for admins to delete resolved or dismissed reports
-- This version ensures the policy works correctly

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admins can delete reports" ON reports;

-- Create DELETE policy for admins
-- Note: For DELETE operations, the USING clause checks if the row can be deleted
CREATE POLICY "Admins can delete reports"
  ON reports
  FOR DELETE
  TO authenticated
  USING (
    -- User must be admin or superadmin
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
    -- Report must be resolved or dismissed
    AND status IN ('resolved', 'dismissed')
  );

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'reports' AND policyname = 'Admins can delete reports';

