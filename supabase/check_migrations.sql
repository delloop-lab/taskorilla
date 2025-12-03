-- Check which migrations have been applied by verifying if key columns/tables exist
-- Run this in Supabase SQL Editor to see what's missing

-- Check for is_featured field (most recent)
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'profiles' AND column_name = 'is_featured'
    ) THEN '✅ is_featured field EXISTS'
    ELSE '❌ is_featured field MISSING - Run: add_is_featured_field.sql'
  END as is_featured_status;

-- Check for professional_offerings field
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'profiles' AND column_name = 'professional_offerings'
    ) THEN '✅ professional_offerings field EXISTS'
    ELSE '❌ professional_offerings field MISSING - Run: add_professional_offerings_field.sql'
  END as professional_offerings_status;

-- Check for professions field
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'profiles' AND column_name = 'professions'
    ) THEN '✅ professions field EXISTS'
    ELSE '❌ professions field MISSING - Run: add_professions_field.sql'
  END as professions_status;

-- Check for qualifications field
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'profiles' AND column_name = 'qualifications'
    ) THEN '✅ qualifications field EXISTS'
    ELSE '❌ qualifications field MISSING - Run: add_qualifications_field.sql'
  END as qualifications_status;

-- Check for required_professions in tasks
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tasks' AND column_name = 'required_professions'
    ) THEN '✅ required_professions field EXISTS'
    ELSE '❌ required_professions field MISSING - Run: add_required_professions_to_tasks.sql'
  END as required_professions_status;

-- Check for image_url in messages
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'messages' AND column_name = 'image_url'
    ) THEN '✅ messages.image_url field EXISTS'
    ELSE '❌ messages.image_url field MISSING - Run: add_messages_image_url_column.sql'
  END as messages_image_url_status;

-- Check for task_progress_updates table
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'task_progress_updates'
    ) THEN '✅ task_progress_updates table EXISTS'
    ELSE '❌ task_progress_updates table MISSING - Run: add_progress_tracking.sql'
  END as progress_tracking_status;

-- Check for traffic_daily table
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'traffic_daily'
    ) THEN '✅ traffic_daily table EXISTS'
    ELSE '❌ traffic_daily table MISSING - Run: create_traffic_daily_table.sql'
  END as traffic_daily_status;

-- Check for email_logs table
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'email_logs'
    ) THEN '✅ email_logs table EXISTS'
    ELSE '❌ email_logs table MISSING - Run: create_email_logs_table.sql'
  END as email_logs_status;


