-- Add missing columns to profiles table for friend functionality
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

-- Create an index on last_seen for performance
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen DESC);

-- Update the friendships table to include friendship_date
ALTER TABLE friendships
ADD COLUMN IF NOT EXISTS friendship_date TIMESTAMPTZ;

-- Set friendship_date to created_at for existing accepted friendships
UPDATE friendships 
SET friendship_date = COALESCE(responded_at, created_at)
WHERE status = 'accepted' AND friendship_date IS NULL;

-- Create a function to automatically set friendship_date when accepting
CREATE OR REPLACE FUNCTION set_friendship_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    NEW.friendship_date = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for setting friendship_date
DROP TRIGGER IF EXISTS update_friendship_date ON friendships;
CREATE TRIGGER update_friendship_date
  BEFORE UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION set_friendship_date();

-- Function to update last_seen timestamp
CREATE OR REPLACE FUNCTION update_last_seen(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET last_seen = NOW(), is_online = true
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark user as offline (can be called after timeout)
CREATE OR REPLACE FUNCTION mark_user_offline(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET is_online = false
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the get_friends function to include last_seen and friendship_date
CREATE OR REPLACE FUNCTION get_friends(
    p_user_id UUID,
    limit_count INT DEFAULT 50,
    offset_count INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    username TEXT,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    last_seen TIMESTAMPTZ,
    friendship_date TIMESTAMPTZ,
    friend_status TEXT,
    mutual_friends_count INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.full_name,
        p.avatar_url,
        p.bio,
        p.last_seen,
        f.friendship_date,
        'accepted'::TEXT as friend_status,
        COALESCE(
            (SELECT COUNT(*)::INT 
             FROM friendships f1
             JOIN friendships f2 ON (
                 (f1.friend_id = f2.user_id AND f2.friend_id = f1.user_id) OR
                 (f1.friend_id = f2.friend_id AND f1.user_id != f2.user_id) OR
                 (f1.user_id = f2.user_id AND f1.friend_id != f2.friend_id) OR
                 (f1.user_id = f2.friend_id AND f1.friend_id != f2.user_id)
             )
             WHERE f1.status = 'accepted' 
             AND f2.status = 'accepted'
             AND ((f1.user_id = p_user_id AND f2.user_id = p.id) OR
                  (f1.friend_id = p_user_id AND f2.friend_id = p.id))
             AND f1.id != f2.id
            ), 0
        ) as mutual_friends_count
    FROM profiles p
    JOIN friendships f ON (
        (f.user_id = p_user_id AND f.friend_id = p.id) OR
        (f.friend_id = p_user_id AND f.user_id = p.id)
    )
    WHERE f.status = 'accepted'
    ORDER BY p.username
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for friendships table
ALTER PUBLICATION supabase_realtime ADD TABLE friendships;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_last_seen TO authenticated;
GRANT EXECUTE ON FUNCTION mark_user_offline TO authenticated;