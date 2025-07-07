-- Create story_likes table
CREATE TABLE IF NOT EXISTS story_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(story_id, user_id)
);

-- Create story_comments table
CREATE TABLE IF NOT EXISTS story_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create story_reports table
CREATE TABLE IF NOT EXISTS story_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(story_id, reporter_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_story_likes_story_id ON story_likes(story_id);
CREATE INDEX IF NOT EXISTS idx_story_likes_user_id ON story_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_story_comments_story_id ON story_comments(story_id);
CREATE INDEX IF NOT EXISTS idx_story_comments_user_id ON story_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_story_reports_story_id ON story_reports(story_id);

-- RLS Policies
ALTER TABLE story_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_reports ENABLE ROW LEVEL SECURITY;

-- Story likes policies
CREATE POLICY "Users can view all story likes" ON story_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like stories" ON story_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes" ON story_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Story comments policies
CREATE POLICY "Users can view all story comments" ON story_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can comment on stories" ON story_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON story_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Story reports policies
CREATE POLICY "Users can report stories" ON story_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Only admins can view reports" ON story_reports
  FOR SELECT USING (false); -- Will need admin role check

-- Add likes_count and comments_count to stories for performance
ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;

-- Function to update likes count
CREATE OR REPLACE FUNCTION update_story_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE stories SET likes_count = likes_count + 1 WHERE id = NEW.story_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE stories SET likes_count = likes_count - 1 WHERE id = OLD.story_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update comments count
CREATE OR REPLACE FUNCTION update_story_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE stories SET comments_count = comments_count + 1 WHERE id = NEW.story_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE stories SET comments_count = comments_count - 1 WHERE id = OLD.story_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_story_likes_count_trigger
AFTER INSERT OR DELETE ON story_likes
FOR EACH ROW EXECUTE FUNCTION update_story_likes_count();

CREATE TRIGGER update_story_comments_count_trigger
AFTER INSERT OR DELETE ON story_comments
FOR EACH ROW EXECUTE FUNCTION update_story_comments_count();