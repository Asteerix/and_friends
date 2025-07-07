-- =====================================================
-- FIX STORIES STRUCTURE
-- =====================================================

-- 1. Ajouter les colonnes manquantes à la table stories
ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS music_data JSONB,
ADD COLUMN IF NOT EXISTS stickers JSONB,
ADD COLUMN IF NOT EXISTS mentions TEXT[],
ADD COLUMN IF NOT EXISTS location JSONB,
ADD COLUMN IF NOT EXISTS views TEXT[] DEFAULT '{}';

-- 2. Créer la table story_highlights
CREATE TABLE IF NOT EXISTS story_highlights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    cover_url TEXT,
    stories TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour story_highlights
CREATE INDEX IF NOT EXISTS idx_story_highlights_user_id ON story_highlights(user_id);

-- 3. Activer RLS sur story_highlights
ALTER TABLE story_highlights ENABLE ROW LEVEL SECURITY;

-- 4. Policies pour story_highlights
DROP POLICY IF EXISTS "Users can view their own highlights" ON story_highlights;
CREATE POLICY "Users can view their own highlights" ON story_highlights
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own highlights" ON story_highlights;
CREATE POLICY "Users can create their own highlights" ON story_highlights
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own highlights" ON story_highlights;
CREATE POLICY "Users can update their own highlights" ON story_highlights
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own highlights" ON story_highlights;
CREATE POLICY "Users can delete their own highlights" ON story_highlights
    FOR DELETE USING (user_id = auth.uid());

-- 5. Modifier la fonction add_story_view pour utiliser un array
CREATE OR REPLACE FUNCTION add_story_view(p_story_id UUID, p_viewer_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Ajouter le viewer_id au tableau views s'il n'y est pas déjà
    UPDATE stories 
    SET views = array_append(views, p_viewer_id::TEXT)
    WHERE id = p_story_id
    AND NOT (p_viewer_id::TEXT = ANY(views));
    
    -- Toujours insérer dans story_views pour l'historique
    INSERT INTO story_views (story_id, viewer_id)
    VALUES (p_story_id, p_viewer_id)
    ON CONFLICT (story_id, viewer_id) DO NOTHING;
    
    -- Mettre à jour le compteur
    UPDATE stories 
    SET views_count = array_length(views, 1)
    WHERE id = p_story_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger pour mettre à jour updated_at sur story_highlights
DROP TRIGGER IF EXISTS update_story_highlights_updated_at ON story_highlights;
CREATE TRIGGER update_story_highlights_updated_at 
    BEFORE UPDATE ON story_highlights 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();