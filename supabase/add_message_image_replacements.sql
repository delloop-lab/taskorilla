-- Audit log for admin replacement of pre-bid message images
-- Replaced images are tracked immutably for moderation traceability.

CREATE TABLE IF NOT EXISTS public.message_image_replacements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID,
  conversation_id UUID,
  email_log_id UUID,
  original_image_url TEXT NOT NULL,
  replacement_image_url TEXT NOT NULL,
  reason TEXT,
  replaced_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_message_image_replacements_message_id
  ON public.message_image_replacements (message_id);

CREATE INDEX IF NOT EXISTS idx_message_image_replacements_email_log_id
  ON public.message_image_replacements (email_log_id);

CREATE INDEX IF NOT EXISTS idx_message_image_replacements_created_at
  ON public.message_image_replacements (created_at DESC);

ALTER TABLE public.message_image_replacements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view message image replacements" ON public.message_image_replacements;
CREATE POLICY "Admins can view message image replacements"
  ON public.message_image_replacements FOR SELECT
  TO authenticated
  USING (public.is_admin_or_superadmin());

DROP POLICY IF EXISTS "Admins can insert message image replacements" ON public.message_image_replacements;
CREATE POLICY "Admins can insert message image replacements"
  ON public.message_image_replacements FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_superadmin());

COMMENT ON TABLE public.message_image_replacements IS
  'Immutable audit trail for admin substitutions of pre-bid message images.';

