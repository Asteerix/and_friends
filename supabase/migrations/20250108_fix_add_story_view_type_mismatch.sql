-- Fix the add_story_view function type mismatch issue
-- The views column is text[] but the function was trying to use uuid[]

-- Drop the existing function
DROP FUNCTION IF EXISTS public.add_story_view(uuid, uuid);

-- Create the corrected function
CREATE OR REPLACE FUNCTION public.add_story_view(
    p_story_id UUID,
    p_viewer_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update views array (convert UUID to text for storage)
    UPDATE stories 
    SET views = array_append(
        COALESCE(views, ARRAY[]::text[]), 
        p_viewer_id::text
    )
    WHERE id = p_story_id 
    AND NOT (p_viewer_id::text = ANY(COALESCE(views, ARRAY[]::text[])));
    
    -- Increment views count only if we actually added a new view
    UPDATE stories 
    SET views_count = COALESCE(views_count, 0) + 1
    WHERE id = p_story_id 
    AND NOT (p_viewer_id::text = ANY(COALESCE(views, ARRAY[]::text[])));
    
    -- Also insert into story_views table if it exists
    -- This provides better tracking and analytics
    INSERT INTO story_views (story_id, viewer_id, viewed_at)
    VALUES (p_story_id, p_viewer_id, NOW())
    ON CONFLICT (story_id, viewer_id) DO NOTHING;
    
    -- Update the views_count to match the actual array length
    -- This ensures consistency even if there were previous issues
    UPDATE stories 
    SET views_count = COALESCE(array_length(views, 1), 0)
    WHERE id = p_story_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.add_story_view(uuid, uuid) TO authenticated;

-- Add a comment explaining the function
COMMENT ON FUNCTION public.add_story_view(uuid, uuid) IS 
'Records a story view by adding the viewer to the views array and updating the count. 
The viewer_id is stored as text in the views array for compatibility.';