-- Add dual role support to profiles table
-- This allows users to be both taskers (post tasks) and helpers (bid on tasks)

-- Add boolean fields for roles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS is_tasker BOOLEAN DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS is_helper BOOLEAN DEFAULT false NOT NULL;

-- Set default values for existing users
-- All existing users default to is_tasker = true, is_helper = false
UPDATE profiles
SET 
  is_tasker = COALESCE(is_tasker, true),
  is_helper = COALESCE(is_helper, false)
WHERE is_tasker IS NULL OR is_helper IS NULL;

-- Create indexes for faster role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_tasker ON profiles(is_tasker) WHERE is_tasker = true;
CREATE INDEX IF NOT EXISTS idx_profiles_is_helper ON profiles(is_helper) WHERE is_helper = true;

-- Update the handle_new_user function to set default roles for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_tasker, is_helper)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'full_name',
    true,  -- Default: new users are taskers
    false  -- Default: new users are not helpers (can enable in settings)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON COLUMN profiles.is_tasker IS 'User can post tasks and hire helpers';
COMMENT ON COLUMN profiles.is_helper IS 'User can browse tasks and submit bids';




