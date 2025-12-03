-- Add archived field to tasks table
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_archived ON tasks(archived);





