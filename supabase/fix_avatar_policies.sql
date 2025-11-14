-- Fix avatar storage policies
-- Run this in Supabase SQL Editor

-- Drop existing policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Avatar users can upload to their folder" ON storage.objects;
  DROP POLICY IF EXISTS "Avatar users can update their folder" ON storage.objects;
  DROP POLICY IF EXISTS "Avatar users can delete their folder" ON storage.objects;
  DROP POLICY IF EXISTS "Avatar public access" ON storage.objects;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Allow authenticated users to upload to their own folder
-- The name field in storage.objects is the full path: "user-id/filename.jpg"
CREATE POLICY "Avatar users can upload to their folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Allow authenticated users to update files in their own folder
CREATE POLICY "Avatar users can update their folder"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Allow authenticated users to delete files in their own folder
CREATE POLICY "Avatar users can delete their folder"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Allow public read access to avatars (for displaying images)
CREATE POLICY "Avatar public access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

