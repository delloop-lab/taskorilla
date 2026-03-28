-- Allow helpers to withdraw (rescind) their own pending bid while the task is open.
ALTER TABLE bids DROP CONSTRAINT IF EXISTS bids_status_check;
ALTER TABLE bids ADD CONSTRAINT bids_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn'));

COMMENT ON COLUMN bids.status IS
  'pending | accepted | rejected | withdrawn (helper rescinded while task was open)';
