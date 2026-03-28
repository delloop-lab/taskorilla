-- Per-user "remove from inbox" without deleting the thread for the other party
CREATE TABLE IF NOT EXISTS user_hidden_conversations (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  hidden_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (user_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_user_hidden_conversations_user_id ON user_hidden_conversations(user_id);

ALTER TABLE user_hidden_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own hidden rows" ON user_hidden_conversations;
CREATE POLICY "Users read own hidden rows"
  ON user_hidden_conversations FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users hide conversations for self" ON user_hidden_conversations;
CREATE POLICY "Users hide conversations for self"
  ON user_hidden_conversations FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users unhide own conversations" ON user_hidden_conversations;
CREATE POLICY "Users unhide own conversations"
  ON user_hidden_conversations FOR DELETE
  USING (user_id = auth.uid());

-- Soft-delete for sent messages (both participants still see placeholder)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN messages.deleted_at IS 'Set when sender removes message; content hidden for both sides.';

CREATE OR REPLACE FUNCTION public.soft_delete_own_message(p_message_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  n   INT;
BEGIN
  IF uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  UPDATE messages
  SET deleted_at = timezone('utc', now())
  WHERE id = p_message_id
    AND sender_id = uid
    AND deleted_at IS NULL;

  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN
    RETURN json_build_object('success', false, 'error', 'not_found_or_forbidden');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_own_message(UUID) TO authenticated;
