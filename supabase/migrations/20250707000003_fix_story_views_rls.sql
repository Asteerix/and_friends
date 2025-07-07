-- =====================================================
-- FIX STORY VIEWS RLS AND FUNCTION
-- =====================================================

-- 1. Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "story_views_insert_own" ON story_views;
DROP POLICY IF EXISTS "story_views_select_if_story_owner" ON story_views;
DROP POLICY IF EXISTS "Users can view story views" ON story_views;
DROP POLICY IF EXISTS "Users can add story views" ON story_views;

-- 2. Create the correct RLS policies
-- Allow users to view story views for stories they own or have viewed
CREATE POLICY "Users can view story views" ON story_views
    FOR SELECT USING (
        viewer_id = auth.uid() OR 
        story_id IN (SELECT id FROM stories WHERE user_id = auth.uid())
    );

-- Allow users to insert their own views
CREATE POLICY "Users can add story views" ON story_views
    FOR INSERT WITH CHECK (viewer_id = auth.uid());

-- 3. Recreate the add_story_view function with proper error handling
CREATE OR REPLACE FUNCTION add_story_view(p_story_id UUID, p_viewer_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_story_exists BOOLEAN;
BEGIN
    -- Check if story exists and hasn't expired
    SELECT EXISTS (
        SELECT 1 FROM stories 
        WHERE id = p_story_id 
        AND expires_at > NOW()
    ) INTO v_story_exists;
    
    IF NOT v_story_exists THEN
        RAISE EXCEPTION 'Story does not exist or has expired';
    END IF;

    -- Add viewer to views array if not already present
    UPDATE stories 
    SET views = array_append(
        COALESCE(views, ARRAY[]::TEXT[]), 
        p_viewer_id::TEXT
    ),
    views_count = COALESCE(views_count, 0) + 1
    WHERE id = p_story_id
    AND NOT (p_viewer_id::TEXT = ANY(COALESCE(views, ARRAY[]::TEXT[])));
    
    -- Insert into story_views table for historical tracking
    -- Using SECURITY DEFINER allows bypassing RLS
    INSERT INTO story_views (story_id, viewer_id, viewed_at)
    VALUES (p_story_id, p_viewer_id, NOW())
    ON CONFLICT (story_id, viewer_id) DO NOTHING;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the function
        RAISE WARNING 'Error in add_story_view: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION add_story_view(UUID, UUID) TO authenticated;

-- 5. Add comment to document the function
COMMENT ON FUNCTION add_story_view(UUID, UUID) IS 
'Adds a view to a story. Uses SECURITY DEFINER to bypass RLS policies on story_views table.';