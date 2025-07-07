-- Create event memories table
CREATE TABLE IF NOT EXISTS public.event_memories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('photo', 'video')) NOT NULL,
    media_url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT,
    duration INTEGER, -- For videos, in seconds
    is_public BOOLEAN DEFAULT true,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_event_memories_event ON public.event_memories(event_id);
CREATE INDEX idx_event_memories_user ON public.event_memories(user_id);
CREATE INDEX idx_event_memories_created ON public.event_memories(created_at DESC);
CREATE INDEX idx_event_memories_public ON public.event_memories(is_public);

-- Create memory likes table
CREATE TABLE IF NOT EXISTS public.memory_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    memory_id UUID REFERENCES public.event_memories(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(memory_id, user_id)
);

-- Create memory comments table
CREATE TABLE IF NOT EXISTS public.memory_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    memory_id UUID REFERENCES public.event_memories(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for likes and comments
CREATE INDEX idx_memory_likes_memory ON public.memory_likes(memory_id);
CREATE INDEX idx_memory_likes_user ON public.memory_likes(user_id);
CREATE INDEX idx_memory_comments_memory ON public.memory_comments(memory_id);
CREATE INDEX idx_memory_comments_created ON public.memory_comments(created_at DESC);

-- Add memories count to events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS memories_count INTEGER DEFAULT 0;

-- Function to get event memories with user info and like status
CREATE OR REPLACE FUNCTION public.get_event_memories(
    p_event_id UUID,
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    event_id UUID,
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
    type TEXT,
    media_url TEXT,
    thumbnail_url TEXT,
    caption TEXT,
    duration INTEGER,
    is_public BOOLEAN,
    likes_count INTEGER,
    comments_count INTEGER,
    is_liked BOOLEAN,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.event_id,
        m.user_id,
        p.username,
        p.avatar_url,
        m.type,
        m.media_url,
        m.thumbnail_url,
        m.caption,
        m.duration,
        m.is_public,
        m.likes_count,
        m.comments_count,
        EXISTS(
            SELECT 1 FROM public.memory_likes 
            WHERE memory_id = m.id AND user_id = p_user_id
        ) as is_liked,
        m.created_at
    FROM public.event_memories m
    JOIN public.profiles p ON p.id = m.user_id
    WHERE m.event_id = p_event_id
        AND (
            m.is_public = true 
            OR m.user_id = p_user_id
            OR EXISTS(
                SELECT 1 FROM public.event_participants ep
                WHERE ep.event_id = m.event_id 
                    AND ep.user_id = p_user_id
                    AND ep.status = 'accepted'
            )
        )
    ORDER BY m.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can add memories to event
CREATE OR REPLACE FUNCTION public.can_add_memory_to_event(
    p_event_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_event_status TEXT;
    v_is_participant BOOLEAN;
BEGIN
    -- Get event status
    SELECT 
        CASE 
            WHEN start_time > NOW() THEN 'upcoming'
            WHEN end_time < NOW() THEN 'past'
            ELSE 'ongoing'
        END INTO v_event_status
    FROM public.events
    WHERE id = p_event_id;
    
    -- Check if event is ongoing or past
    IF v_event_status = 'upcoming' THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user is participant or creator
    SELECT EXISTS(
        SELECT 1 FROM public.events e
        WHERE e.id = p_event_id AND e.created_by = p_user_id
        UNION
        SELECT 1 FROM public.event_participants ep
        WHERE ep.event_id = p_event_id 
            AND ep.user_id = p_user_id
            AND ep.status = 'accepted'
    ) INTO v_is_participant;
    
    RETURN v_is_participant;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update memories count
CREATE OR REPLACE FUNCTION public.update_memories_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.events 
        SET memories_count = memories_count + 1
        WHERE id = NEW.event_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.events 
        SET memories_count = memories_count - 1
        WHERE id = OLD.event_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_memories_count_trigger
AFTER INSERT OR DELETE ON public.event_memories
FOR EACH ROW
EXECUTE FUNCTION public.update_memories_count();

-- Trigger to update likes count
CREATE OR REPLACE FUNCTION public.update_memory_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.event_memories 
        SET likes_count = likes_count + 1
        WHERE id = NEW.memory_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.event_memories 
        SET likes_count = likes_count - 1
        WHERE id = OLD.memory_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_memory_likes_count_trigger
AFTER INSERT OR DELETE ON public.memory_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_memory_likes_count();

-- Trigger to update comments count
CREATE OR REPLACE FUNCTION public.update_memory_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.event_memories 
        SET comments_count = comments_count + 1
        WHERE id = NEW.memory_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.event_memories 
        SET comments_count = comments_count - 1
        WHERE id = OLD.memory_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_memory_comments_count_trigger
AFTER INSERT OR DELETE ON public.memory_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_memory_comments_count();

-- RLS policies
ALTER TABLE public.event_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_comments ENABLE ROW LEVEL SECURITY;

-- Event memories policies
CREATE POLICY "Users can view public memories or their own" ON public.event_memories
    FOR SELECT USING (
        is_public = true 
        OR user_id = auth.uid()
        OR EXISTS(
            SELECT 1 FROM public.event_participants ep
            WHERE ep.event_id = event_memories.event_id 
                AND ep.user_id = auth.uid()
                AND ep.status = 'accepted'
        )
    );

CREATE POLICY "Users can add memories to events they participate in" ON public.event_memories
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND public.can_add_memory_to_event(event_id, auth.uid())
    );

CREATE POLICY "Users can update their own memories" ON public.event_memories
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own memories" ON public.event_memories
    FOR DELETE USING (user_id = auth.uid());

-- Memory likes policies
CREATE POLICY "Users can view all likes" ON public.memory_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can like memories" ON public.memory_likes
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unlike memories" ON public.memory_likes
    FOR DELETE USING (user_id = auth.uid());

-- Memory comments policies
CREATE POLICY "Users can view comments on accessible memories" ON public.memory_comments
    FOR SELECT USING (
        EXISTS(
            SELECT 1 FROM public.event_memories m
            WHERE m.id = memory_comments.memory_id
                AND (
                    m.is_public = true 
                    OR m.user_id = auth.uid()
                    OR EXISTS(
                        SELECT 1 FROM public.event_participants ep
                        WHERE ep.event_id = m.event_id 
                            AND ep.user_id = auth.uid()
                            AND ep.status = 'accepted'
                    )
                )
        )
    );

CREATE POLICY "Users can comment on accessible memories" ON public.memory_comments
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND EXISTS(
            SELECT 1 FROM public.event_memories m
            WHERE m.id = memory_comments.memory_id
                AND (
                    m.is_public = true 
                    OR m.user_id = auth.uid()
                    OR EXISTS(
                        SELECT 1 FROM public.event_participants ep
                        WHERE ep.event_id = m.event_id 
                            AND ep.user_id = auth.uid()
                            AND ep.status = 'accepted'
                    )
                )
        )
    );

CREATE POLICY "Users can update their own comments" ON public.memory_comments
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" ON public.memory_comments
    FOR DELETE USING (user_id = auth.uid());