-- Create email_templates table to store email templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  template_type TEXT NOT NULL UNIQUE CHECK (template_type IN ('helper_welcome', 'tasker_welcome')),
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(template_type);

-- Enable RLS on email_templates
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'email_templates') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON email_templates';
    END LOOP;
END $$;

-- Only admins and superadmins can view email templates
CREATE POLICY "Admins can view email templates"
  ON email_templates FOR SELECT
  USING (public.is_admin_or_superadmin());

-- Only admins and superadmins can insert email templates
CREATE POLICY "Admins can insert email templates"
  ON email_templates FOR INSERT
  WITH CHECK (public.is_admin_or_superadmin());

-- Only admins and superadmins can update email templates
CREATE POLICY "Admins can update email templates"
  ON email_templates FOR UPDATE
  USING (public.is_admin_or_superadmin())
  WITH CHECK (public.is_admin_or_superadmin());

-- Only superadmins can delete email templates
CREATE POLICY "Superadmins can delete email templates"
  ON email_templates FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'superadmin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_email_templates_updated_at();
