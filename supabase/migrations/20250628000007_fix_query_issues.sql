-- =====================================================
-- FIX QUERY ISSUES - Add missing columns for queries
-- =====================================================

-- 1. Ensure profiles table has username column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='profiles' AND column_name='username'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN username TEXT UNIQUE;
  END IF;
END$$;

-- 2. Create view for story_views if not exists (for counting views)
CREATE TABLE IF NOT EXISTS story_views (
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (story_id, viewer_id)
);

-- 3. Add views_count column to stories if not exists
ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS views_count INT DEFAULT 0;

-- 4. Update the add_story_view function to handle arrays properly
CREATE OR REPLACE FUNCTION add_story_view(p_story_id UUID, p_viewer_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Ajouter le viewer_id au tableau views s'il n'y est pas déjà
    UPDATE stories 
    SET views = array_append(views, p_viewer_id::TEXT)
    WHERE id = p_story_id
    AND NOT (p_viewer_id::TEXT = ANY(COALESCE(views, '{}'::TEXT[])));
    
    -- Toujours insérer dans story_views pour l'historique
    INSERT INTO story_views (story_id, viewer_id)
    VALUES (p_story_id, p_viewer_id)
    ON CONFLICT (story_id, viewer_id) DO NOTHING;
    
    -- Mettre à jour le compteur
    UPDATE stories 
    SET views_count = COALESCE(array_length(views, 1), 0)
    WHERE id = p_story_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant permissions on story_views
GRANT SELECT, INSERT ON story_views TO authenticated;

-- 6. Enable RLS on story_views
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for story_views
DROP POLICY IF EXISTS "Users can view story views" ON story_views;
CREATE POLICY "Users can view story views" ON story_views
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can add story views" ON story_views;
CREATE POLICY "Users can add story views" ON story_views
    FOR INSERT WITH CHECK (viewer_id = auth.uid());

-- 8. Create index for performance
CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_viewer_id ON story_views(viewer_id);