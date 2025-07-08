-- Create story_saves table for bookmarking stories
CREATE TABLE IF NOT EXISTS story_saves (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(story_id, user_id)
);

-- Create reply_likes table for liking comments
CREATE TABLE IF NOT EXISTS reply_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reply_id UUID NOT NULL REFERENCES story_replies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(reply_id, user_id)
);

-- Add parent_reply_id to story_replies for nested replies
ALTER TABLE story_replies 
ADD COLUMN IF NOT EXISTS parent_reply_id UUID REFERENCES story_replies(id) ON DELETE CASCADE;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_story_saves_story_id ON story_saves(story_id);
CREATE INDEX IF NOT EXISTS idx_story_saves_user_id ON story_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_reply_likes_reply_id ON reply_likes(reply_id);
CREATE INDEX IF NOT EXISTS idx_reply_likes_user_id ON reply_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_story_replies_parent_reply_id ON story_replies(parent_reply_id);

-- RLS Policies
ALTER TABLE story_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE reply_likes ENABLE ROW LEVEL SECURITY;

-- Story saves policies
CREATE POLICY "Users can view their own saves" ON story_saves
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save stories" ON story_saves
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave stories" ON story_saves
  FOR DELETE USING (auth.uid() = user_id);

-- Reply likes policies
CREATE POLICY "Users can view all reply likes" ON reply_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like replies" ON reply_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike replies" ON reply_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Add saves_count to stories
ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS saves_count INTEGER DEFAULT 0;

-- Add likes_count to story_replies
ALTER TABLE story_replies
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- Function to update saves count
CREATE OR REPLACE FUNCTION update_story_saves_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE stories SET saves_count = saves_count + 1 WHERE id = NEW.story_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE stories SET saves_count = saves_count - 1 WHERE id = OLD.story_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update reply likes count
CREATE OR REPLACE FUNCTION update_reply_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE story_replies SET likes_count = likes_count + 1 WHERE id = NEW.reply_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE story_replies SET likes_count = likes_count - 1 WHERE id = OLD.reply_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_story_saves_count_trigger
AFTER INSERT OR DELETE ON story_saves
FOR EACH ROW EXECUTE FUNCTION update_story_saves_count();

CREATE TRIGGER update_reply_likes_count_trigger
AFTER INSERT OR DELETE ON reply_likes
FOR EACH ROW EXECUTE FUNCTION update_reply_likes_count();