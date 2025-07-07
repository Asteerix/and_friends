-- Combined migration to fix profile display issues

-- First, check and add missing columns to profiles table
DO $$ 
BEGIN
    -- Add selected_jams if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='selected_jams') THEN
        ALTER TABLE public.profiles ADD COLUMN selected_jams TEXT[];
    END IF;

    -- Add selected_restaurants if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='selected_restaurants') THEN
        ALTER TABLE public.profiles ADD COLUMN selected_restaurants TEXT[];
    END IF;

    -- Add interests if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='interests') THEN
        ALTER TABLE public.profiles ADD COLUMN interests TEXT[];
    END IF;

    -- Add cover_url if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='cover_url') THEN
        ALTER TABLE public.profiles ADD COLUMN cover_url TEXT;
    END IF;

    -- Add display_name if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='display_name') THEN
        ALTER TABLE public.profiles ADD COLUMN display_name TEXT;
    END IF;

    -- Add email if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='email') THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
    END IF;

    -- Add bio if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='bio') THEN
        ALTER TABLE public.profiles ADD COLUMN bio TEXT;
    END IF;
END $$;

-- Update selected_jams with jam_title if it exists and selected_jams is empty
UPDATE public.profiles 
SET selected_jams = ARRAY[jam_title]
WHERE jam_title IS NOT NULL AND (selected_jams IS NULL OR cardinality(selected_jams) = 0);

-- Update selected_restaurants with selected_restaurant_name if it exists and selected_restaurants is empty
UPDATE public.profiles 
SET selected_restaurants = ARRAY[selected_restaurant_name]
WHERE selected_restaurant_name IS NOT NULL AND (selected_restaurants IS NULL OR cardinality(selected_restaurants) = 0);

-- Drop and recreate friend-related functions with correct column names
DROP FUNCTION IF EXISTS public.get_friend_status(UUID, UUID);
DROP FUNCTION IF EXISTS public.search_users(TEXT, UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.get_friends(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.get_friend_requests(UUID, TEXT);

-- Function to get friend status between two users
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

-- Function to search users
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
        mutual_friends_count DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get friends list
CREATE OR REPLACE FUNCTION public.get_friends(
    p_user_id UUID,
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
        p.updated_at as last_seen,
        f.created_at as friendship_date
    FROM public.friendships f
    JOIN public.profiles p ON (
        CASE 
            WHEN f.user_id = p_user_id THEN f.friend_id = p.id
            ELSE f.user_id = p.id
        END
    )
    WHERE (f.user_id = p_user_id OR f.friend_id = p_user_id)
        AND f.status = 'accepted'
    ORDER BY f.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get friend requests
CREATE OR REPLACE FUNCTION public.get_friend_requests(
    p_user_id UUID,
    request_type TEXT DEFAULT 'received'
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
                (f1.friend_id = f2.friend_id AND f1.user_id = p_user_id AND f2.user_id = p.id)
                OR (f1.friend_id = f2.user_id AND f1.user_id = p_user_id AND f2.friend_id = p.id)
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
            WHEN request_type = 'received' THEN f.friend_id = p_user_id
            ELSE f.user_id = p_user_id
        END
        AND f.status = 'pending'
    ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Add missing columns to friendships table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='friendships' AND column_name='responded_at') THEN
        ALTER TABLE public.friendships ADD COLUMN responded_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='friendships' AND column_name='updated_at') THEN
        ALTER TABLE public.friendships ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;