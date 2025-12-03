-- Add professional offerings for helpers who provide professional services
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS professional_offerings TEXT[];

-- Index to help search/filter professional offerings
CREATE INDEX IF NOT EXISTS idx_profiles_professional_offerings 
  ON profiles USING GIN(professional_offerings) 
  WHERE professional_offerings IS NOT NULL;

-- Document the new field
COMMENT ON COLUMN profiles.professional_offerings IS 'Array of professional offerings (e.g., Therapy Sessions, Podcast Production) for helpers who provide professional services.';




