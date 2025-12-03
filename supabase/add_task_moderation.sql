-- Add moderation field to tasks table for admin hiding
-- This allows admins to hide inappropriate tasks without deleting them
-- Hidden tasks remain in the database but are not visible to regular users

ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS hidden_by_admin BOOLEAN DEFAULT FALSE;

-- Add reason field for why task was hidden (optional)
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS hidden_reason TEXT;

-- Add timestamp for when task was hidden
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP WITH TIME ZONE;

-- Add admin user ID who hid the task
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS hidden_by UUID REFERENCES auth.users(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_hidden_by_admin ON tasks(hidden_by_admin);

-- Add comment for documentation
COMMENT ON COLUMN tasks.hidden_by_admin IS 'Set to true when an admin hides this task. Hidden tasks are not visible to regular users but remain in the database.';
COMMENT ON COLUMN tasks.hidden_reason IS 'Optional reason why the task was hidden by admin.';
COMMENT ON COLUMN tasks.hidden_at IS 'Timestamp when the task was hidden by admin.';
COMMENT ON COLUMN tasks.hidden_by IS 'User ID of the admin who hid this task.';




