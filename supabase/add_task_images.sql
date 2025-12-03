-- Add image_url field to tasks table
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create images bucket storage policies
-- Note: You need to create the 'images' bucket in Supabase Storage first via the dashboard
-- This script only creates the RLS policies

-- Drop existing policies if any
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'Image%') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON storage.objects';
    END LOOP;
END $$;

-- Allow authenticated users to upload images
CREATE POLICY "Image users can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'images'
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to update their images
CREATE POLICY "Image users can update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'images'
    AND auth.role() = 'authenticated'
  )
  WITH CHECK (
    bucket_id = 'images'
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete their images
CREATE POLICY "Image users can delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'images'
    AND auth.role() = 'authenticated'
  );

-- Allow public read access to images
CREATE POLICY "Image public access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'images');





