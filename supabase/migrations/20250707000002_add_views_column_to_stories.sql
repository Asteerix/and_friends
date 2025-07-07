-- Add views column to stories table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'stories' 
                   AND column_name = 'views') THEN
        ALTER TABLE public.stories ADD COLUMN views text[] DEFAULT '{}';
    END IF;
END $$;

-- Update any existing stories to have empty views array
UPDATE public.stories 
SET views = COALESCE(views, '{}')
WHERE views IS NULL;

-- Create or replace the add_story_view function
CREATE OR REPLACE FUNCTION public.add_story_view(story_id uuid, viewer_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE public.stories
    SET views = array_append(
        COALESCE(views, '{}'),
        viewer_id::text
    ),
    views_count = COALESCE(views_count, 0) + 1
    WHERE id = story_id
    AND NOT (viewer_id::text = ANY(COALESCE(views, '{}')));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.add_story_view(uuid, uuid) TO authenticated;