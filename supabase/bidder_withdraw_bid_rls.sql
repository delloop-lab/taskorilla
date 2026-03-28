-- "Taskorilla Steady" version: helpers keep control of their bid until the
-- Vault actually locks (payment goes through → task becomes in_progress).
--
-- Case 1 (open task): helper can adjust (keep pending) or withdraw a pending bid.
-- Case 2 (open task): helper can re-activate a withdrawn bid back to pending.
-- Case 3 (pending_payment, before helper confirms): the accepted helper can
--         still withdraw if the price isn't right — their final say.
DROP POLICY IF EXISTS "Bidders can update own pending bids on open tasks" ON bids;

CREATE POLICY "Bidders can update own pending bids on open tasks"
  ON bids FOR UPDATE
  USING (
    user_id = auth.uid()
    AND (
      -- Open task: helper owns a pending or withdrawn bid
      (status IN ('pending', 'withdrawn') AND EXISTS (
        SELECT 1 FROM tasks
        WHERE tasks.id = bids.task_id
          AND tasks.status = 'open'
      ))
      OR
      -- Pending-payment task (pre-confirm): accepted helper can still act
      (status = 'accepted' AND EXISTS (
        SELECT 1 FROM tasks
        WHERE tasks.id = bids.task_id
          AND tasks.status = 'pending_payment'
          AND tasks.helper_confirmed_final_price_at IS NULL
      ))
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (
      -- Open task: may keep editing (pending) or withdraw
      (status IN ('pending', 'withdrawn') AND EXISTS (
        SELECT 1 FROM tasks
        WHERE tasks.id = bids.task_id
          AND tasks.status = 'open'
      ))
      OR
      -- Pending-payment (pre-confirm): can only withdraw
      (status = 'withdrawn' AND EXISTS (
        SELECT 1 FROM tasks
        WHERE tasks.id = bids.task_id
          AND tasks.status = 'pending_payment'
          AND tasks.helper_confirmed_final_price_at IS NULL
      ))
    )
  );
