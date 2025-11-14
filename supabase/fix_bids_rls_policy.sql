-- Fix bids RLS policy to allow viewing bids on open tasks
-- This allows all users to see bid counts on task cards

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view bids on tasks they created or their own bids" ON bids;
DROP POLICY IF EXISTS "Users can view bids on open tasks or their own bids" ON bids;

-- Create new policy that allows viewing bids on open tasks
-- This allows everyone to see all bids on open tasks (for counting purposes)
CREATE POLICY "Users can view bids on open tasks or their own bids"
  ON bids FOR SELECT
  USING (
    -- Allow viewing ALL bids on open tasks (so everyone can see accurate bid counts)
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = bids.task_id 
      AND tasks.status = 'open'
    )
    -- Or bids on tasks they created (so task owners can see all bids even if task is not open)
    OR EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = bids.task_id 
      AND tasks.created_by = auth.uid()
    )
    -- Or their own bids (so users can see their own bids even on closed tasks)
    OR user_id = auth.uid()
  );

