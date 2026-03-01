-- Migration: Add 'pending_payment' to the tasks status CHECK constraint
-- This new status gates task assignment behind payment confirmation.
-- Flow: open -> pending_payment (bid accepted, awaiting payment) -> in_progress (payment confirmed)

-- Drop the existing constraint and recreate with the new status value
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('open', 'pending_payment', 'in_progress', 'completed', 'cancelled'));
