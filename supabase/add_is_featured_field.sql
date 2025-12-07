-- Add is_featured field to profiles table for manual featured helper control
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- Index to help filter featured helpers
CREATE INDEX IF NOT EXISTS idx_profiles_is_featured 
  ON profiles(is_featured) 
  WHERE is_featured = TRUE;

-- Document the new field
COMMENT ON COLUMN profiles.is_featured IS 'Set to true to manually feature a helper. Featured helpers are prioritized in the Featured Helpers section.';





