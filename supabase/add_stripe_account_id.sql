-- Add Stripe Connect account ID field to profiles table for helper payouts
-- This stores the Stripe Connected Account ID for helpers who receive payouts via Stripe

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

-- Create index for Stripe account ID lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account_id 
  ON profiles(stripe_account_id) 
  WHERE stripe_account_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.stripe_account_id IS 'Stripe Connected Account ID for receiving payouts via Stripe Connect';
