-- Create platform_settings table for storing configurable settings
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_by UUID REFERENCES profiles(id)
);

-- Insert default fee settings
INSERT INTO platform_settings (key, value, description) VALUES
  ('platform_fee_percent', '10', 'Percentage deducted from helper payout (e.g., 10 = 10%)'),
  ('tasker_service_fee', '2', 'Fixed fee in EUR added to task owner payment (e.g., 2 = €2)')
ON CONFLICT (key) DO NOTHING;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON platform_settings(key);

-- RLS policies - only superadmins can modify settings
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (needed for payment calculations)
CREATE POLICY "Anyone can read platform settings"
  ON platform_settings FOR SELECT
  USING (true);

-- Only superadmins can update settings
CREATE POLICY "Superadmins can update platform settings"
  ON platform_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

-- Only superadmins can insert settings
CREATE POLICY "Superadmins can insert platform settings"
  ON platform_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

-- Add comments
COMMENT ON TABLE platform_settings IS 'Stores configurable platform settings like fees';
COMMENT ON COLUMN platform_settings.key IS 'Unique setting identifier';
COMMENT ON COLUMN platform_settings.value IS 'Setting value (stored as text, parse as needed)';
COMMENT ON COLUMN platform_settings.description IS 'Human-readable description of the setting';




