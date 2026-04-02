-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  skills TEXT[],
  services_offered TEXT[],
  professional_offerings TEXT[],
  badges TEXT[],
  hourly_rate DECIMAL(10, 2),
  profile_slug TEXT UNIQUE,
  is_helper BOOLEAN DEFAULT false,
  is_tasker BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  budget DECIMAL(10, 2),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending_payment', 'in_progress', 'completed', 'cancelled', 'locked')),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  category TEXT,
  location TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create bids table
CREATE TABLE IF NOT EXISTS bids (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(task_id, user_id)
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  participant1_id UUID REFERENCES auth.users(id) NOT NULL,
  participant2_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(task_id, participant1_id, participant2_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create reviews table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_bids_task_id ON bids(task_id);
CREATE INDEX IF NOT EXISTS idx_bids_user_id ON bids(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_professional_offerings ON profiles USING GIN(professional_offerings) WHERE professional_offerings IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_is_featured ON profiles(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_task_id ON conversations(task_id);
CREATE INDEX IF NOT EXISTS idx_reviews_task_id ON reviews(task_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_bids_updated_at ON bids;
CREATE TRIGGER update_bids_updated_at
  BEFORE UPDATE ON bids
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies (if any)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop policies on profiles
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON profiles';
    END LOOP;
    
    -- Drop policies on tasks
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'tasks') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON tasks';
    END LOOP;
    
    -- Drop policies on bids
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'bids') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON bids';
    END LOOP;
    
    -- Drop policies on conversations
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'conversations') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON conversations';
    END LOOP;
    
    -- Drop policies on messages
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'messages') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON messages';
    END LOOP;

    -- Drop policies on reviews
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'reviews') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON reviews';
    END LOOP;
END $$;

-- Storage policies for avatars bucket
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects') LOOP
        IF r.policyname LIKE 'Avatar users%' THEN
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON storage.objects';
        END IF;
    END LOOP;
END $$;

CREATE POLICY "Avatar users can upload to their folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Avatar users can update their folder"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Avatar users can delete their folder"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Avatar public access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Tasks policies
CREATE POLICY "Anyone can view open tasks"
  ON tasks FOR SELECT
  USING (status = 'open' OR created_by = auth.uid() OR assigned_to = auth.uid());

CREATE POLICY "Users can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own tasks"
  ON tasks FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own tasks"
  ON tasks FOR DELETE
  USING (created_by = auth.uid());

-- Bids policies
CREATE POLICY "Users can view bids on open tasks or their own bids"
  ON bids FOR SELECT
  USING (
    -- Allow viewing bids on open tasks (so everyone can see bid counts)
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
    -- Or their own bids
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can create bids"
  ON bids FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Task creators can update bids on their tasks"
  ON bids FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM tasks WHERE tasks.id = bids.task_id AND tasks.created_by = auth.uid())
  );

CREATE POLICY "Bidders can update own pending bids on open tasks"
  ON bids FOR UPDATE
  USING (
    user_id = auth.uid()
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = bids.task_id
      AND tasks.status = 'open'
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = bids.task_id
      AND tasks.status = 'open'
    )
  );

-- Conversations policies
CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  USING (participant1_id = auth.uid() OR participant2_id = auth.uid());

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (participant1_id = auth.uid() OR participant2_id = auth.uid());

-- Messages policies
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.participant1_id = auth.uid() OR conversations.participant2_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.participant1_id = auth.uid() OR conversations.participant2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update messages they received"
  ON messages FOR UPDATE
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

-- Reviews policies
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

-- helper_confirmed_final_price_at (TIMESTAMPTZ NULL) on tasks:
-- Double-handshake before payment; run add_helper_confirmed_final_price_at.sql on existing DBs.

-- Helper task allocations (stores which helpers were already matched/notified for tasks)
CREATE TABLE IF NOT EXISTS helper_task_allocations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  helper_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  allocated_via TEXT NOT NULL DEFAULT 'admin_manual',
  channels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  first_allocated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  last_notified_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  last_notified_channels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(task_id, helper_id)
);

CREATE INDEX IF NOT EXISTS idx_helper_task_allocations_task_id ON helper_task_allocations(task_id);
CREATE INDEX IF NOT EXISTS idx_helper_task_allocations_helper_id ON helper_task_allocations(helper_id);
CREATE INDEX IF NOT EXISTS idx_helper_task_allocations_last_notified_at ON helper_task_allocations(last_notified_at);

ALTER TABLE helper_task_allocations ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_helper_task_allocations_updated_at ON helper_task_allocations;
CREATE TRIGGER update_helper_task_allocations_updated_at
  BEFORE UPDATE ON helper_task_allocations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Recreate helper with OR REPLACE for compatibility with existing migrations
