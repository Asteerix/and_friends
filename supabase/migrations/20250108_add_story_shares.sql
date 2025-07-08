-- Create story_shares table to track share analytics
CREATE TABLE IF NOT EXISTS public.story_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    shared_at TIMESTAMPTZ DEFAULT NOW(),
    platform TEXT, -- 'ios', 'android', 'web'
    method TEXT, -- 'messenger', 'whatsapp', 'sms', 'email', 'copy', etc.
    
    CONSTRAINT story_shares_story_id_user_id_key UNIQUE(story_id, user_id, shared_at)
);

-- Create index for faster lookups
CREATE INDEX idx_story_shares_story_id ON public.story_shares(story_id);
CREATE INDEX idx_story_shares_user_id ON public.story_shares(user_id);
CREATE INDEX idx_story_shares_shared_at ON public.story_shares(shared_at DESC);

-- Enable RLS
ALTER TABLE public.story_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can insert their own shares
CREATE POLICY "Users can track their own shares" ON public.story_shares
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Story owners can view share analytics
CREATE POLICY "Story owners can view share analytics" ON public.story_shares
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.stories
            WHERE stories.id = story_shares.story_id
            AND stories.user_id = auth.uid()
        )
    );

-- Grant permissions
GRANT INSERT ON public.story_shares TO authenticated;
GRANT SELECT ON public.story_shares TO authenticated;