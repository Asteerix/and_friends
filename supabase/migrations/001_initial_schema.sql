-- &Friends Initial Database Schema
-- This migration sets up all core tables for the application

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle TEXT UNIQUE NOT NULL CHECK (handle ~ '^[a-zA-Z0-9_]{3,20}$'),
  full_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  birth_date DATE,
  hide_age BOOLEAN DEFAULT false,
  gender TEXT,
  pronouns TEXT[],
  location GEOGRAPHY(POINT),
  city TEXT,
  country_code TEXT,
  timezone TEXT,
  language_code TEXT DEFAULT 'en',
  path TEXT,
  company TEXT,
  website TEXT,
  favorite_music JSONB,
  favorite_restaurants JSONB[],
  hobbies TEXT[],
  interests TEXT[],
  verified BOOLEAN DEFAULT false,
  premium_until TIMESTAMP,
  followers_count INT DEFAULT 0,
  following_count INT DEFAULT 0,
  events_created INT DEFAULT 0,
  events_attended INT DEFAULT 0,
  trust_score INT DEFAULT 100,
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_step INT DEFAULT 0,
  contacts_permission BOOLEAN DEFAULT false,
  location_permission BOOLEAN DEFAULT false,
  notification_permission BOOLEAN DEFAULT false,
  phone_contacts JSONB,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  cover_data JSONB NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  timezone TEXT NOT NULL,
  recurrence_rule TEXT,
  location GEOGRAPHY(POINT),
  address TEXT,
  venue_name TEXT,
  venue_id TEXT,
  indoor_map_url TEXT,
  organizer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  co_organizers UUID[],
  category TEXT NOT NULL,
  tags TEXT[],
  privacy TEXT CHECK (privacy IN ('public', 'friends', 'invite-only', 'secret')) DEFAULT 'public',
  max_attendees INT,
  current_attendees INT DEFAULT 0,
  waitlist_enabled BOOLEAN DEFAULT false,
  approval_required BOOLEAN DEFAULT false,
  age_restriction INT,
  dress_code TEXT,
  what_to_bring TEXT[],
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'EUR',
  payment_required BOOLEAN DEFAULT false,
  refund_policy TEXT,
  featured BOOLEAN DEFAULT false,
  sponsored BOOLEAN DEFAULT false,
  status TEXT CHECK (status IN ('draft', 'published', 'ongoing', 'ended', 'cancelled')) DEFAULT 'draft',
  cancellation_reason TEXT,
  view_count INT DEFAULT 0,
  share_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event attendees
CREATE TABLE IF NOT EXISTS public.event_attendees (
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('invited', 'going', 'maybe', 'declined', 'waitlist')) DEFAULT 'invited',
  invited_by UUID REFERENCES public.users(id),
  responded_at TIMESTAMP WITH TIME ZONE,
  check_in_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

-- Conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT CHECK (type IN ('direct', 'group', 'event')) NOT NULL,
  name TEXT,
  avatar_url TEXT,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id),
  participant_count INT DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation participants
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('member', 'admin', 'owner')) DEFAULT 'member',
  muted_until TIMESTAMP WITH TIME ZONE,
  last_read_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.messages(id),
  sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  content TEXT,
  content_type TEXT CHECK (content_type IN ('text', 'image', 'video', 'audio', 'poll', 'location', 'event')) DEFAULT 'text',
  media_urls TEXT[],
  poll_data JSONB,
  event_id UUID REFERENCES public.events(id),
  reactions JSONB DEFAULT '{}',
  mentions UUID[],
  edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  read_by UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stories
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('image', 'video')) NOT NULL,
  caption TEXT,
  music_data JSONB,
  stickers JSONB[],
  mentions UUID[],
  location GEOGRAPHY(POINT),
  views UUID[] DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours',
  highlight_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Story highlights
CREATE TABLE IF NOT EXISTS public.story_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  cover_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Follows
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Blocks
CREATE TABLE IF NOT EXISTS public.blocks (
  blocker_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- Reports
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('user', 'event', 'message', 'story')) NOT NULL,
  reported_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')) DEFAULT 'pending',
  resolved_by UUID REFERENCES public.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event analytics
CREATE TABLE IF NOT EXISTS public.event_analytics (
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views INT DEFAULT 0,
  unique_views INT DEFAULT 0,
  rsvps INT DEFAULT 0,
  shares INT DEFAULT 0,
  story_mentions INT DEFAULT 0,
  demographics JSONB,
  traffic_sources JSONB,
  peak_hour INT,
  PRIMARY KEY (event_id, date)
);

-- Polls
CREATE TABLE IF NOT EXISTS public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  multiple_choice BOOLEAN DEFAULT false,
  anonymous BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Poll votes
CREATE TABLE IF NOT EXISTS public.poll_votes (
  poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  option_ids INT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (poll_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_users_handle ON public.users(handle);
CREATE INDEX idx_users_location ON public.users USING GIST(location);
CREATE INDEX idx_events_start_time ON public.events(start_time);
CREATE INDEX idx_events_location ON public.events USING GIST(location);
CREATE INDEX idx_events_organizer ON public.events(organizer_id);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_created ON public.messages(created_at);
CREATE INDEX idx_stories_user ON public.stories(user_id);
CREATE INDEX idx_stories_expires ON public.stories(expires_at);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();