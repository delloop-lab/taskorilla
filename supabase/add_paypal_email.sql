-- Add PayPal email for helpers (PayPal Payouts recipient)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paypal_email TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_paypal_email ON profiles(paypal_email) WHERE paypal_email IS NOT NULL;
