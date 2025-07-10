-- Function to create or update a rating
CREATE OR REPLACE FUNCTION upsert_rating(
    p_from_user_id UUID,
    p_to_user_id UUID,
    p_event_id UUID,
    p_rating INT,
    p_comment TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    from_user_id UUID,
    to_user_id UUID,
    event_id UUID,
    rating INT,
    comment TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    is_new BOOLEAN
) AS $$
DECLARE
    v_existing_id UUID;
    v_is_new BOOLEAN := TRUE;
BEGIN
    -- Check if rating already exists
    SELECT r.id INTO v_existing_id
    FROM ratings r
    WHERE r.from_user_id = p_from_user_id
    AND r.to_user_id = p_to_user_id
    AND (r.event_id = p_event_id OR (r.event_id IS NULL AND p_event_id IS NULL));

    IF v_existing_id IS NOT NULL THEN
        -- Update existing rating
        v_is_new := FALSE;
        UPDATE ratings r
        SET 
            rating = p_rating,
            comment = p_comment,
            updated_at = NOW()
        WHERE r.id = v_existing_id;
    ELSE
        -- Insert new rating
        INSERT INTO ratings (from_user_id, to_user_id, event_id, rating, comment)
        VALUES (p_from_user_id, p_to_user_id, p_event_id, p_rating, p_comment)
        RETURNING ratings.id INTO v_existing_id;
    END IF;

    -- Return the rating
    RETURN QUERY
    SELECT 
        r.id,
        r.from_user_id,
        r.to_user_id,
        r.event_id,
        r.rating,
        r.comment,
        r.created_at,
        r.updated_at,
        v_is_new
    FROM ratings r
    WHERE r.id = v_existing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get ratings given by a user
CREATE OR REPLACE FUNCTION get_user_given_ratings(
    p_user_id UUID,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    to_user_id UUID,
    to_user JSONB,
    event_id UUID,
    event JSONB,
    rating INT,
    comment TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.to_user_id,
        jsonb_build_object(
            'id', p.id,
            'username', p.username,
            'full_name', p.full_name,
            'avatar_url', p.avatar_url,
            'bio', p.bio
        ) as to_user,
        r.event_id,
        CASE 
            WHEN e.id IS NOT NULL THEN jsonb_build_object(
                'id', e.id,
                'title', e.title,
                'start_date', e.start_date,
                'image_url', e.image_url
            )
            ELSE NULL
        END as event,
        r.rating,
        r.comment,
        r.created_at,
        r.updated_at
    FROM ratings r
    JOIN profiles p ON p.id = r.to_user_id
    LEFT JOIN events e ON e.id = r.event_id
    WHERE r.from_user_id = p_user_id
    ORDER BY r.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get ratings received by a user
CREATE OR REPLACE FUNCTION get_user_received_ratings(
    p_user_id UUID,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    from_user_id UUID,
    from_user JSONB,
    event_id UUID,
    event JSONB,
    rating INT,
    comment TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.from_user_id,
        jsonb_build_object(
            'id', p.id,
            'username', p.username,
            'full_name', p.full_name,
            'avatar_url', p.avatar_url,
            'bio', p.bio
        ) as from_user,
        r.event_id,
        CASE 
            WHEN e.id IS NOT NULL THEN jsonb_build_object(
                'id', e.id,
                'title', e.title,
                'start_date', e.start_date,
                'image_url', e.image_url
            )
            ELSE NULL
        END as event,
        r.rating,
        r.comment,
        r.created_at
    FROM ratings r
    JOIN profiles p ON p.id = r.from_user_id
    LEFT JOIN events e ON e.id = r.event_id
    WHERE r.to_user_id = p_user_id
    ORDER BY r.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete a rating
CREATE OR REPLACE FUNCTION delete_rating(
    p_rating_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_deleted BOOLEAN := FALSE;
BEGIN
    DELETE FROM ratings
    WHERE id = p_rating_id
    AND from_user_id = auth.uid();
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT > 0;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can rate another user
CREATE OR REPLACE FUNCTION can_rate_user(
    p_from_user_id UUID,
    p_to_user_id UUID,
    p_event_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Cannot rate yourself
    IF p_from_user_id = p_to_user_id THEN
        RETURN FALSE;
    END IF;

    -- If event is specified, check if both users attended
    IF p_event_id IS NOT NULL THEN
        RETURN EXISTS (
            SELECT 1 
            FROM event_participants ep1
            JOIN event_participants ep2 ON ep1.event_id = ep2.event_id
            WHERE ep1.event_id = p_event_id
            AND ep1.user_id = p_from_user_id
            AND ep2.user_id = p_to_user_id
            AND ep1.status = 'going'
            AND ep2.status = 'going'
        );
    END IF;

    -- Otherwise, check if they are friends
    RETURN EXISTS (
        SELECT 1 FROM friendships
        WHERE status = 'accepted'
        AND (
            (user_id = p_from_user_id AND friend_id = p_to_user_id) OR
            (friend_id = p_from_user_id AND user_id = p_to_user_id)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION upsert_rating TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_given_ratings TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_received_ratings TO authenticated;
GRANT EXECUTE ON FUNCTION delete_rating TO authenticated;
GRANT EXECUTE ON FUNCTION can_rate_user TO authenticated;