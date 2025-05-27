-- &Friends Database Functions and Triggers
-- Helper functions and automated processes

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS trigger AS $$
DECLARE
  extracted_name TEXT;
BEGIN
  -- Extract name from email if not provided
  extracted_name := SPLIT_PART(NEW.email, '@', 1);
  
  -- Insert user profile
  INSERT INTO public.users (id, handle, full_name, created_at)
  VALUES (
    NEW.id,
    LOWER(REPLACE(extracted_name, '.', '_')),
    extracted_name,
    NEW.created_at
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new auth users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update follower counts
CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.users SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    UPDATE public.users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.users SET followers_count = followers_count - 1 WHERE id = OLD.following_id;
    UPDATE public.users SET following_count = following_count - 1 WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for follows table
CREATE TRIGGER update_follow_counts
  AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION update_follower_counts();

-- Function to update event attendee count
CREATE OR REPLACE FUNCTION update_event_attendee_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.status = 'going' THEN
      UPDATE public.events 
      SET current_attendees = (
        SELECT COUNT(*) FROM public.event_attendees 
        WHERE event_id = NEW.event_id AND status = 'going'
      )
      WHERE id = NEW.event_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.events 
    SET current_attendees = (
      SELECT COUNT(*) FROM public.event_attendees 
      WHERE event_id = OLD.event_id AND status = 'going'
    )
    WHERE id = OLD.event_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for event attendees
CREATE TRIGGER update_attendee_count
  AFTER INSERT OR UPDATE OR DELETE ON public.event_attendees
  FOR EACH ROW EXECUTE FUNCTION update_event_attendee_count();

-- Function to update conversation participant count
CREATE OR REPLACE FUNCTION update_participant_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.conversations 
    SET participant_count = participant_count + 1 
    WHERE id = NEW.conversation_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.conversations 
    SET participant_count = participant_count - 1 
    WHERE id = OLD.conversation_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for conversation participants
CREATE TRIGGER update_conversation_participants
  AFTER INSERT OR DELETE ON public.conversation_participants
  FOR EACH ROW EXECUTE FUNCTION update_participant_count();

-- Function to update last message timestamp
CREATE OR REPLACE FUNCTION update_last_message_time()
RETURNS trigger AS $$
BEGIN
  UPDATE public.conversations 
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new messages
CREATE TRIGGER update_conversation_last_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION update_last_message_time();

-- Function to create event conversation
CREATE OR REPLACE FUNCTION create_event_conversation()
RETURNS trigger AS $$
BEGIN
  -- Create conversation for the event
  INSERT INTO public.conversations (type, name, event_id, created_by)
  VALUES ('event', NEW.title, NEW.id, NEW.organizer_id);
  
  -- Add organizer as owner
  INSERT INTO public.conversation_participants (conversation_id, user_id, role)
  SELECT id, NEW.organizer_id, 'owner'
  FROM public.conversations
  WHERE event_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new events
CREATE TRIGGER create_conversation_on_event
  AFTER INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION create_event_conversation();

-- Function to send notification
CREATE OR REPLACE FUNCTION send_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (p_user_id, p_type, p_title, p_body, p_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to handle RSVP notifications
CREATE OR REPLACE FUNCTION handle_rsvp_notification()
RETURNS trigger AS $$
DECLARE
  event_title TEXT;
  attendee_name TEXT;
BEGIN
  IF NEW.status = 'going' AND (OLD IS NULL OR OLD.status != 'going') THEN
    -- Get event details
    SELECT title INTO event_title FROM public.events WHERE id = NEW.event_id;
    SELECT full_name INTO attendee_name FROM public.users WHERE id = NEW.user_id;
    
    -- Notify organizer
    PERFORM send_notification(
      (SELECT organizer_id FROM public.events WHERE id = NEW.event_id),
      'rsvp',
      'New RSVP!',
      attendee_name || ' is going to ' || event_title,
      jsonb_build_object('event_id', NEW.event_id, 'user_id', NEW.user_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for RSVP notifications
CREATE TRIGGER send_rsvp_notifications
  AFTER INSERT OR UPDATE ON public.event_attendees
  FOR EACH ROW EXECUTE FUNCTION handle_rsvp_notification();

-- Function to check handle availability
CREATE OR REPLACE FUNCTION check_handle_availability(p_handle TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.users WHERE handle = LOWER(p_handle)
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get nearby events
CREATE OR REPLACE FUNCTION get_nearby_events(
  p_lat FLOAT,
  p_lng FLOAT,
  p_radius_km INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  distance_km FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.start_time,
    ST_Distance(
      e.location::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) / 1000 AS distance_km
  FROM public.events e
  WHERE 
    e.status = 'published'
    AND e.start_time > NOW()
    AND ST_DWithin(
      e.location::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_km * 1000
    )
  ORDER BY distance_km, e.start_time;
END;
$$ LANGUAGE plpgsql;

-- Function to get event recommendations
CREATE OR REPLACE FUNCTION get_event_recommendations(p_user_id UUID, p_limit INT DEFAULT 10)
RETURNS TABLE (
  id UUID,
  title TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_interests AS (
    SELECT unnest(interests) AS interest FROM public.users WHERE id = p_user_id
  ),
  user_friends AS (
    SELECT following_id AS friend_id FROM public.follows WHERE follower_id = p_user_id
  ),
  event_scores AS (
    SELECT 
      e.id,
      e.title,
      e.start_time,
      -- Score based on interests match
      (SELECT COUNT(*) FROM user_interests ui WHERE ui.interest = ANY(e.tags)) * 10 +
      -- Score based on friends attending
      (SELECT COUNT(*) FROM public.event_attendees ea 
       JOIN user_friends uf ON uf.friend_id = ea.user_id 
       WHERE ea.event_id = e.id AND ea.status = 'going') * 5 +
      -- Score based on organizer is friend
      CASE WHEN e.organizer_id IN (SELECT friend_id FROM user_friends) THEN 15 ELSE 0 END +
      -- Recency boost
      CASE 
        WHEN e.start_time < NOW() + INTERVAL '7 days' THEN 5
        WHEN e.start_time < NOW() + INTERVAL '14 days' THEN 3
        ELSE 1
      END AS score
    FROM public.events e
    WHERE 
      e.status = 'published'
      AND e.start_time > NOW()
      AND e.privacy IN ('public', 'friends')
      AND NOT EXISTS (
        SELECT 1 FROM public.event_attendees 
        WHERE event_id = e.id AND user_id = p_user_id
      )
  )
  SELECT id, title, start_time, score::FLOAT
  FROM event_scores
  WHERE score > 0
  ORDER BY score DESC, start_time
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to handle blocks cascade
CREATE OR REPLACE FUNCTION handle_block_cascade()
RETURNS trigger AS $$
BEGIN
  -- Remove follows in both directions
  DELETE FROM public.follows 
  WHERE (follower_id = NEW.blocker_id AND following_id = NEW.blocked_id)
     OR (follower_id = NEW.blocked_id AND following_id = NEW.blocker_id);
  
  -- Remove from shared conversations
  DELETE FROM public.conversation_participants
  WHERE user_id = NEW.blocked_id
    AND conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = NEW.blocker_id
    )
    AND conversation_id IN (
      SELECT id FROM public.conversations WHERE type = 'direct'
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for blocks
CREATE TRIGGER handle_block_effects
  AFTER INSERT ON public.blocks
  FOR EACH ROW EXECUTE FUNCTION handle_block_cascade();