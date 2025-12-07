-- =====================================================
-- SAFE SCRIPT TO DELETE ALL TASKS AND RELATED DATA
-- =====================================================
-- This script will delete all tasks and their related data
-- while preserving the database structure (tables, columns, indexes, etc.)
--
-- WARNING: This will permanently delete:
-- - All tasks
-- - All bids
-- - All conversations and messages
-- - All reviews
-- - All task images
-- - All task completion photos
-- - All task progress updates
-- - All task tags relationships
--
-- This will NOT delete:
-- - User profiles
-- - Categories
-- - Tags (the tag definitions themselves)
-- - Email logs (they reference tasks but use ON DELETE SET NULL)
-- - Database structure (tables, columns, indexes, etc.)
--
-- =====================================================

-- Start a transaction for safety
BEGIN;

-- Delete in order to respect foreign key constraints
-- Most tables use ON DELETE CASCADE, so deleting tasks will auto-delete related records
-- But we'll be explicit for clarity

-- 1. Delete task progress updates (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_progress_updates') THEN
    DELETE FROM task_progress_updates;
    RAISE NOTICE 'Deleted all task progress updates';
  END IF;
END $$;

-- 2. Delete task completion photos (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_completion_photos') THEN
    DELETE FROM task_completion_photos;
    RAISE NOTICE 'Deleted all task completion photos';
  END IF;
END $$;

-- 3. Delete task images (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_images') THEN
    DELETE FROM task_images;
    RAISE NOTICE 'Deleted all task images';
  END IF;
END $$;

-- 4. Delete task tags relationships (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_tags') THEN
    DELETE FROM task_tags;
    RAISE NOTICE 'Deleted all task tags relationships';
  END IF;
END $$;

-- 5. Delete messages (they reference conversations which reference tasks)
DELETE FROM messages;

-- 6. Delete conversations (they reference tasks)
DELETE FROM conversations;

-- 7. Delete reviews (they reference tasks)
DELETE FROM reviews;

-- 8. Delete bids (they reference tasks)
DELETE FROM bids;

-- 9. Finally, delete all tasks
-- This will cascade delete any remaining related records
DELETE FROM tasks;

-- Show summary
DO $$
DECLARE
  task_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO task_count FROM tasks;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DELETION COMPLETE';
  RAISE NOTICE 'Remaining tasks: %', task_count;
  RAISE NOTICE '========================================';
END $$;

-- Commit the transaction
COMMIT;

-- =====================================================
-- VERIFICATION QUERIES (run these separately to verify)
-- =====================================================
-- SELECT COUNT(*) FROM tasks;                    -- Should be 0
-- SELECT COUNT(*) FROM bids;                     -- Should be 0
-- SELECT COUNT(*) FROM conversations;            -- Should be 0
-- SELECT COUNT(*) FROM messages;                 -- Should be 0
-- SELECT COUNT(*) FROM reviews;                  -- Should be 0
-- SELECT COUNT(*) FROM task_images;              -- Should be 0 (if table exists)
-- SELECT COUNT(*) FROM task_completion_photos;    -- Should be 0 (if table exists)
-- SELECT COUNT(*) FROM task_progress_updates;     -- Should be 0 (if table exists)
-- SELECT COUNT(*) FROM task_tags;                -- Should be 0 (if table exists)
-- SELECT COUNT(*) FROM profiles;                 -- Should remain unchanged
-- SELECT COUNT(*) FROM categories;               -- Should remain unchanged
-- SELECT COUNT(*) FROM tags;                     -- Should remain unchanged (if table exists)







