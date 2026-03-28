ALTER TABLE profiles ADD COLUMN IF NOT EXISTS conduct_guide_viewed_at TIMESTAMPTZ NULL;
COMMENT ON COLUMN profiles.conduct_guide_viewed_at IS
  'Set when user views the Professional Conduct Guide page; used to track repeat offenders on pause.';
