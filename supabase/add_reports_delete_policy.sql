-- Add DELETE policy for admins to delete resolved or dismissed reports

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admins can delete reports" ON reports;

-- Create DELETE policy for admins
CREATE POLICY "Admins can delete reports"
  ON reports
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
    AND status IN ('resolved', 'dismissed')
  );

