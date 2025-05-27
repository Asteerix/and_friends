-- Create storage buckets for the application
-- This migration sets up all the necessary storage buckets with proper RLS policies

-- Create avatars bucket for user profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create events bucket for event cover images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'events',
  'events',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Create stories bucket for user stories (24h content)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stories',
  'stories',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
) ON CONFLICT (id) DO NOTHING;

-- Create messages bucket for message attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'messages',
  'messages',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4']
) ON CONFLICT (id) DO NOTHING;

-- RLS Policies for avatars bucket
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- RLS Policies for events bucket
CREATE POLICY "Authenticated users can upload event images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'events' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Event creators can update their event images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'events' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Event creators can delete their event images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'events' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view event images"
ON storage.objects FOR SELECT
USING (bucket_id = 'events');

-- RLS Policies for stories bucket
CREATE POLICY "Users can upload their own stories"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'stories' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own stories"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'stories' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view stories"
ON storage.objects FOR SELECT
USING (bucket_id = 'stories');

-- RLS Policies for messages bucket
CREATE POLICY "Chat participants can upload message attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'messages' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM chat_participants cp
    JOIN messages m ON m.chat_id = cp.chat_id
    WHERE cp.user_id = auth.uid()
    AND m.id = (storage.foldername(name))[2]::uuid
  )
);

CREATE POLICY "Message authors can delete their attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'messages' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM messages m
    WHERE m.author_id = auth.uid()
    AND m.id = (storage.foldername(name))[2]::uuid
  )
);

CREATE POLICY "Chat participants can view message attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'messages' AND
  EXISTS (
    SELECT 1 FROM chat_participants cp
    JOIN messages m ON m.chat_id = cp.chat_id
    WHERE cp.user_id = auth.uid()
    AND m.id = (storage.foldername(name))[2]::uuid
  )
);

-- Create stories table if not exists
CREATE TABLE IF NOT EXISTS stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  caption TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  viewed_by UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for expired stories cleanup
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);

-- RLS for stories table
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own stories"
ON stories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories"
ON stories FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view stories from their friends"
ON stories FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM friendships f
    WHERE (f.user_id = auth.uid() AND f.friend_id = stories.user_id)
    OR (f.friend_id = auth.uid() AND f.user_id = stories.user_id)
  )
);

-- Function to add story view
CREATE OR REPLACE FUNCTION add_story_view(story_id UUID, viewer_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE stories
  SET viewed_by = array_append(viewed_by, viewer_id)
  WHERE id = story_id
  AND NOT (viewer_id = ANY(viewed_by));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired stories
CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS VOID AS $$
BEGIN
  DELETE FROM stories WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (requires pg_cron extension)
-- This would need to be configured separately in Supabase dashboard