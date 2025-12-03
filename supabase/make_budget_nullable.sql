-- Make budget column nullable in tasks table
-- This allows tasks to be created without a budget (will display "Quote")

ALTER TABLE tasks 
  ALTER COLUMN budget DROP NOT NULL;

COMMENT ON COLUMN tasks.budget IS 'Task budget in EUR. If NULL, displays "Quote" to visitors.';


