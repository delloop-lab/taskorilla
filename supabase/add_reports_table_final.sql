-- Create reports table for task and user reporting
-- This version drops and recreates the table (use if you don't have existing data to preserve)

-- Drop table if exists (removes all existing data)
DROP TABLE IF EXISTS reports CASCADE;

-- Create the reports table
CREATE TABLE reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reported_by UUID REFERENCES auth.users(id) NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('task', 'user')),
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  CONSTRAINT check_report_target CHECK (
    (task_id IS NOT NULL AND reported_user_id IS NULL) OR
    (task_id IS NULL AND reported_user_id IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX idx_reports_reported_by ON reports(reported_by);
CREATE INDEX idx_reports_task_id ON reports(task_id);
CREATE INDEX idx_reports_reported_user_id ON reports(reported_user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can create reports" ON reports;
DROP POLICY IF EXISTS "Users can view their own reports" ON reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON reports;
DROP POLICY IF EXISTS "Admins can update reports" ON reports;

-- Create policies
CREATE POLICY "Users can create reports"
  ON reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Users can view their own reports"
  ON reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reported_by);

CREATE POLICY "Admins can view all reports"
  ON reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can update reports"
  ON reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

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

-- Add comments
COMMENT ON TABLE reports IS 'Stores reports submitted by users for tasks or other users';
COMMENT ON COLUMN reports.report_type IS 'Type of report: task or user';
COMMENT ON COLUMN reports.reason IS 'Reason for the report (e.g., spam, inappropriate content, harassment)';
COMMENT ON COLUMN reports.status IS 'Status of the report: pending, reviewed, resolved, or dismissed';

