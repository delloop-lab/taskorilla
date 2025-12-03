-- Add image_url field to messages so helpers can attach photos
ALTER TABLE messages 
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create index for quicker filtering of messages with images
CREATE INDEX IF NOT EXISTS idx_messages_image_url 
  ON messages(image_url) 
  WHERE image_url IS NOT NULL;

-- Document the new field
COMMENT ON COLUMN messages.image_url IS 'Optional image attachment URL for messages';




