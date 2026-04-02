-- One-time admin override for message content filtering
CREATE TABLE IF NOT EXISTS message_filter_overrides (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  remaining_uses INTEGER NOT NULL DEFAULT 1 CHECK (remaining_uses >= 0),
  last_reason TEXT,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_message_filter_overrides_conversation_id
  ON message_filter_overrides(conversation_id);

ALTER TABLE message_filter_overrides ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_message_filter_overrides_updated_at ON message_filter_overrides;
CREATE TRIGGER update_message_filter_overrides_updated_at
  BEFORE UPDATE ON message_filter_overrides
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP POLICY IF EXISTS "Admins can manage message filter overrides" ON message_filter_overrides;
CREATE POLICY "Admins can manage message filter overrides"
  ON message_filter_overrides
  FOR ALL
  USING (public.is_admin_or_superadmin())
  WITH CHECK (public.is_admin_or_superadmin());

DROP POLICY IF EXISTS "Participants can view message filter overrides" ON message_filter_overrides;
CREATE POLICY "Participants can view message filter overrides"
  ON message_filter_overrides FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM conversations c
      WHERE c.id = message_filter_overrides.conversation_id
        AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can consume message filter overrides" ON message_filter_overrides;
CREATE POLICY "Participants can consume message filter overrides"
  ON message_filter_overrides FOR UPDATE
  USING (
    remaining_uses > 0
    AND EXISTS (
      SELECT 1
      FROM conversations c
      WHERE c.id = message_filter_overrides.conversation_id
        AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
    )
  )
  WITH CHECK (
    remaining_uses >= 0
    AND EXISTS (
      SELECT 1
      FROM conversations c
      WHERE c.id = message_filter_overrides.conversation_id
        AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
    )
  );
