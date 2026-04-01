-- Migration: Add 'locked' to the tasks status CHECK constraint
-- Used when a task owner "deletes" a task before any accepted bid exists.

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('open', 'pending_payment', 'in_progress', 'completed', 'cancelled', 'locked'));
