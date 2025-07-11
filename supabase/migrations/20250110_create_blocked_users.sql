-- Create blocked_users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- Create indexes
CREATE INDEX idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON blocked_users(blocked_id);

-- Enable RLS
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- Users can create their own blocks
CREATE POLICY "Users can create blocks" ON blocked_users
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

-- Users can view their own blocks
CREATE POLICY "Users can view their blocks" ON blocked_users
  FOR SELECT USING (auth.uid() = blocker_id);

-- Users can delete their own blocks
CREATE POLICY "Users can delete their blocks" ON blocked_users
  FOR DELETE USING (auth.uid() = blocker_id);

-- Function to check if a user is blocked
CREATE OR REPLACE FUNCTION is_blocked_by(p_blocker_id UUID, p_blocked_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM blocked_users
    WHERE blocker_id = p_blocker_id
      AND blocked_id = p_blocked_id
  );
$$ LANGUAGE SQL STABLE;