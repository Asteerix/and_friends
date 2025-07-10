-- ============================================
-- SECURITY PATCHES FOR AND FRIENDS APPLICATION
-- ============================================
-- This migration adds critical security improvements
-- Run this AFTER all existing migrations

-- ============================================
-- 1. INPUT VALIDATION CONSTRAINTS
-- ============================================

-- Username validation
ALTER TABLE profiles 
ADD CONSTRAINT check_username_format 
CHECK (username IS NULL OR username ~ '^[a-zA-Z0-9_]{3,50}$');

-- Email validation (basic format)
ALTER TABLE profiles 
ADD CONSTRAINT check_email_format 
CHECK (email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Phone validation (E.164 format)
ALTER TABLE profiles 
ADD CONSTRAINT check_phone_format 
CHECK (phone IS NULL OR phone ~ '^\+?[1-9]\d{1,14}$');

-- Array size limits
ALTER TABLE profiles 
ADD CONSTRAINT check_hobbies_size 
CHECK (hobbies IS NULL OR array_length(hobbies, 1) <= 10);

ALTER TABLE profiles 
ADD CONSTRAINT check_interests_size 
CHECK (interests IS NULL OR array_length(interests, 1) <= 10);

ALTER TABLE events 
ADD CONSTRAINT check_tags_size 
CHECK (tags IS NULL OR array_length(tags, 1) <= 10);

-- Text length constraints
ALTER TABLE profiles 
ADD CONSTRAINT check_bio_length 
CHECK (bio IS NULL OR char_length(bio) <= 500);

ALTER TABLE profiles 
ADD CONSTRAINT check_full_name_length 
CHECK (full_name IS NULL OR char_length(full_name) <= 255);

ALTER TABLE events 
ADD CONSTRAINT check_title_length 
CHECK (char_length(title) BETWEEN 1 AND 255);

ALTER TABLE events 
ADD CONSTRAINT check_description_length 
CHECK (description IS NULL OR char_length(description) <= 5000);

ALTER TABLE messages 
ADD CONSTRAINT check_text_length 
CHECK (text IS NULL OR char_length(text) <= 10000);

-- URL validation
ALTER TABLE profiles 
ADD CONSTRAINT check_avatar_url_format 
CHECK (avatar_url IS NULL OR avatar_url ~ '^https?://');

ALTER TABLE profiles 
ADD CONSTRAINT check_cover_url_format 
CHECK (cover_url IS NULL OR cover_url ~ '^https?://');

-- ============================================
-- 2. UNIQUE CONSTRAINTS
-- ============================================

-- Ensure username uniqueness (case-insensitive)
CREATE UNIQUE INDEX idx_profiles_username_unique 
ON profiles(LOWER(username)) 
WHERE username IS NOT NULL;

-- Prevent duplicate friendships
CREATE UNIQUE INDEX idx_friendships_unique_pair 
ON friendships(LEAST(user_id, friend_id), GREATEST(user_id, friend_id));

-- One rating per user per event
ALTER TABLE ratings 
ADD CONSTRAINT unique_rating_per_user_event 
UNIQUE (rater_id, event_id);

-- ============================================
-- 3. SELF-REFERENCE PREVENTION
-- ============================================

-- Prevent self-friendship
ALTER TABLE friendships 
ADD CONSTRAINT check_no_self_friendship 
CHECK (user_id != friend_id);

-- Prevent self-rating
ALTER TABLE ratings 
ADD CONSTRAINT check_no_self_rating 
CHECK (rater_id != rated_user_id);

-- Prevent self-blocking
ALTER TABLE user_blocks 
ADD CONSTRAINT check_no_self_block 
CHECK (blocker_id != blocked_id);

-- ============================================
-- 4. RATE LIMITING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, action, window_start)
);

-- Index for efficient cleanup
CREATE INDEX idx_rate_limits_window_start 
ON rate_limits(window_start);

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_action TEXT,
  p_max_attempts INTEGER,
  p_window_minutes INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  v_window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  
  SELECT COALESCE(SUM(count), 0) INTO v_count
  FROM rate_limits
  WHERE user_id = p_user_id
    AND action = p_action
    AND window_start >= v_window_start;
  
  IF v_count >= p_max_attempts THEN
    RETURN FALSE;
  END IF;
  
  INSERT INTO rate_limits (user_id, action, count, window_start)
  VALUES (p_user_id, p_action, 1, NOW())
  ON CONFLICT (user_id, action, window_start) 
  DO UPDATE SET count = rate_limits.count + 1;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. AUDIT LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);

-- ============================================
-- 6. SENSITIVE DATA PROTECTION
-- ============================================

