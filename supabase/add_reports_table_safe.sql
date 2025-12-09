-- Safe migration: Add columns if they don't exist (preserves existing data)
-- Use this if the reports table already exists but is missing columns

-- Check if table exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reports') THEN
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
  ELSE
    -- Add missing columns if they don't exist
    ALTER TABLE reports ADD COLUMN IF NOT EXISTS reported_by UUID REFERENCES auth.users(id);
    ALTER TABLE reports ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;
    ALTER TABLE reports ADD COLUMN IF NOT EXISTS reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_type TEXT;
    ALTER TABLE reports ADD COLUMN IF NOT EXISTS reason TEXT;
    ALTER TABLE reports ADD COLUMN IF NOT EXISTS details TEXT;
    ALTER TABLE reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
    ALTER TABLE reports ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);
    ALTER TABLE reports ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE reports ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW());
    ALTER TABLE reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW());
    
    -- Add constraints if they don't exist (using separate DO block for constraint checks)
    -- Note: We'll add these after the main DO block
  END IF;
END $$;

-- Add constraints if they don't exist (outside the main DO block)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reports') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reports_report_type_check') THEN
      ALTER TABLE reports ADD CONSTRAINT reports_report_type_check CHECK (report_type IN ('task', 'user'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reports_status_check') THEN
      ALTER TABLE reports ADD CONSTRAINT reports_status_check CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_report_target') THEN
      ALTER TABLE reports ADD CONSTRAINT check_report_target CHECK (
        (task_id IS NOT NULL AND reported_user_id IS NULL) OR
        (task_id IS NULL AND reported_user_id IS NOT NULL)
      );
    END IF;
  END IF;
END $$;

-- Make required columns NOT NULL if they aren't already (outside DO block)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reports') THEN
    ALTER TABLE reports ALTER COLUMN reported_by SET NOT NULL;
    ALTER TABLE reports ALTER COLUMN report_type SET NOT NULL;
    ALTER TABLE reports ALTER COLUMN reason SET NOT NULL;
    ALTER TABLE reports ALTER COLUMN status SET NOT NULL;
    ALTER TABLE reports ALTER COLUMN created_at SET NOT NULL;
    ALTER TABLE reports ALTER COLUMN updated_at SET NOT NULL;
  END IF;
END $$;

-- Create indexes (IF NOT EXISTS is implicit)
CREATE INDEX IF NOT EXISTS idx_reports_reported_by ON reports(reported_by);
CREATE INDEX IF NOT EXISTS idx_reports_task_id ON reports(task_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user_id ON reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

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

-- Add comments
COMMENT ON TABLE reports IS 'Stores reports submitted by users for tasks or other users';
COMMENT ON COLUMN reports.report_type IS 'Type of report: task or user';
COMMENT ON COLUMN reports.reason IS 'Reason for the report (e.g., spam, inappropriate content, harassment)';
COMMENT ON COLUMN reports.status IS 'Status of the report: pending, reviewed, resolved, or dismissed';

