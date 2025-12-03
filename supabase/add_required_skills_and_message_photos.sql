-- Add required_skills field to tasks table for skill-based filtering
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS required_skills TEXT[];

-- Add image_url field to messages table for photo attachments
ALTER TABLE messages 
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create index for skill-based task filtering
CREATE INDEX IF NOT EXISTS idx_tasks_required_skills ON tasks USING GIN(required_skills);

-- Create index for message images
CREATE INDEX IF NOT EXISTS idx_messages_image_url ON messages(image_url) WHERE image_url IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN tasks.required_skills IS 'Array of skills required for this task. Helpers can filter tasks by matching their skills.';
COMMENT ON COLUMN messages.image_url IS 'Optional image attachment URL for messages';




