-- Fix search_path for functions to prevent SQL injection risks

-- Fix get_friend_status function
CREATE OR REPLACE FUNCTION public.get_friend_status(p_user_id uuid, p_friend_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status
  FROM friendships
  WHERE (user_id = p_user_id AND friend_id = p_friend_id)
     OR (user_id = p_friend_id AND friend_id = p_user_id)
  LIMIT 1;
  
  RETURN COALESCE(v_status, 'none');
END;
$$;

-- Fix sync_event_created_by function
CREATE OR REPLACE FUNCTION public.sync_event_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    UPDATE events SET created_by = NEW.created_by WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix get_friends function
CREATE OR REPLACE FUNCTION public.get_friends(p_user_id uuid)
RETURNS TABLE(friend_id uuid, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN f.user_id = p_user_id THEN f.friend_id
      ELSE f.user_id
    END AS friend_id,
    f.status
  FROM friendships f
  WHERE (f.user_id = p_user_id OR f.friend_id = p_user_id)
    AND f.status = 'accepted';
END;
$$;

-- Fix get_event_messages function
CREATE OR REPLACE FUNCTION public.get_event_messages(p_event_id uuid)
RETURNS TABLE(message_id uuid, content text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN QUERY
  SELECT id, content, created_at
  FROM messages
  WHERE event_id = p_event_id
  ORDER BY created_at DESC;
END;
$$;

-- Fix get_friend_requests function
CREATE OR REPLACE FUNCTION public.get_friend_requests(p_user_id uuid)
RETURNS TABLE(request_id uuid, requester_id uuid, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN QUERY
  SELECT id, user_id, created_at
  FROM friendships
  WHERE friend_id = p_user_id
    AND status = 'pending';
END;
$$;

-- Fix search_users function
CREATE OR REPLACE FUNCTION public.search_users(search_query text)
RETURNS TABLE(user_id uuid, username text, full_name text, avatar_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN QUERY
  SELECT id, username, full_name, avatar_url
  FROM profiles
  WHERE username ILIKE '%' || search_query || '%'
     OR full_name ILIKE '%' || search_query || '%'
  LIMIT 20;
END;
$$;

-- Create schemas for extensions if they don't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move extensions to extensions schema
ALTER EXTENSION btree_gist SET SCHEMA extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;
ALTER EXTENSION postgis SET SCHEMA extensions;

-- Update search_path to include extensions schema
ALTER DATABASE postgres SET search_path TO public, extensions;

-- Note: The spatial_ref_sys table is a PostGIS system table and should not have RLS enabled.
-- It's safe to leave it without RLS as it only contains reference data.

-- Enable leaked password protection in Supabase Auth settings
-- This needs to be done through the Supabase dashboard:
-- 1. Go to Authentication > Providers
-- 2. Enable "Leaked password protection"
-- This will check passwords against HaveIBeenPwned.org