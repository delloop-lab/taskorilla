-- Add structured Google Maps link field for chat messages.
-- This allows approved location pins to be stored separately from free text.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS location_link TEXT;

CREATE INDEX IF NOT EXISTS idx_messages_location_link
  ON public.messages(location_link)
  WHERE location_link IS NOT NULL;

COMMENT ON COLUMN public.messages.location_link IS
  'Optional structured location link (Google Maps allowlist) extracted from message content.';

