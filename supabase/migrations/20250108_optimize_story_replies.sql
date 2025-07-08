-- Create indexes to improve story_replies query performance
CREATE INDEX IF NOT EXISTS idx_story_replies_story_id_created_at 
ON public.story_replies(story_id, created_at);

CREATE INDEX IF NOT EXISTS idx_story_replies_parent_reply_id 
ON public.story_replies(parent_reply_id);

CREATE INDEX IF NOT EXISTS idx_reply_likes_user_reply 
ON public.reply_likes(user_id, reply_id);

-- Analyze tables to update query planner statistics
ANALYZE public.story_replies;
ANALYZE public.reply_likes;
ANALYZE public.profiles;