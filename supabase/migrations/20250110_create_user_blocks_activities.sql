-- Create user_blocks table for managing blocked users
CREATE TABLE IF NOT EXISTS user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id),
    CHECK (blocker_id != blocked_id)
);

-- Create indexes for user_blocks
CREATE INDEX idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX idx_user_blocks_blocked ON user_blocks(blocked_id);

-- Create activities table for tracking user activities
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    target_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    target_event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    target_story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    data JSONB,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for activities
CREATE INDEX idx_activities_user ON activities(user_id);
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activities_created ON activities(created_at DESC);
CREATE INDEX idx_activities_target_user ON activities(target_user_id) WHERE target_user_id IS NOT NULL;

-- Enable RLS for user_blocks
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- Enable RLS for activities
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_blocks
-- Users can view their own blocks
CREATE POLICY "Users can view own blocks" ON user_blocks
    FOR SELECT USING (auth.uid() = blocker_id);

-- Users can create their own blocks
CREATE POLICY "Users can create own blocks" ON user_blocks
    FOR INSERT WITH CHECK (auth.uid() = blocker_id);

-- Users can delete their own blocks
CREATE POLICY "Users can delete own blocks" ON user_blocks
    FOR DELETE USING (auth.uid() = blocker_id);

-- RLS policies for activities
-- Users can view their own activities
CREATE POLICY "Users can view own activities" ON activities
    FOR SELECT USING (auth.uid() = user_id);

-- Users can view public activities of their friends
CREATE POLICY "Users can view friends public activities" ON activities
    FOR SELECT USING (
        is_public = true AND
        EXISTS (
            SELECT 1 FROM friendships
            WHERE status = 'accepted'
            AND (
                (user_id = auth.uid() AND friend_id = activities.user_id) OR
                (friend_id = auth.uid() AND user_id = activities.user_id)
            )
        )
    );

-- Users can create their own activities
CREATE POLICY "Users can create own activities" ON activities
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to check if a user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(blocker_id UUID, blocked_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_blocks
        WHERE user_blocks.blocker_id = $1
        AND user_blocks.blocked_id = $2
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the search_users function to exclude blocked users
CREATE OR REPLACE FUNCTION search_users(
    search_query TEXT,
    current_user_id UUID,
    limit_count INT DEFAULT 20,
    offset_count INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    username TEXT,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    last_seen TIMESTAMPTZ,
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
        get_friend_status(current_user_id, p.id) as friend_status,
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
             AND ((f1.user_id = current_user_id AND f2.user_id = p.id) OR
                  (f1.friend_id = current_user_id AND f2.friend_id = p.id))
             AND f1.id != f2.id
            ), 0
        ) as mutual_friends_count
    FROM profiles p
    WHERE p.id != current_user_id
    AND (
        p.username ILIKE '%' || search_query || '%' OR
        p.full_name ILIKE '%' || search_query || '%'
    )
    -- Exclude blocked users (both ways)
    AND NOT EXISTS (
        SELECT 1 FROM user_blocks
        WHERE (blocker_id = current_user_id AND blocked_id = p.id)
        OR (blocker_id = p.id AND blocked_id = current_user_id)
    )
    ORDER BY 
        CASE 
            WHEN p.username ILIKE search_query || '%' THEN 1
            WHEN p.full_name ILIKE search_query || '%' THEN 2
            ELSE 3
        END,
        p.username
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;