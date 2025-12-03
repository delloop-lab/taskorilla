-- Add qualifications field to profiles table
-- Qualifications are certifications, licenses, or formal training that helpers have

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS qualifications TEXT[]; -- Array of qualifications

-- Create index for qualification searches
CREATE INDEX IF NOT EXISTS idx_profiles_qualifications ON profiles USING GIN(qualifications) WHERE qualifications IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.qualifications IS 'Array of qualifications, certifications, licenses, or formal training (e.g., "Carpentry Certification", "Plumbing License", "First Aid Certified")';




