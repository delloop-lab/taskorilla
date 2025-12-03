-- Create task_progress_updates table for progress tracking
CREATE TABLE IF NOT EXISTS task_progress_updates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  message TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Add foreign key to profiles for PostgREST relationship resolution
-- This allows PostgREST to automatically join with profiles table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_task_progress_updates_user_profile'
  ) THEN
    ALTER TABLE task_progress_updates
    ADD CONSTRAINT fk_task_progress_updates_user_profile 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_progress_updates_task_id ON task_progress_updates(task_id);
CREATE INDEX IF NOT EXISTS idx_progress_updates_user_id ON task_progress_updates(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_updates_created_at ON task_progress_updates(created_at DESC);

-- Enable RLS
ALTER TABLE task_progress_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for progress updates
-- Users can view progress updates for tasks they created or are assigned to
CREATE POLICY "Users can view progress updates for their tasks"
  ON task_progress_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_progress_updates.task_id
      AND (tasks.created_by = auth.uid() OR tasks.assigned_to = auth.uid())
    )
  );

-- Users can create progress updates for tasks they are assigned to
CREATE POLICY "Assigned helpers can create progress updates"
  ON task_progress_updates FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_progress_updates.task_id
      AND tasks.assigned_to = auth.uid()
    )
  );

-- Add comment for documentation
COMMENT ON TABLE task_progress_updates IS 'Progress updates and photos for tasks in progress';

