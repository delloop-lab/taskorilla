ALTER TABLE profiles ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;
COMMENT ON COLUMN profiles.archived_at IS
  'Set when an admin archives a user. PII is anonymized but all messages, bids, tasks and reviews are preserved for audit.';