-- Create view for public profile data (hides sensitive info)
CREATE OR REPLACE VIEW public_profiles AS
SELECT 
  id,
  username,
  full_name,
  display_name,
  avatar_url,
  cover_url,
  bio,
  CASE 
    WHEN hide_birth_date THEN NULL 
    ELSE birth_date 
  END as birth_date,
  CASE 
    WHEN hide_birth_date AND birth_date IS NOT NULL THEN 
      EXTRACT(YEAR FROM AGE(birth_date))::TEXT || ' years old'
    WHEN NOT hide_birth_date AND birth_date IS NOT NULL THEN 
      birth_date::TEXT
    ELSE NULL
  END as age_display,
  hobbies,
  interests,
  path,
  location,
  jam_title,
  jam_artist,
  jam_cover_url,
  selected_restaurant_name,
  selected_restaurant_address,
  created_at
FROM profiles;

-- Grant access to view
GRANT SELECT ON public_profiles TO authenticated;

-- ============================================
-- 7. MISSING RLS POLICIES
-- ============================================

-- Enable RLS on tables that don't have it
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Ratings policies
CREATE POLICY "Users can view ratings for events they can see"
  ON ratings FOR SELECT
  USING (
    auth.uid() = rater_id OR
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = ratings.event_id 
      AND (NOT events.is_private OR events.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can create ratings for events they participated in"
  ON ratings FOR INSERT
  WITH CHECK (
    auth.uid() = rater_id AND
    EXISTS (
      SELECT 1 FROM event_participants
      WHERE event_participants.event_id = ratings.event_id
      AND event_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own ratings"
  ON ratings FOR UPDATE
  USING (auth.uid() = rater_id);

-- User blocks policies
CREATE POLICY "Users can view their blocks"
  ON user_blocks FOR SELECT
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can create blocks"
  ON user_blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can remove their blocks"
  ON user_blocks FOR DELETE
  USING (auth.uid() = blocker_id);

-- Activities policies
CREATE POLICY "Users can view activities from non-blocked users"
  ON activities FOR SELECT
  USING (
    NOT EXISTS (
      SELECT 1 FROM user_blocks
      WHERE user_blocks.blocker_id = auth.uid()
      AND user_blocks.blocked_id = activities.user_id
    )
  );

CREATE POLICY "System can create activities"
  ON activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Rate limits policies
CREATE POLICY "Users can view their own rate limits"
  ON rate_limits FOR SELECT
  USING (auth.uid() = user_id);

-- Audit log policies (admin only)
CREATE POLICY "Only admins can view audit logs"
  ON audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.settings->>'is_admin' = 'true'
    )
  );

-- ============================================
-- 8. BLOCKING LOGIC ENHANCEMENT
-- ============================================

-- Function to check if user is blocked
CREATE OR REPLACE FUNCTION is_blocked(blocker UUID, blocked UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_blocks
    WHERE blocker_id = blocker AND blocked_id = blocked
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update message policy to respect blocks
DROP POLICY IF EXISTS "Users can view messages in their chats" ON messages;
CREATE POLICY "Users can view messages in their chats"
  ON messages FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM chat_participants 
      WHERE chat_id = messages.chat_id
    ) AND
    NOT is_blocked(auth.uid(), author_id)
  );

-- ============================================
-- 9. DATA RETENTION
-- ============================================

-- Add soft delete columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Update RLS policies to hide soft-deleted records
CREATE OR REPLACE VIEW active_profiles AS
SELECT * FROM profiles WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_events AS
SELECT * FROM events WHERE deleted_at IS NULL;

-- ============================================
-- 10. PERFORMANCE INDEXES
-- ============================================

-- Missing unique index on username
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username 
ON profiles(username) WHERE username IS NOT NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_messages_created_at 
ON messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stories_expires_at 
ON stories(expires_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON notifications(user_id, read);

CREATE INDEX IF NOT EXISTS idx_events_date_private 
ON events(date DESC, is_private);

-- ============================================
-- 11. CLEANUP FUNCTIONS
-- ============================================

-- Auto-delete expired stories
CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS void AS $$
BEGIN
  DELETE FROM stories 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-cleanup old rate limit entries
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits 
  WHERE window_start < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 12. TRIGGERS FOR AUDIT LOGGING
-- ============================================

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit triggers to sensitive tables
CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_messages
  AFTER INSERT OR UPDATE OR DELETE ON messages
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_user_blocks
  AFTER INSERT OR UPDATE OR DELETE ON user_blocks
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- ============================================
-- 13. GRANT PERMISSIONS
-- ============================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT ON rate_limits TO authenticated;
GRANT SELECT ON audit_log TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION is_blocked TO authenticated;

-- ============================================
-- 14. SCHEDULED CLEANUP (Note: Set up in Supabase Dashboard)
-- ============================================

-- Run these functions periodically:
-- SELECT cleanup_expired_stories();
-- SELECT cleanup_old_rate_limits();

-- ============================================
-- END OF SECURITY PATCHES
-- ============================================