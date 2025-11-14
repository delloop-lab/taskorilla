-- Add country field to profiles table (required for accurate postcode geocoding)
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS country TEXT;

-- Add country field to tasks table as well for consistency
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS country TEXT;


