-- Comprehensive security fixes for all functions with mutable search_path
-- This migration sets secure search_path for all functions to prevent security vulnerabilities

-- First, drop functions that need return type changes
DROP FUNCTION IF EXISTS public.get_friends(UUID);
DROP FUNCTION IF EXISTS public.get_event_messages(UUID);
DROP FUNCTION IF EXISTS public.get_friend_requests(UUID, TEXT);
DROP FUNCTION IF EXISTS public.search_users(TEXT, UUID);

-- Update add_story_view function
CREATE OR REPLACE FUNCTION public.add_story_view(p_story_id UUID, p_viewer_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Check if the viewer has already viewed this story
  IF NOT EXISTS (
    SELECT 1 FROM story_views 
    WHERE story_id = p_story_id AND viewer_id = p_viewer_id
  ) THEN
    -- Insert the view record
    INSERT INTO story_views (story_id, viewer_id, viewed_at)
    VALUES (p_story_id, p_viewer_id, NOW());
    
    -- Add the viewer_id to the views array if not already present
    UPDATE stories
    SET views = array_append(
      COALESCE(views, ARRAY[]::text[]), 
      p_viewer_id::text
    )
    WHERE id = p_story_id
    AND NOT (p_viewer_id::text = ANY(COALESCE(views, ARRAY[]::text[])));
    
    -- Update the views count
    UPDATE stories
    SET views_count = COALESCE(array_length(views, 1), 0)
    WHERE id = p_story_id;
  END IF;
END;
$$;

-- Update update_story_replies_count function
CREATE OR REPLACE FUNCTION public.update_story_replies_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE stories 
    SET replies_count = replies_count + 1 
    WHERE id = NEW.story_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE stories 
    SET replies_count = replies_count - 1 
    WHERE id = OLD.story_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Update update_story_saves_count function
CREATE OR REPLACE FUNCTION public.update_story_saves_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE stories 
    SET saves_count = saves_count + 1 
    WHERE id = NEW.story_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE stories 
    SET saves_count = saves_count - 1 
    WHERE id = OLD.story_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Update update_reply_likes_count function
CREATE OR REPLACE FUNCTION public.update_reply_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE story_replies 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.reply_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE story_replies 
    SET likes_count = likes_count - 1 
    WHERE id = OLD.reply_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Update get_friend_status function (with correct parameters)
CREATE OR REPLACE FUNCTION public.get_friend_status(user1_id UUID, user2_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  friendship_status TEXT;
BEGIN
  -- Check if there's a friendship record between the two users
  SELECT status INTO friendship_status
  FROM friendships
  WHERE (user_id = user1_id AND friend_id = user2_id)
     OR (user_id = user2_id AND friend_id = user1_id)
  LIMIT 1;
  
  RETURN COALESCE(friendship_status, 'none');
END;
$$;

-- Update sync_event_created_by function
CREATE OR REPLACE FUNCTION public.sync_event_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- When an event is created, add the creator as a participant
  INSERT INTO event_participants (event_id, user_id, status, joined_at)
  VALUES (NEW.id, NEW.created_by, 'going', NOW())
  ON CONFLICT (event_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create get_friends function with correct return type
CREATE FUNCTION public.get_friends(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  friendship_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    f.id as friendship_id,
    f.created_at
  FROM friendships f
  JOIN profiles p ON (
    (f.user_id = p_user_id AND f.friend_id = p.id) OR
    (f.friend_id = p_user_id AND f.user_id = p.id)
  )
  WHERE f.status = 'accepted'
  ORDER BY f.created_at DESC;
END;
$$;

-- Create get_event_messages function  
CREATE FUNCTION public.get_event_messages(p_event_id UUID)
RETURNS TABLE(
  id UUID,
  content TEXT,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.content,
    m.user_id,
    p.username,
    p.avatar_url,
    m.created_at
  FROM messages m
  JOIN chats c ON m.chat_id = c.id
  JOIN profiles p ON m.user_id = p.id
  WHERE c.event_id = p_event_id
  ORDER BY m.created_at ASC;
END;
$$;

-- Create get_friend_requests function with correct return type
CREATE FUNCTION public.get_friend_requests(p_user_id UUID, p_type TEXT DEFAULT 'received')
RETURNS TABLE(
  id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  friendship_id UUID,
  created_at TIMESTAMPTZ,
  mutual_friends INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_type = 'received' THEN
    RETURN QUERY
    SELECT 
      p.id,
      p.username,
      p.full_name,
      p.avatar_url,
      p.bio,
      f.id as friendship_id,
      f.created_at,
      (
        SELECT COUNT(*)::INTEGER
        FROM friendships f1
        JOIN friendships f2 ON (
          (f1.user_id = p.id AND f1.friend_id = f2.user_id) OR
          (f1.user_id = p.id AND f1.friend_id = f2.friend_id) OR
          (f1.friend_id = p.id AND f1.user_id = f2.user_id) OR
          (f1.friend_id = p.id AND f1.user_id = f2.friend_id)
        )
        WHERE f1.status = 'accepted' 
        AND f2.status = 'accepted'
        AND (
          (f2.user_id = p_user_id AND f2.friend_id != p.id) OR
          (f2.friend_id = p_user_id AND f2.user_id != p.id)
        )
      ) as mutual_friends
    FROM friendships f
    JOIN profiles p ON f.user_id = p.id
    WHERE f.friend_id = p_user_id
    AND f.status = 'pending'
    ORDER BY f.created_at DESC;
  ELSE -- sent requests
    RETURN QUERY
    SELECT 
      p.id,
      p.username,
      p.full_name,
      p.avatar_url,
      p.bio,
      f.id as friendship_id,
      f.created_at,
      0::INTEGER as mutual_friends
    FROM friendships f
    JOIN profiles p ON f.friend_id = p.id
    WHERE f.user_id = p_user_id
    AND f.status = 'pending'
    ORDER BY f.created_at DESC;
  END IF;
END;
$$;

-- Create search_users function with correct parameters and return type
CREATE FUNCTION public.search_users(
  p_query TEXT,
  p_current_user_id UUID
)
RETURNS TABLE(
  id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_friend BOOLEAN,
  friend_request_pending BOOLEAN,
  friend_request_sent BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.bio,
    EXISTS(
      SELECT 1 FROM friendships f 
      WHERE f.status = 'accepted'
      AND (
        (f.user_id = p_current_user_id AND f.friend_id = p.id) OR
        (f.friend_id = p_current_user_id AND f.user_id = p.id)
      )
    ) as is_friend,
    EXISTS(
      SELECT 1 FROM friendships f 
      WHERE f.status = 'pending'
      AND f.friend_id = p_current_user_id 
      AND f.user_id = p.id
    ) as friend_request_pending,
    EXISTS(
      SELECT 1 FROM friendships f 
      WHERE f.status = 'pending'
      AND f.user_id = p_current_user_id 
      AND f.friend_id = p.id
    ) as friend_request_sent
  FROM profiles p
  WHERE p.id != p_current_user_id
  AND (
    p.username ILIKE '%' || p_query || '%' OR
    p.full_name ILIKE '%' || p_query || '%' OR
    p.display_name ILIKE '%' || p_query || '%'
  )
  AND (
    p.is_private = false OR
    EXISTS(
      SELECT 1 FROM friendships f 
      WHERE f.status = 'accepted'
      AND (
        (f.user_id = p_current_user_id AND f.friend_id = p.id) OR
        (f.friend_id = p_current_user_id AND f.user_id = p.id)
      )
    )
  )
  ORDER BY 
    CASE 
      WHEN p.username ILIKE p_query || '%' THEN 1
      WHEN p.full_name ILIKE p_query || '%' THEN 2
      ELSE 3
    END,
    p.username
  LIMIT 50;
END;
$$;

-- Enable RLS on spatial_ref_sys table (PostGIS) if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'spatial_ref_sys'
  ) THEN
    -- Check if RLS is already enabled
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'spatial_ref_sys' 
      AND rowsecurity = true
    ) THEN
      ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Create policy if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'spatial_ref_sys' 
      AND policyname = 'Allow read access for authenticated users'
    ) THEN
      CREATE POLICY "Allow read access for authenticated users" ON public.spatial_ref_sys
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
  END IF;
END $$;

-- Update other functions that may exist with secure search_path

-- Update get_event_memories function if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_event_memories' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    CREATE OR REPLACE FUNCTION public.get_event_memories(p_event_id UUID, p_user_id UUID)
    RETURNS TABLE(
      id UUID,
      type TEXT,
      media_url TEXT,
      thumbnail_url TEXT,
      caption TEXT,
      duration INTEGER,
      is_public BOOLEAN,
      likes_count INTEGER,
      comments_count INTEGER,
      created_at TIMESTAMPTZ,
      user_id UUID,
      username TEXT,
      avatar_url TEXT,
      is_liked BOOLEAN
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $func$
    BEGIN
      RETURN QUERY
      SELECT 
        em.id,
        em.type,
        em.media_url,
        em.thumbnail_url,
        em.caption,
        em.duration,
        em.is_public,
        em.likes_count,
        em.comments_count,
        em.created_at,
        em.user_id,
        p.username,
        p.avatar_url,
        EXISTS(
          SELECT 1 FROM memory_likes ml 
          WHERE ml.memory_id = em.id 
          AND ml.user_id = p_user_id
        ) as is_liked
      FROM event_memories em
      JOIN profiles p ON em.user_id = p.id
      WHERE em.event_id = p_event_id
      ORDER BY em.created_at DESC;
    END;
    $func$;
  END IF;
END $$;

-- Update should_send_notification function if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'should_send_notification' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    CREATE OR REPLACE FUNCTION public.should_send_notification(p_user_id UUID, p_type TEXT)
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $func$
    DECLARE
      user_settings JSONB;
      notification_settings JSONB;
    BEGIN
      -- Get user settings
      SELECT settings INTO user_settings
      FROM profiles
      WHERE id = p_user_id;
      
      -- If no settings exist, default to sending notifications
      IF user_settings IS NULL THEN
        RETURN true;
      END IF;
      
      -- Get notification settings
      notification_settings := user_settings->'notifications';
      
      -- If no notification settings exist, default to sending
      IF notification_settings IS NULL THEN
        RETURN true;
      END IF;
      
      -- Check specific notification type
      -- If the type setting doesn't exist, default to true
      RETURN COALESCE((notification_settings->>p_type)::boolean, true);
    END;
    $func$;
  END IF;
END $$;

-- Update can_invite_to_event function if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'can_invite_to_event' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    CREATE OR REPLACE FUNCTION public.can_invite_to_event(p_inviter_id UUID, p_invitee_id UUID)
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $func$
    DECLARE
      are_friends BOOLEAN;
      invitee_settings JSONB;
      privacy_settings JSONB;
    BEGIN
      -- Check if they are friends
      SELECT EXISTS(
        SELECT 1 FROM friendships
        WHERE status = 'accepted'
        AND (
          (user_id = p_inviter_id AND friend_id = p_invitee_id) OR
          (user_id = p_invitee_id AND friend_id = p_inviter_id)
        )
      ) INTO are_friends;
      
      -- Get invitee settings
      SELECT settings INTO invitee_settings
      FROM profiles
      WHERE id = p_invitee_id;
      
      -- If no settings, default to friends only
      IF invitee_settings IS NULL THEN
        RETURN are_friends;
      END IF;
      
      -- Get privacy settings
      privacy_settings := invitee_settings->'privacy';
      
      -- Check who can invite
      IF privacy_settings IS NOT NULL AND privacy_settings->>'who_can_invite' = 'nobody' THEN
        RETURN false;
      ELSIF privacy_settings IS NULL OR privacy_settings->>'who_can_invite' = 'friends' THEN
        RETURN are_friends;
      ELSE
        -- Default to friends only if setting is not recognized
        RETURN are_friends;
      END IF;
    END;
    $func$;
  END IF;
END $$;

-- Update complete_onboarding function if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'complete_onboarding' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    CREATE OR REPLACE FUNCTION public.complete_onboarding()
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $func$
    BEGIN
      UPDATE profiles
      SET onboarding_complete = true,
          is_profile_complete = true,
          updated_at = NOW()
      WHERE id = auth.uid();
    END;
    $func$;
  END IF;
END $$;

-- Add comments about extensions
COMMENT ON EXTENSION btree_gist IS 'Extension should be moved to a dedicated schema for security. Currently in public schema.';
COMMENT ON EXTENSION pg_trgm IS 'Extension should be moved to a dedicated schema for security. Currently in public schema.';
COMMENT ON EXTENSION postgis IS 'Extension should be moved to a dedicated schema for security. Currently in public schema.';

-- Note about leaked password protection
COMMENT ON SCHEMA public IS 'Main application schema. Note: Leaked password protection should be enabled in Supabase Auth settings via the dashboard.';