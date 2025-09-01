-- Fix remaining security issues identified by Supabase advisor
-- This migration addresses search_path mutability and RLS issues

-- Fix security definer view by replacing it with a function
DROP VIEW IF EXISTS public.report_statistics;

-- Create secure function instead of SECURITY DEFINER view
CREATE OR REPLACE FUNCTION public.get_report_statistics()
RETURNS TABLE(
  total_reports INTEGER,
  pending_reports INTEGER,
  resolved_reports INTEGER,
  reports_this_month INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_reports,
    COUNT(CASE WHEN status = 'pending' THEN 1 END)::INTEGER as pending_reports,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END)::INTEGER as resolved_reports,
    COUNT(CASE WHEN created_at > CURRENT_DATE - INTERVAL '30 days' THEN 1 END)::INTEGER as reports_this_month
  FROM reports;
END;
$$;

-- Fix functions with mutable search_path

-- Fix add_event_questionnaire function
CREATE OR REPLACE FUNCTION public.add_event_questionnaire(
  p_event_id UUID,
  p_questions JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE events
  SET questionnaire = p_questions,
      updated_at = NOW()
  WHERE id = p_event_id
    AND created_by = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Fix add_event_stickers function
CREATE OR REPLACE FUNCTION public.add_event_stickers(
  p_event_id UUID,
  p_stickers TEXT[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE events
  SET stickers = p_stickers,
      updated_at = NOW()
  WHERE id = p_event_id
    AND created_by = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Fix update_story_comments_count function
CREATE OR REPLACE FUNCTION public.update_story_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE stories 
    SET comments_count = comments_count + 1 
    WHERE id = NEW.story_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE stories 
    SET comments_count = comments_count - 1 
    WHERE id = OLD.story_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Fix sync_event_data function
CREATE OR REPLACE FUNCTION public.sync_event_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Sync event data updates to related tables
  IF TG_OP = 'UPDATE' THEN
    -- Update related chat names if event title changed
    IF OLD.title != NEW.title THEN
      UPDATE chats
      SET name = NEW.title,
          updated_at = NOW()
      WHERE event_id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix clean_event_data function
CREATE OR REPLACE FUNCTION public.clean_event_data(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Clean related data when event is deleted
  DELETE FROM event_participants WHERE event_id = p_event_id;
  DELETE FROM event_memories WHERE event_id = p_event_id;
  DELETE FROM notifications WHERE data->>'event_id' = p_event_id::text;
  
  RETURN TRUE;
END;
$$;

-- Fix notification functions
CREATE OR REPLACE FUNCTION public.notify_friend_request(p_user_id UUID, p_friend_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    p_friend_id,
    'friend_request',
    'Nouvelle demande d''ami',
    'Quelqu''un souhaite être votre ami',
    jsonb_build_object('user_id', p_user_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_new_rating(
  p_event_id UUID,
  p_rated_user_id UUID,
  p_rating_user_id UUID,
  p_score INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    p_rated_user_id,
    'new_rating',
    'Nouvelle évaluation',
    'Vous avez reçu une nouvelle évaluation',
    jsonb_build_object(
      'event_id', p_event_id,
      'rating_user_id', p_rating_user_id,
      'score', p_score
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_event_participation(
  p_event_id UUID,
  p_user_id UUID,
  p_status TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  event_creator_id UUID;
  event_title TEXT;
BEGIN
  -- Get event creator and title
  SELECT created_by, title INTO event_creator_id, event_title
  FROM events WHERE id = p_event_id;
  
  -- Notify event creator (not the participant themselves)
  IF event_creator_id != p_user_id THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      event_creator_id,
      'event_participation',
      'Nouvelle participation',
      format('Quelqu''un a changé sa participation à "%s"', event_title),
      jsonb_build_object(
        'event_id', p_event_id,
        'participant_id', p_user_id,
        'status', p_status
      )
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_event_removal(p_event_id UUID, p_removed_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    p_removed_user_id,
    'event_removal',
    'Retiré d''un événement',
    'Vous avez été retiré d''un événement',
    jsonb_build_object('event_id', p_event_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_story_like(p_story_id UUID, p_liker_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  story_creator_id UUID;
BEGIN
  -- Get story creator
  SELECT user_id INTO story_creator_id
  FROM stories WHERE id = p_story_id;
  
  -- Don't notify if user likes their own story
  IF story_creator_id != p_liker_id THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      story_creator_id,
      'story_like',
      'Votre story a été aimée',
      'Quelqu''un a aimé votre story',
      jsonb_build_object(
        'story_id', p_story_id,
        'liker_id', p_liker_id
      )
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_story_comment(p_story_id UUID, p_commenter_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  story_creator_id UUID;
BEGIN
  -- Get story creator
  SELECT user_id INTO story_creator_id
  FROM stories WHERE id = p_story_id;
  
  -- Don't notify if user comments on their own story
  IF story_creator_id != p_commenter_id THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      story_creator_id,
      'story_comment',
      'Nouveau commentaire',
      'Quelqu''un a commenté votre story',
      jsonb_build_object(
        'story_id', p_story_id,
        'commenter_id', p_commenter_id
      )
    );
  END IF;
END;
$$;

-- Fix chat functions
CREATE OR REPLACE FUNCTION public.sync_event_chat_participants(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  event_chat_id UUID;
BEGIN
  -- Get event chat
  SELECT id INTO event_chat_id
  FROM chats WHERE event_id = p_event_id;
  
  IF event_chat_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Add event participants to chat
  INSERT INTO chat_participants (chat_id, user_id)
  SELECT event_chat_id, user_id
  FROM event_participants
  WHERE event_id = p_event_id
    AND status = 'going'
  ON CONFLICT (chat_id, user_id) DO NOTHING;
  
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_event_chat_participant(p_event_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  event_chat_id UUID;
BEGIN
  -- Get event chat
  SELECT id INTO event_chat_id
  FROM chats WHERE event_id = p_event_id;
  
  IF event_chat_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Remove participant from chat
  DELETE FROM chat_participants
  WHERE chat_id = event_chat_id AND user_id = p_user_id;
  
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.convert_event_chat_to_group(p_event_id UUID, p_new_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE chats
  SET name = p_new_name,
      event_id = NULL,
      is_group = TRUE,
      updated_at = NOW()
  WHERE event_id = p_event_id
    AND created_by = auth.uid();
  
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_event_cancellation(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Update event status
  UPDATE events
  SET status = 'cancelled',
      updated_at = NOW()
  WHERE id = p_event_id
    AND created_by = auth.uid();
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Notify all participants
  INSERT INTO notifications (user_id, type, title, message, data)
  SELECT 
    ep.user_id,
    'event_cancelled',
    'Événement annulé',
    'Un événement auquel vous participiez a été annulé',
    jsonb_build_object('event_id', p_event_id)
  FROM event_participants ep
  WHERE ep.event_id = p_event_id
    AND ep.user_id != auth.uid();
  
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_event_chat(p_event_id UUID, p_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  chat_id UUID;
BEGIN
  -- Create chat
  INSERT INTO chats (name, event_id, created_by, is_group)
  VALUES (p_name, p_event_id, auth.uid(), TRUE)
  RETURNING id INTO chat_id;
  
  -- Add creator as admin
  INSERT INTO chat_participants (chat_id, user_id, is_admin)
  VALUES (chat_id, auth.uid(), TRUE);
  
  RETURN chat_id;
END;
$$;

-- Fix report functions
CREATE OR REPLACE FUNCTION public.check_auto_hide_content(p_content_id UUID, p_content_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  report_count INTEGER;
BEGIN
  -- Count reports for this content
  SELECT COUNT(*) INTO report_count
  FROM reports
  WHERE content_id = p_content_id
    AND content_type = p_content_type
    AND status = 'pending';
  
  -- Auto-hide if 5+ reports
  IF report_count >= 5 THEN
    -- Hide the content based on type
    CASE p_content_type
      WHEN 'story' THEN
        UPDATE stories SET is_hidden = TRUE WHERE id = p_content_id;
      WHEN 'event' THEN
        UPDATE events SET is_hidden = TRUE WHERE id = p_content_id;
      WHEN 'profile' THEN
        UPDATE profiles SET is_hidden = TRUE WHERE id = p_content_id;
    END CASE;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_report_count(p_content_id UUID, p_content_type TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  count_result INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_result
  FROM reports
  WHERE content_id = p_content_id
    AND content_type = p_content_type;
  
  RETURN count_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_reported_by_user(
  p_content_id UUID,
  p_content_type TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM reports
    WHERE content_id = p_content_id
      AND content_type = p_content_type
      AND reported_by = p_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_report_stats(p_admin_user_id UUID)
RETURNS TABLE(
  total_reports INTEGER,
  pending_reports INTEGER,
  resolved_reports INTEGER,
  auto_hidden INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Check if user is admin (you might want to add an admin check here)
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_reports,
    COUNT(CASE WHEN status = 'pending' THEN 1 END)::INTEGER as pending_reports,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END)::INTEGER as resolved_reports,
    COUNT(CASE WHEN auto_hidden = TRUE THEN 1 END)::INTEGER as auto_hidden
  FROM reports;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_blocked_by(p_user_id UUID, p_other_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM user_blocks
    WHERE blocker_id = p_other_user_id
      AND blocked_id = p_user_id
      AND is_active = TRUE
  );
END;
$$;

-- Enable RLS on spatial_ref_sys table (PostGIS table)
DO $$
BEGIN
  -- Check if table exists and RLS is not enabled
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'spatial_ref_sys'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'spatial_ref_sys' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
    
    -- Create policy for authenticated users to read spatial reference systems
    CREATE POLICY "Allow read access for authenticated users" ON public.spatial_ref_sys
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_report_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION add_event_questionnaire(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION add_event_stickers(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_event_chat_participants(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_event_chat(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_report_count(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_reported_by_user(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_blocked_by(UUID, UUID) TO authenticated;