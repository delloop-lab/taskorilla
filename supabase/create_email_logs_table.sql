-- Create email_logs table to track all sent emails
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  email_type TEXT NOT NULL, -- 'new_bid', 'bid_accepted', 'bid_rejected', 'new_message', 'task_completed', 'task_cancelled', 'admin_email', 'profile_completion'
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  sent_by UUID REFERENCES auth.users(id), -- Admin who sent it (for admin emails)
  related_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL, -- For task-related emails
  related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- For user-related emails
  metadata JSONB, -- Store additional context like message preview, task title, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_email ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_by ON email_logs(sent_by);
CREATE INDEX IF NOT EXISTS idx_email_logs_related_task_id ON email_logs(related_task_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_related_user_id ON email_logs(related_user_id);

-- Enable RLS on email_logs
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'email_logs') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON email_logs';
    END LOOP;
END $$;

-- Only admins and superadmins can view email logs
-- Use a function to avoid RLS recursion issues
CREATE OR REPLACE FUNCTION public.is_admin_or_superadmin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles 
  WHERE id = auth.uid();
  
  RETURN user_role IN ('admin', 'superadmin');
END;
$$;

CREATE POLICY "Admins can view all email logs"
  ON email_logs FOR SELECT
  USING (public.is_admin_or_superadmin());

-- Create a SECURITY DEFINER function to insert email logs (bypasses RLS)
CREATE OR REPLACE FUNCTION public.log_email(
  p_recipient_email TEXT,
  p_recipient_name TEXT,
  p_subject TEXT,
  p_email_type TEXT,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL,
  p_sent_by UUID DEFAULT NULL,
  p_related_task_id UUID DEFAULT NULL,
  p_related_user_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO email_logs (
    recipient_email,
    recipient_name,
    subject,
    email_type,
    status,
    error_message,
    sent_by,
    related_task_id,
    related_user_id,
    metadata
  ) VALUES (
    p_recipient_email,
    p_recipient_name,
    p_subject,
    p_email_type,
    p_status,
    p_error_message,
    p_sent_by,
    p_related_task_id,
    p_related_user_id,
    p_metadata
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.log_email TO authenticated;

-- Only superadmins can delete email logs
CREATE POLICY "Superadmins can delete email logs"
  ON email_logs FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'superadmin'
    )
  );

