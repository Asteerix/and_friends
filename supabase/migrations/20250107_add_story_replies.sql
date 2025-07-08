-- Create story_replies table for comments on stories/memories
CREATE TABLE IF NOT EXISTS story_replies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_story_replies_story_id ON story_replies(story_id);
CREATE INDEX IF NOT EXISTS idx_story_replies_user_id ON story_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_story_replies_created_at ON story_replies(created_at DESC);

-- Add RLS policies
ALTER TABLE story_replies ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view replies
CREATE POLICY "Anyone can view story replies" ON story_replies
  FOR SELECT USING (true);

-- Policy: Authenticated users can create replies
CREATE POLICY "Authenticated users can create story replies" ON story_replies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own replies
CREATE POLICY "Users can update their own story replies" ON story_replies
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own replies
CREATE POLICY "Users can delete their own story replies" ON story_replies
  FOR DELETE USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_story_replies_updated_at 
  BEFORE UPDATE ON story_replies 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Update stories table to add replies_count
ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS replies_count integer DEFAULT 0;

-- Function to update replies count
CREATE OR REPLACE FUNCTION update_story_replies_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE stories SET replies_count = replies_count + 1 WHERE id = NEW.story_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE stories SET replies_count = replies_count - 1 WHERE id = OLD.story_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update replies count
CREATE TRIGGER update_story_replies_count_trigger
AFTER INSERT OR DELETE ON story_replies
FOR EACH ROW
EXECUTE FUNCTION update_story_replies_count();