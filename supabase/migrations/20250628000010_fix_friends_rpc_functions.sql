-- Drop existing functions that use wrong column names
DROP FUNCTION IF EXISTS public.get_friends(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.get_friend_requests(UUID, TEXT);
DROP FUNCTION IF EXISTS public.search_users(TEXT, UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.get_friend_status(UUID, UUID);

-- Recreate get_friend_status to work with user_id/friend_id columns
CREATE OR REPLACE FUNCTION public.get_friend_status(user1_id UUID, user2_id UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT status FROM public.friendships
        WHERE (user_id = user1_id AND friend_id = user2_id)
           OR (user_id = user2_id AND friend_id = user1_id)
        ORDER BY created_at DESC
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql;

-- Recreate search_users to work with current schema
CREATE OR REPLACE FUNCTION public.search_users(
    search_query TEXT,
    current_user_id UUID,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    username TEXT,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    friends_count INTEGER,
    friend_status TEXT,
    mutual_friends_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.full_name,
        p.avatar_url,
        p.bio,
        COALESCE(p.friends_count, 0)::INTEGER,
        public.get_friend_status(current_user_id, p.id) as friend_status,
        (
            SELECT COUNT(*)::INTEGER FROM public.friendships f1
            JOIN public.friendships f2 ON (
                (f1.friend_id = f2.friend_id AND f1.user_id = current_user_id AND f2.user_id = p.id)
                OR (f1.friend_id = f2.user_id AND f1.user_id = current_user_id AND f2.friend_id = p.id)
            )
            WHERE f1.status = 'accepted' AND f2.status = 'accepted'
        ) as mutual_friends_count
    FROM public.profiles p
    WHERE p.id != current_user_id
        AND (
            p.username ILIKE '%' || search_query || '%'
            OR p.full_name ILIKE '%' || search_query || '%'
        )
    ORDER BY 
        CASE 
            WHEN p.username ILIKE search_query || '%' THEN 1
            WHEN p.full_name ILIKE search_query || '%' THEN 2
            ELSE 3
        END,
        mutual_friends_count DESC,
        COALESCE(p.friends_count, 0) DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Recreate get_friends to work with user_id/friend_id columns
CREATE OR REPLACE FUNCTION public.get_friends(
    input_user_id UUID,
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    username TEXT,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    last_seen TIMESTAMPTZ,
    friendship_date TIMESTAMPTZ
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
        f.created_at as friendship_date
    FROM public.friendships f
    JOIN public.profiles p ON (
        CASE 
            WHEN f.user_id = input_user_id THEN f.friend_id = p.id
            ELSE f.user_id = p.id
        END
    )
    WHERE (f.user_id = input_user_id OR f.friend_id = input_user_id)
        AND f.status = 'accepted'
    ORDER BY f.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Recreate get_friend_requests to work with user_id/friend_id columns
CREATE OR REPLACE FUNCTION public.get_friend_requests(
    input_user_id UUID,
    request_type TEXT DEFAULT 'received' -- 'received' or 'sent'
)
RETURNS TABLE (
    id UUID,
    username TEXT,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    request_date TIMESTAMPTZ,
    mutual_friends_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.full_name,
        p.avatar_url,
        p.bio,
        f.created_at as request_date,
        (
            SELECT COUNT(*)::INTEGER FROM public.friendships f1
            JOIN public.friendships f2 ON (
                (f1.friend_id = f2.friend_id AND f1.user_id = input_user_id AND f2.user_id = p.id)
                OR (f1.friend_id = f2.user_id AND f1.user_id = input_user_id AND f2.friend_id = p.id)
            )
            WHERE f1.status = 'accepted' AND f2.status = 'accepted'
        ) as mutual_friends_count
    FROM public.friendships f
    JOIN public.profiles p ON (
        CASE 
            WHEN request_type = 'received' THEN f.user_id = p.id
            ELSE f.friend_id = p.id
        END
    )
    WHERE 
        CASE 
            WHEN request_type = 'received' THEN f.friend_id = input_user_id
            ELSE f.user_id = input_user_id
        END
        AND f.status = 'pending'
    ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Add missing columns if they don't exist
ALTER TABLE public.friendships ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;
ALTER TABLE public.friendships ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add missing columns to profiles if they don't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS friends_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();