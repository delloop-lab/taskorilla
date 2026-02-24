-- Add PayPal payout batch ID for webhook lookups
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS paypal_batch_id TEXT;
CREATE INDEX IF NOT EXISTS idx_payouts_paypal_batch_id ON payouts(paypal_batch_id) WHERE paypal_batch_id IS NOT NULL;
