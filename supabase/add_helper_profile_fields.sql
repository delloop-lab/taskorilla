-- Add helper-specific profile fields
-- These fields enhance helper profiles for showcasing skills and experience

-- Add helper profile fields
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS skills TEXT[], -- Array of skills
  ADD COLUMN IF NOT EXISTS services_offered TEXT[], -- Array of services
  ADD COLUMN IF NOT EXISTS badges TEXT[], -- Array of badge names
  ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS profile_slug TEXT UNIQUE; -- For shareable URLs

-- Create index for profile slug lookups
CREATE INDEX IF NOT EXISTS idx_profiles_slug ON profiles(profile_slug) WHERE profile_slug IS NOT NULL;

-- Create index for helper searches
CREATE INDEX IF NOT EXISTS idx_profiles_is_helper ON profiles(is_helper) WHERE is_helper = true;

-- Function to generate a unique slug from full name
CREATE OR REPLACE FUNCTION generate_profile_slug(full_name TEXT, user_id UUID)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base slug from name
  base_slug := lower(regexp_replace(full_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  
  -- If empty, use user ID prefix
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'helper-' || substring(user_id::text, 1, 8);
  END IF;
  
  final_slug := base_slug;
  
  -- Check if slug exists and append counter if needed
  WHILE EXISTS (SELECT 1 FROM profiles WHERE profile_slug = final_slug AND id != user_id) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Update existing helpers to have slugs (optional, can be done manually)
-- UPDATE profiles 
-- SET profile_slug = generate_profile_slug(full_name, id)
-- WHERE is_helper = true AND profile_slug IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN profiles.bio IS 'Helper bio/description';
COMMENT ON COLUMN profiles.skills IS 'Array of skills the helper offers';
COMMENT ON COLUMN profiles.services_offered IS 'Array of services the helper provides';
COMMENT ON COLUMN profiles.badges IS 'Array of badge names (e.g., "Verified", "Top Rated", "Fast Responder")';
COMMENT ON COLUMN profiles.hourly_rate IS 'Helper hourly rate (optional)';
COMMENT ON COLUMN profiles.profile_slug IS 'Unique slug for shareable profile URL';




