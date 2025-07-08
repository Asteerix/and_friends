-- Add story_id and message_type to messages table for story replies
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS story_id UUID REFERENCES public.stories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'story_reply', 'image', 'video'));

-- Create index for faster story reply lookups
CREATE INDEX IF NOT EXISTS idx_messages_story_id ON public.messages(story_id);
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON public.messages(message_type);

-- Update RLS policies to allow story replies
CREATE POLICY "Users can send story replies" ON public.messages
    FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id 
        AND (
            -- Regular message between friends
            (message_type = 'text' AND EXISTS (
                SELECT 1 FROM public.friendships
                WHERE status = 'accepted'
                AND ((user_id = auth.uid() AND friend_id = receiver_id)
                OR (friend_id = auth.uid() AND user_id = receiver_id))
            ))
            OR
            -- Story reply (no friendship required)
            (message_type = 'story_reply' AND story_id IS NOT NULL)
        )
    );

-- Function to format story reply messages with preview
CREATE OR REPLACE FUNCTION format_story_reply_message()
RETURNS TRIGGER AS $$
BEGIN
    -- If it's a story reply and content is empty, add a default message
    IF NEW.message_type = 'story_reply' AND NEW.story_id IS NOT NULL THEN
        IF NEW.content IS NULL OR NEW.content = '' THEN
            NEW.content := 'a répondu à votre story';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to format story reply messages
CREATE TRIGGER format_story_reply_before_insert
    BEFORE INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION format_story_reply_message();