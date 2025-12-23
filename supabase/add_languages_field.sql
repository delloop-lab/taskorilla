-- Add languages field to profiles table
-- Languages are the languages the user speaks (e.g., "English", "Portuguese")

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}'; -- Array of languages

-- Create index for language searches (optional, for filtering by language)
CREATE INDEX IF NOT EXISTS idx_profiles_languages ON profiles USING GIN(languages) WHERE languages IS NOT NULL AND array_length(languages, 1) > 0;

-- Add comment for documentation
COMMENT ON COLUMN profiles.languages IS 'Array of languages the user speaks (e.g., ["English", "Portuguese"])';














