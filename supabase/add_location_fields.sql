-- Add location fields to tasks table
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS postcode TEXT,
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add location fields to profiles table (for user location)
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS postcode TEXT,
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Create indexes for faster location-based queries
CREATE INDEX IF NOT EXISTS idx_tasks_postcode ON tasks(postcode);
CREATE INDEX IF NOT EXISTS idx_tasks_location ON tasks(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_profiles_postcode ON profiles(postcode);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(latitude, longitude);


