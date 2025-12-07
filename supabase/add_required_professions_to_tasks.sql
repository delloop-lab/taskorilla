-- Add required_professions field to tasks table
-- This allows taskers to specify which professional roles they need for their task

ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS required_professions TEXT[];

-- Create index for profession-based task filtering
CREATE INDEX IF NOT EXISTS idx_tasks_required_professions ON tasks USING GIN(required_professions);

-- Add comment for documentation
COMMENT ON COLUMN tasks.required_professions IS 'Array of professional roles required for this task. Helpers with matching professions will see this task prioritized.';







