-- Create ratings table for user ratings
CREATE TABLE IF NOT EXISTS ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(from_user_id, to_user_id, event_id),
    CHECK (from_user_id != to_user_id)
);

-- Create indexes for performance
CREATE INDEX idx_ratings_from_user ON ratings(from_user_id);
CREATE INDEX idx_ratings_to_user ON ratings(to_user_id);
CREATE INDEX idx_ratings_event ON ratings(event_id);
CREATE INDEX idx_ratings_created ON ratings(created_at DESC);

-- Enable RLS
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- RLS policies for ratings
-- Users can view ratings they gave
CREATE POLICY "Users can view own given ratings" ON ratings
    FOR SELECT USING (auth.uid() = from_user_id);

-- Users can view ratings they received
CREATE POLICY "Users can view own received ratings" ON ratings
    FOR SELECT USING (auth.uid() = to_user_id);

-- Users can view ratings between friends
CREATE POLICY "Users can view friends ratings" ON ratings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM friendships
            WHERE status = 'accepted'
            AND (
                (user_id = auth.uid() AND friend_id IN (from_user_id, to_user_id)) OR
                (friend_id = auth.uid() AND user_id IN (from_user_id, to_user_id))
            )
        )
    );

-- Users can create ratings for other users (not themselves)
CREATE POLICY "Users can create ratings" ON ratings
    FOR INSERT WITH CHECK (
        auth.uid() = from_user_id 
        AND from_user_id != to_user_id
        AND (
            -- Can rate if they were at the same event
            event_id IS NULL OR EXISTS (
                SELECT 1 FROM event_participants ep1
                JOIN event_participants ep2 ON ep1.event_id = ep2.event_id
                WHERE ep1.user_id = from_user_id 
                AND ep2.user_id = to_user_id
                AND ep1.event_id = ratings.event_id
                AND ep1.status = 'going'
                AND ep2.status = 'going'
            )
        )
    );

-- Users can update their own ratings
CREATE POLICY "Users can update own ratings" ON ratings
    FOR UPDATE USING (auth.uid() = from_user_id)
    WITH CHECK (auth.uid() = from_user_id);

-- Users can delete their own ratings
CREATE POLICY "Users can delete own ratings" ON ratings
    FOR DELETE USING (auth.uid() = from_user_id);

-- Function to get user rating stats
CREATE OR REPLACE FUNCTION get_user_rating_stats(user_id UUID)
RETURNS TABLE (
    average_rating NUMERIC,
    total_ratings INT,
    rating_distribution JSONB,
    recent_ratings JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROUND(AVG(r.rating)::NUMERIC, 1) as average_rating,
        COUNT(*)::INT as total_ratings,
        jsonb_object_agg(
            r.rating::TEXT, 
            COALESCE(rating_counts.count, 0)
        ) FILTER (WHERE r.rating IS NOT NULL) as rating_distribution,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', r.id,
                    'rating', r.rating,
                    'comment', r.comment,
                    'created_at', r.created_at,
                    'from_user', jsonb_build_object(
                        'id', p.id,
                        'username', p.username,
                        'full_name', p.full_name,
                        'avatar_url', p.avatar_url
                    ),
                    'event', CASE 
                        WHEN e.id IS NOT NULL THEN jsonb_build_object(
                            'id', e.id,
                            'title', e.title
                        )
                        ELSE NULL
                    END
                ) ORDER BY r.created_at DESC
            ) FILTER (WHERE r.id IS NOT NULL),
            '[]'::jsonb
        ) as recent_ratings
    FROM ratings r
    LEFT JOIN profiles p ON p.id = r.from_user_id
    LEFT JOIN events e ON e.id = r.event_id
    LEFT JOIN LATERAL (
        SELECT rating, COUNT(*) as count
        FROM ratings
        WHERE to_user_id = $1
        GROUP BY rating
    ) rating_counts ON rating_counts.rating = r.rating
    WHERE r.to_user_id = $1
    GROUP BY r.to_user_id
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get ratings between users
CREATE OR REPLACE FUNCTION get_ratings_between_users(user1_id UUID, user2_id UUID)
RETURNS TABLE (
    id UUID,
    from_user_id UUID,
    to_user_id UUID,
    event_id UUID,
    rating INT,
    comment TEXT,
    created_at TIMESTAMPTZ,
    from_user JSONB,
    to_user JSONB,
    event JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.from_user_id,
        r.to_user_id,
        r.event_id,
        r.rating,
        r.comment,
        r.created_at,
        jsonb_build_object(
            'id', from_p.id,
            'username', from_p.username,
            'full_name', from_p.full_name,
            'avatar_url', from_p.avatar_url
        ) as from_user,
        jsonb_build_object(
            'id', to_p.id,
            'username', to_p.username,
            'full_name', to_p.full_name,
            'avatar_url', to_p.avatar_url
        ) as to_user,
        CASE 
            WHEN e.id IS NOT NULL THEN jsonb_build_object(
                'id', e.id,
                'title', e.title,
                'start_date', e.start_date
            )
            ELSE NULL
        END as event
    FROM ratings r
    JOIN profiles from_p ON from_p.id = r.from_user_id
    JOIN profiles to_p ON to_p.id = r.to_user_id
    LEFT JOIN events e ON e.id = r.event_id
    WHERE (r.from_user_id = $1 AND r.to_user_id = $2)
       OR (r.from_user_id = $2 AND r.to_user_id = $1)
    ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get event participant ratings
CREATE OR REPLACE FUNCTION get_event_participant_ratings(event_id UUID)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    full_name TEXT,
    avatar_url TEXT,
    average_rating NUMERIC,
    total_ratings INT,
    user_rating INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.username,
        p.full_name,
        p.avatar_url,
        ROUND(AVG(r.rating)::NUMERIC, 1) as average_rating,
        COUNT(r.id)::INT as total_ratings,
        ur.rating as user_rating
    FROM event_participants ep
    JOIN profiles p ON p.id = ep.user_id
    LEFT JOIN ratings r ON r.to_user_id = p.id AND r.event_id = $1
    LEFT JOIN ratings ur ON ur.to_user_id = p.id AND ur.from_user_id = auth.uid() AND ur.event_id = $1
    WHERE ep.event_id = $1
    AND ep.status = 'going'
    GROUP BY p.id, p.username, p.full_name, p.avatar_url, ur.rating;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_rating_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_ratings_between_users TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_participant_ratings TO authenticated;