CREATE OR REPLACE FUNCTION public.is_admin_or_superadmin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN user_role IN ('admin', 'superadmin');
END;
$$;

DROP POLICY IF EXISTS "Admins can view helper task allocations" ON helper_task_allocations;
CREATE POLICY "Admins can view helper task allocations"
  ON helper_task_allocations FOR SELECT
  USING (public.is_admin_or_superadmin());

DROP POLICY IF EXISTS "Admins can create helper task allocations" ON helper_task_allocations;
CREATE POLICY "Admins can create helper task allocations"
  ON helper_task_allocations FOR INSERT
  WITH CHECK (public.is_admin_or_superadmin());

DROP POLICY IF EXISTS "Admins can update helper task allocations" ON helper_task_allocations;
CREATE POLICY "Admins can update helper task allocations"
  ON helper_task_allocations FOR UPDATE
  USING (public.is_admin_or_superadmin())
  WITH CHECK (public.is_admin_or_superadmin());

-- Helper match feedback (admin-managed hard exclusions for task types)
CREATE TABLE IF NOT EXISTS helper_match_feedback (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  helper_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type_key TEXT NOT NULL,
  feedback TEXT NOT NULL DEFAULT 'exclude',
  reason TEXT NOT NULL DEFAULT 'not_suitable',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  CONSTRAINT helper_match_feedback_feedback_check CHECK (feedback IN ('exclude')),
  CONSTRAINT helper_match_feedback_unique_helper_type UNIQUE(helper_id, task_type_key)
);

CREATE INDEX IF NOT EXISTS idx_helper_match_feedback_task_id ON helper_match_feedback(task_id);
CREATE INDEX IF NOT EXISTS idx_helper_match_feedback_helper_id ON helper_match_feedback(helper_id);
CREATE INDEX IF NOT EXISTS idx_helper_match_feedback_task_type_key ON helper_match_feedback(task_type_key);
CREATE INDEX IF NOT EXISTS idx_helper_match_feedback_created_at ON helper_match_feedback(created_at DESC);

ALTER TABLE helper_match_feedback ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_helper_match_feedback_updated_at ON helper_match_feedback;
CREATE TRIGGER update_helper_match_feedback_updated_at
  BEFORE UPDATE ON helper_match_feedback
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP POLICY IF EXISTS "Admins can view helper match feedback" ON helper_match_feedback;
CREATE POLICY "Admins can view helper match feedback"
  ON helper_match_feedback FOR SELECT
  USING (public.is_admin_or_superadmin());

DROP POLICY IF EXISTS "Admins can create helper match feedback" ON helper_match_feedback;
CREATE POLICY "Admins can create helper match feedback"
  ON helper_match_feedback FOR INSERT
  WITH CHECK (public.is_admin_or_superadmin());

DROP POLICY IF EXISTS "Admins can update helper match feedback" ON helper_match_feedback;
CREATE POLICY "Admins can update helper match feedback"
  ON helper_match_feedback FOR UPDATE
  USING (public.is_admin_or_superadmin())
  WITH CHECK (public.is_admin_or_superadmin());

DROP POLICY IF EXISTS "Admins can delete helper match feedback" ON helper_match_feedback;
CREATE POLICY "Admins can delete helper match feedback"
  ON helper_match_feedback FOR DELETE
  USING (public.is_admin_or_superadmin());

-- Guide helpfulness feedback from Help Center pages
CREATE TABLE IF NOT EXISTS guide_feedback (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  guide_id TEXT NOT NULL,
  guide_title TEXT NOT NULL,
  guide_slug TEXT NOT NULL,
  feedback TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  session_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  CONSTRAINT guide_feedback_feedback_check CHECK (feedback IN ('yes', 'no'))
);

CREATE INDEX IF NOT EXISTS idx_guide_feedback_created_at
  ON guide_feedback(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_guide_feedback_guide_slug_created_at
  ON guide_feedback(guide_slug, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_guide_feedback_feedback_created_at
  ON guide_feedback(feedback, created_at DESC);

ALTER TABLE guide_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert guide feedback" ON guide_feedback;
CREATE POLICY "Anyone can insert guide feedback"
  ON guide_feedback FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view guide feedback" ON guide_feedback;
CREATE POLICY "Admins can view guide feedback"
  ON guide_feedback FOR SELECT
  USING (public.is_admin_or_superadmin());

DROP POLICY IF EXISTS "Admins can update guide feedback" ON guide_feedback;
CREATE POLICY "Admins can update guide feedback"
  ON guide_feedback FOR UPDATE
  USING (public.is_admin_or_superadmin())
  WITH CHECK (public.is_admin_or_superadmin());

DROP POLICY IF EXISTS "Admins can delete guide feedback" ON guide_feedback;
CREATE POLICY "Admins can delete guide feedback"
  ON guide_feedback FOR DELETE
  USING (public.is_admin_or_superadmin());

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

