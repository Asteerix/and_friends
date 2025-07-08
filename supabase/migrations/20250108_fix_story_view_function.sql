-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.add_story_view(uuid, uuid);

-- Create a proper add_story_view function
CREATE OR REPLACE FUNCTION public.add_story_view(
    p_story_id UUID,
    p_viewer_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert the view record if it doesn't exist
    INSERT INTO public.story_views (story_id, viewer_id, viewed_at)
    VALUES (p_story_id, p_viewer_id, NOW())
    ON CONFLICT (story_id, viewer_id) DO NOTHING;
    
    -- Update the views_count on the story
    UPDATE public.stories
    SET views_count = (
        SELECT COUNT(DISTINCT viewer_id) 
        FROM public.story_views 
        WHERE story_id = p_story_id
    )
    WHERE id = p_story_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.add_story_view(uuid, uuid) TO authenticated;