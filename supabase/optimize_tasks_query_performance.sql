-- Optimize tasks query performance
-- This creates composite indexes for common query patterns
-- Run this in Supabase SQL Editor to improve query performance from ~9s to <1s

-- Composite index for the most common query: status + hidden_by_admin + archived + created_at
-- This covers the 'open' filter query pattern (most selective first)
CREATE INDEX IF NOT EXISTS idx_tasks_open_filter 
ON tasks(status, hidden_by_admin, archived, created_at DESC) 
WHERE status = 'open' AND hidden_by_admin = false AND archived = false;

-- Composite index for status + archived + created_at (for admin views and other filters)
CREATE INDEX IF NOT EXISTS idx_tasks_status_archived_created 
ON tasks(status, archived, created_at DESC);

-- Index on created_at for sorting (if not exists)
CREATE INDEX IF NOT EXISTS idx_tasks_created_at_desc 
ON tasks(created_at DESC);

-- Composite index for created_by + status (for 'my_tasks' filter)
CREATE INDEX IF NOT EXISTS idx_tasks_created_by_status 
ON tasks(created_by, status, created_at DESC);

-- Composite index for assigned_to + status (for 'my_tasks' filter)
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_status 
ON tasks(assigned_to, status, created_at DESC) 
WHERE assigned_to IS NOT NULL;

-- Analyze tables to update statistics for query planner (helps PostgreSQL choose best indexes)
ANALYZE tasks;
