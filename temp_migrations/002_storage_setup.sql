-- &Friends Storage Buckets and Policies
-- Sets up all storage buckets for file uploads

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('event-covers', 'event-covers', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4']),
  ('story-media', 'story-media', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime']),
  ('chat-media', 'chat-media', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'audio/mpeg', 'audio/wav'])
ON CONFLICT (id) DO NOTHING;

-- Avatars bucket policies
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Event covers bucket policies
CREATE POLICY "Anyone can view event covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-covers');

CREATE POLICY "Event organizers can upload covers"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'event-covers' AND
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id::text = (storage.foldername(name))[1]
      AND (organizer_id = auth.uid() OR auth.uid() = ANY(co_organizers))
    )
  );

CREATE POLICY "Event organizers can update covers"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'event-covers' AND
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id::text = (storage.foldername(name))[1]
      AND (organizer_id = auth.uid() OR auth.uid() = ANY(co_organizers))
    )
  );

CREATE POLICY "Event organizers can delete covers"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'event-covers' AND
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id::text = (storage.foldername(name))[1]
      AND (organizer_id = auth.uid() OR auth.uid() = ANY(co_organizers))
    )
  );

-- Story media bucket policies
CREATE POLICY "Anyone can view stories"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'story-media');

CREATE POLICY "Users can upload their own stories"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'story-media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own stories"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'story-media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Chat media bucket policies
CREATE POLICY "Conversation participants can view chat media"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-media' AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Conversation participants can upload chat media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-media' AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
    )
  );

-- Create storage helper functions
CREATE OR REPLACE FUNCTION get_storage_url(bucket_name TEXT, file_path TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CONCAT(
    current_setting('app.settings.storage_url', true),
    '/object/public/',
    bucket_name,
    '/',
    file_path
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to clean up old stories
CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS void AS $$
BEGIN
  -- Delete expired story files from storage
  DELETE FROM storage.objects
  WHERE bucket_id = 'story-media'
  AND created_at < NOW() - INTERVAL '24 hours 5 minutes';
  
  -- Delete expired story records
  DELETE FROM public.stories
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule story cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-stories', '0 * * * *', 'SELECT cleanup_expired_stories();');