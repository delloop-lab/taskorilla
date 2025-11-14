-- Create task_images table for multiple images per task
CREATE TABLE IF NOT EXISTS task_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create task_completion_photos table for completion proof
CREATE TABLE IF NOT EXISTS task_completion_photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_task_images_task_id ON task_images(task_id);
CREATE INDEX IF NOT EXISTS idx_task_completion_photos_task_id ON task_completion_photos(task_id);
CREATE INDEX IF NOT EXISTS idx_task_completion_photos_uploaded_by ON task_completion_photos(uploaded_by);

-- RLS Policies for task_images
ALTER TABLE task_images ENABLE ROW LEVEL SECURITY;

-- Users can view all task images
CREATE POLICY "Users can view all task images"
  ON task_images FOR SELECT
  USING (true);

-- Users can insert images for tasks they created
CREATE POLICY "Users can insert images for their tasks"
  ON task_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_images.task_id
      AND tasks.created_by = auth.uid()
    )
  );

-- Users can delete images for tasks they created
CREATE POLICY "Users can delete images for their tasks"
  ON task_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_images.task_id
      AND tasks.created_by = auth.uid()
    )
  );

-- RLS Policies for task_completion_photos
ALTER TABLE task_completion_photos ENABLE ROW LEVEL SECURITY;

-- Users can view completion photos for tasks they're involved in (creator or assigned tasker)
CREATE POLICY "Users can view completion photos for their tasks"
  ON task_completion_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_completion_photos.task_id
      AND (tasks.created_by = auth.uid() OR tasks.assigned_to = auth.uid())
    )
  );

-- Assigned taskers can upload completion photos
CREATE POLICY "Assigned taskers can upload completion photos"
  ON task_completion_photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_completion_photos.task_id
      AND tasks.assigned_to = auth.uid()
      AND tasks.status = 'in_progress'
    )
    AND uploaded_by = auth.uid()
  );

-- Users can delete their own completion photos
CREATE POLICY "Users can delete their own completion photos"
  ON task_completion_photos FOR DELETE
  USING (uploaded_by = auth.uid());


