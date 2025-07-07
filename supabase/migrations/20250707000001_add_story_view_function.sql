-- Create function to add story views
CREATE OR REPLACE FUNCTION add_story_view(story_id UUID, viewer_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Check if story exists and hasn't expired
  IF NOT EXISTS (
    SELECT 1 FROM stories 
    WHERE id = story_id 
    AND expires_at > NOW()
  ) THEN
    RAISE EXCEPTION 'Story does not exist or has expired';
  END IF;

  -- Add viewer to viewed_by array if not already present
  UPDATE stories
  SET viewed_by = array_append(
    COALESCE(viewed_by, ARRAY[]::UUID[]), 
    viewer_id
  )
  WHERE id = story_id
  AND NOT (viewer_id = ANY(COALESCE(viewed_by, ARRAY[]::UUID[])));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION add_story_view TO authenticated;