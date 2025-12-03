-- Add Airwallex payment tracking fields to tasks table
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'airwallex',
  ADD COLUMN IF NOT EXISTS payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS payout_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending', 'processing', 'completed', 'failed'));

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_tasks_payment_intent_id ON tasks(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_payout_id ON tasks(payout_id);
CREATE INDEX IF NOT EXISTS idx_tasks_payment_status ON tasks(payment_status);
CREATE INDEX IF NOT EXISTS idx_tasks_payout_status ON tasks(payout_status);

-- Create payouts table for tracking helper payouts
CREATE TABLE IF NOT EXISTS payouts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  helper_id UUID REFERENCES auth.users(id) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  airwallex_payout_id TEXT UNIQUE,
  iban TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB
);

-- Create indexes for payouts table
CREATE INDEX IF NOT EXISTS idx_payouts_task_id ON payouts(task_id);
CREATE INDEX IF NOT EXISTS idx_payouts_helper_id ON payouts(helper_id);
CREATE INDEX IF NOT EXISTS idx_payouts_airwallex_payout_id ON payouts(airwallex_payout_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON payouts(created_at);

-- Add IBAN field to profiles table for payouts
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS iban TEXT;

-- Create index for IBAN lookups
CREATE INDEX IF NOT EXISTS idx_profiles_iban ON profiles(iban) WHERE iban IS NOT NULL;

-- Add comment to explain the fields
COMMENT ON COLUMN tasks.payment_provider IS 'Payment provider used (airwallex, etc.)';
COMMENT ON COLUMN tasks.payment_intent_id IS 'Airwallex payment intent ID';
COMMENT ON COLUMN tasks.payout_id IS 'Airwallex payout ID';
COMMENT ON COLUMN tasks.payment_status IS 'Status of payment from customer (pending, paid, failed, refunded)';
COMMENT ON COLUMN tasks.payout_status IS 'Status of payout to helper (pending, processing, completed, failed)';
COMMENT ON COLUMN profiles.iban IS 'IBAN for receiving payouts';

