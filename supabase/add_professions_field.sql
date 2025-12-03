-- Add professions field to profiles table
-- Professions are specific professional roles that helpers can have

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS professions TEXT[]; -- Array of professions

-- Create index for profession searches
CREATE INDEX IF NOT EXISTS idx_profiles_professions ON profiles USING GIN(professions) WHERE professions IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.professions IS 'Array of professional roles (e.g., "Hairdresser/Barber", "Graphic Designer/Illustrator", "Accountant/Bookkeeper")';




