-- Add image_url field to tasks table
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS image_url TEXT;





