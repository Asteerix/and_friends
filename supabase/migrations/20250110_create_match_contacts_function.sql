-- Create a function to match phone numbers with users and calculate mutual friends
CREATE OR REPLACE FUNCTION match_contacts_with_users(
    phone_numbers TEXT[],
    current_user_id UUID
)
RETURNS TABLE (
    id UUID,
    username TEXT,
    full_name TEXT,
    avatar_url TEXT,
    phone_number TEXT,
    bio TEXT,
    mutual_friends_count INT,
    is_friend BOOLEAN,
    has_pending_request BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.full_name,
        p.avatar_url,
        p.phone_number,
        p.bio,
        -- Calculate mutual friends count
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
        ) as mutual_friends_count,
        -- Check if already friends
        EXISTS (
            SELECT 1 FROM friendships f
            WHERE f.status = 'accepted'
            AND (
                (f.user_id = current_user_id AND f.friend_id = p.id) OR
                (f.friend_id = current_user_id AND f.user_id = p.id)
            )
        ) as is_friend,
        -- Check if has pending request
        EXISTS (
            SELECT 1 FROM friendships f
            WHERE f.status = 'pending'
            AND (
                (f.user_id = current_user_id AND f.friend_id = p.id) OR
                (f.friend_id = current_user_id AND f.user_id = p.id)
            )
        ) as has_pending_request
    FROM profiles p
    WHERE p.id != current_user_id
    AND p.phone_number = ANY(phone_numbers)
    -- Exclude blocked users
    AND NOT EXISTS (
        SELECT 1 FROM user_blocks
        WHERE (blocker_id = current_user_id AND blocked_id = p.id)
        OR (blocker_id = p.id AND blocked_id = current_user_id)
    )
    ORDER BY mutual_friends_count DESC, p.username;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION match_contacts_with_users TO authenticated;

-- Create function to process pending friend requests when a user first logs in
CREATE OR REPLACE FUNCTION process_pending_friend_requests(
    user_phone_number TEXT
)
RETURNS TABLE (
    request_from_user_id UUID,
    request_timestamp TIMESTAMPTZ,
    request_processed BOOLEAN
) AS $$
DECLARE
    pending_request RECORD;
BEGIN
    -- This function would be called when a user first logs in
    -- to check if there are any pending friend requests stored locally
    -- The actual implementation would depend on how we sync with local storage
    
    -- For now, we'll just return an empty result
    -- In production, this would integrate with your backend service
    -- that processes the locally stored pending requests
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_pending_friend_requests TO authenticated;