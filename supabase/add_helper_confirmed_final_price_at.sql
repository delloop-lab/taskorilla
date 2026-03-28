-- Double-handshake: tasker can pay only after assigned helper confirms final agreed price.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS helper_confirmed_final_price_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN tasks.helper_confirmed_final_price_at IS
  'Set when the assigned helper confirms the final price; checkout allowed only after this is set (pending_payment).';

-- Existing unpaid pending_payment tasks: avoid blocking in-flight deals
UPDATE tasks
SET helper_confirmed_final_price_at = COALESCE(updated_at, NOW())
WHERE status = 'pending_payment'
  AND (payment_status IS NULL OR payment_status IS DISTINCT FROM 'paid')
  AND helper_confirmed_final_price_at IS NULL;
