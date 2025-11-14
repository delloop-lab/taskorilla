-- Add willing_to_help field to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS willing_to_help BOOLEAN DEFAULT FALSE NOT NULL;


