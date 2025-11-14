-- Add reviews table and policies
-- This is an incremental update - only run this if reviews table doesn't exist yet

-- Create reviews table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES auth.users(id) NOT NULL,
  reviewee_id UUID REFERENCES auth.users(id) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(task_id, reviewer_id, reviewee_id)
);

-- Create indexes (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_reviews_task_id ON reviews(task_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);

-- Enable RLS (safe to run multiple times)
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to update them)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'reviews') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON reviews';
    END LOOP;
END $$;

-- Create/update policies
CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  USING (true);

CREATE POLICY "Task participants can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1
      FROM tasks
      WHERE tasks.id = reviews.task_id
        AND tasks.status = 'completed'
        AND (
          (tasks.created_by = auth.uid() AND tasks.assigned_to = reviews.reviewee_id)
          OR (tasks.assigned_to = auth.uid() AND tasks.created_by = reviews.reviewee_id)
        )
    )
  );


