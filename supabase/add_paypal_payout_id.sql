-- Add paypal_payout_id to payouts (canonical column for PayPal Payout Item/Batch ID)
-- Keeps paypal_batch_id for backward compatibility; new code uses paypal_payout_id
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS paypal_payout_id TEXT;
CREATE INDEX IF NOT EXISTS idx_payouts_paypal_payout_id ON payouts(paypal_payout_id) WHERE paypal_payout_id IS NOT NULL;
COMMENT ON COLUMN payouts.paypal_payout_id IS 'PayPal payout batch or item ID for webhook lookups';
