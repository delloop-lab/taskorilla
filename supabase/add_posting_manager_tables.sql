-- Posting Manager tables for Taskorilla

-- Platforms enum (optional – you can also use plain TEXT)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'posting_platform') THEN
    CREATE TYPE posting_platform AS ENUM ('Facebook', 'Instagram', 'LinkedIn', 'X', 'Threads', 'WhatsApp');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS posting_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform posting_platform NOT NULL,
  name TEXT NOT NULL,
  url TEXT,
  group_image TEXT,
  days_between_posts INTEGER NOT NULL DEFAULT 3,
  description TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Facebook-specific mode (e.g. Ads accepted / Comments accepted)
ALTER TABLE posting_groups
  ADD COLUMN IF NOT EXISTS facebook_post_mode TEXT;

-- Admin-controlled flag for groups/pages where posting is no longer supported
ALTER TABLE posting_groups
  ADD COLUMN IF NOT EXISTS is_unusable BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS posting_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  post_text TEXT NOT NULL,
  post_media_url TEXT,
  platform posting_platform NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS posting_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES posting_groups(id) ON DELETE CASCADE,
  template_id UUID REFERENCES posting_templates(id),
  post_text TEXT NOT NULL,
  post_media_url TEXT,
  date_posted TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  next_allowed_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  pending_approval BOOLEAN NOT NULL DEFAULT FALSE
);

-- Comment tracking for comment-only groups/pages
CREATE TABLE IF NOT EXISTS posting_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES posting_groups(id) ON DELETE CASCADE,
  number_of_comments INTEGER NOT NULL,
  date_commented TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Basic indexes
CREATE INDEX IF NOT EXISTS idx_posting_posts_group_id ON posting_posts(group_id);
CREATE INDEX IF NOT EXISTS idx_posting_posts_date_posted ON posting_posts(date_posted DESC);
CREATE INDEX IF NOT EXISTS idx_posting_templates_platform ON posting_templates(platform);
CREATE INDEX IF NOT EXISTS idx_posting_groups_platform ON posting_groups(platform);
CREATE INDEX IF NOT EXISTS idx_posting_comments_group_id ON posting_comments(group_id);
CREATE INDEX IF NOT EXISTS idx_posting_comments_date_commented ON posting_comments(date_commented DESC);

-- Seed initial templates
INSERT INTO posting_templates (template_name, post_text, post_media_url, platform, notes)
VALUES
  -- FACEBOOK
  ('FB Job Request', 'Looking for a helper for [task] this weekend. Comment if interested!', 'https://example.com/images/fb1.png', 'Facebook', 'Use in local FB groups'),
  ('FB Event Reminder', 'Join us at [event] this weekend!', 'https://example.com/images/fb2.png', 'Facebook', 'Community events'),
  ('FB Weekly Tip', 'Tip of the week: [tip]. #CommunityTips', 'https://example.com/images/fb3.png', 'Facebook', 'General tips'),

  -- INSTAGRAM
  ('IG Visual Job', 'Need help with [task] in your area? DM us!', 'https://example.com/images/ig1.png', 'Instagram', 'Visual-heavy post'),
  ('IG Event Story', 'Exciting event this weekend: [event]! #Algarve', 'https://example.com/images/ig2.png', 'Instagram', 'Use as story or feed'),

  -- LINKEDIN
  ('LI Professional Announcement', 'Looking for skilled local helpers for [task]. Contact for more info.', 'https://example.com/images/li1.png', 'LinkedIn', 'Professional tone'),
  ('LI Networking Event', 'Join our professional meetup at [event].', 'https://example.com/images/li2.png', 'LinkedIn', 'Networking'),

  -- X (Twitter)
  ('X Quick Job', 'Need someone for [task] this weekend. Reply if available! #AlgarveHelp', 'https://example.com/images/x1.png', 'X', 'Short & punchy'),
  ('X Tip', 'Tip: Always double-check local listings before posting a job! #CommunityTips', 'https://example.com/images/x2.png', 'X', 'Tips & advice'),

  -- THREADS
  ('Threads Update', 'Check out our latest [task/service] available in your area. #Algarve', 'https://example.com/images/threads1.png', 'Threads', 'Short updates'),

  -- WHATSAPP
  ('WA Local Help', 'Hey everyone! Need help with [task] this week. DM me if you can assist.', 'https://example.com/images/wa1.png', 'WhatsApp', 'Casual and conversational')
ON CONFLICT DO NOTHING;

