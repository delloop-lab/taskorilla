-- Fix traffic table duplicates by aggregating and ensuring uniqueness
-- This script will:
-- 1. Aggregate duplicate page entries
-- 2. Add a UNIQUE constraint to prevent future duplicates

-- First, check if traffic table exists and has data
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'traffic'
    ) INTO table_exists;

    IF table_exists THEN
        -- Create a temporary table with aggregated data
        CREATE TEMP TABLE temp_traffic_aggregated AS
        SELECT 
            page,
            SUM(visits) as total_visits
        FROM traffic
        GROUP BY page;

        -- Delete all existing records
        DELETE FROM traffic;

        -- Insert aggregated data back
        INSERT INTO traffic (page, visits)
        SELECT page, total_visits
        FROM temp_traffic_aggregated;

        -- Drop temporary table
        DROP TABLE temp_traffic_aggregated;

        RAISE NOTICE 'Traffic table duplicates have been aggregated';
    ELSE
        RAISE NOTICE 'Traffic table does not exist, skipping aggregation';
    END IF;
END $$;

-- Add UNIQUE constraint on page column to prevent duplicates
-- First, drop the constraint if it exists
ALTER TABLE traffic DROP CONSTRAINT IF EXISTS traffic_page_unique;

-- Add UNIQUE constraint
ALTER TABLE traffic ADD CONSTRAINT traffic_page_unique UNIQUE (page);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_traffic_page ON traffic(page);
CREATE INDEX IF NOT EXISTS idx_traffic_visits ON traffic(visits DESC);


