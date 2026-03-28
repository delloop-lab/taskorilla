ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pause_warning_sent_at TIMESTAMPTZ NULL;
COMMENT ON COLUMN profiles.pause_warning_sent_at IS
  'Set when the pause notification email is sent; used to detect repeat offenders even if they never visit /conduct.';
