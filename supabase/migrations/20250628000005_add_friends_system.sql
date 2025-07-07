-- Create friends/followers table
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    addressee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(requester_id, addressee_id)
);

-- Create indexes for performance
CREATE INDEX idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON public.friendships(addressee_id);
CREATE INDEX idx_friendships_status ON public.friendships(status);

-- Add friend-related fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS friends_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allow_friend_requests BOOLEAN DEFAULT true;

-- Function to get friend status between two users
CREATE OR REPLACE FUNCTION public.get_friend_status(user1_id UUID, user2_id UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT status FROM public.friendships
        WHERE (requester_id = user1_id AND addressee_id = user2_id)
           OR (requester_id = user2_id AND addressee_id = user1_id)
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
        p.friends_count,
        public.get_friend_status(current_user_id, p.id) as friend_status,
        (
            SELECT COUNT(*)::INTEGER FROM public.friendships f1
            JOIN public.friendships f2 ON (
                (f1.addressee_id = f2.addressee_id AND f1.requester_id = current_user_id AND f2.requester_id = p.id)
                OR (f1.addressee_id = f2.requester_id AND f1.requester_id = current_user_id AND f2.addressee_id = p.id)
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
        p.friends_count DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get friends list
CREATE OR REPLACE FUNCTION public.get_friends(
    user_id UUID,
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
        f.updated_at as friendship_date
    FROM public.friendships f
    JOIN public.profiles p ON (
        CASE 
            WHEN f.requester_id = user_id THEN f.addressee_id = p.id
            ELSE f.requester_id = p.id
        END
    )
    WHERE (f.requester_id = user_id OR f.addressee_id = user_id)
        AND f.status = 'accepted'
    ORDER BY f.updated_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get friend requests
CREATE OR REPLACE FUNCTION public.get_friend_requests(
    user_id UUID,
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
                (f1.addressee_id = f2.addressee_id AND f1.requester_id = user_id AND f2.requester_id = p.id)
                OR (f1.addressee_id = f2.requester_id AND f1.requester_id = user_id AND f2.addressee_id = p.id)
            )
            WHERE f1.status = 'accepted' AND f2.status = 'accepted'
        ) as mutual_friends_count
    FROM public.friendships f
    JOIN public.profiles p ON (
        CASE 
            WHEN request_type = 'received' THEN f.requester_id = p.id
            ELSE f.addressee_id = p.id
        END
    )
    WHERE 
        CASE 
            WHEN request_type = 'received' THEN f.addressee_id = user_id
            ELSE f.requester_id = user_id
        END
        AND f.status = 'pending'
    ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update friends count
CREATE OR REPLACE FUNCTION public.update_friends_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.status = 'accepted' THEN
            UPDATE public.profiles 
            SET friends_count = (
                SELECT COUNT(*) FROM public.friendships 
                WHERE (requester_id = NEW.requester_id OR addressee_id = NEW.requester_id) 
                AND status = 'accepted'
            )
            WHERE id = NEW.requester_id;
            
            UPDATE public.profiles 
            SET friends_count = (
                SELECT COUNT(*) FROM public.friendships 
                WHERE (requester_id = NEW.addressee_id OR addressee_id = NEW.addressee_id) 
                AND status = 'accepted'
            )
            WHERE id = NEW.addressee_id;
        END IF;
    END IF;
    
    IF TG_OP = 'DELETE' AND OLD.status = 'accepted' THEN
        UPDATE public.profiles 
        SET friends_count = (
            SELECT COUNT(*) FROM public.friendships 
            WHERE (requester_id = OLD.requester_id OR addressee_id = OLD.requester_id) 
            AND status = 'accepted'
        )
        WHERE id = OLD.requester_id;
        
        UPDATE public.profiles 
        SET friends_count = (
            SELECT COUNT(*) FROM public.friendships 
            WHERE (requester_id = OLD.addressee_id OR addressee_id = OLD.addressee_id) 
            AND status = 'accepted'
        )
        WHERE id = OLD.addressee_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_friends_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.friendships
FOR EACH ROW
EXECUTE FUNCTION public.update_friends_count();

-- RLS policies
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Users can see their own friendships
CREATE POLICY "Users can view their friendships" ON public.friendships
    FOR SELECT USING (
        auth.uid() = requester_id OR auth.uid() = addressee_id
    );

-- Users can insert friendship requests
CREATE POLICY "Users can send friend requests" ON public.friendships
    FOR INSERT WITH CHECK (
        auth.uid() = requester_id
    );

-- Users can update their friendship status
CREATE POLICY "Users can update friendship status" ON public.friendships
    FOR UPDATE USING (
        auth.uid() = addressee_id AND status = 'pending'
    );

-- Users can delete their friendships
CREATE POLICY "Users can delete friendships" ON public.friendships
    FOR DELETE USING (
        auth.uid() = requester_id OR auth.uid() = addressee_id
    );