-- Migration: Allow custom email template types
-- This removes the CHECK constraint that only allowed 'helper_welcome' and 'tasker_welcome'

-- Find and drop all CHECK constraints on the email_templates table
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Find all CHECK constraints on email_templates table
    FOR constraint_record IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'email_templates'::regclass
          AND contype = 'c'
    LOOP
        EXECUTE 'ALTER TABLE email_templates DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_record.conname);
        RAISE NOTICE 'Dropped CHECK constraint: %', constraint_record.conname;
    END LOOP;
END $$;

-- The template_type column is already TEXT, so no need to change the column type
-- Now any template_type string can be used
