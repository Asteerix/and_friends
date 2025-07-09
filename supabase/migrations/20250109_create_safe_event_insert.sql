-- Créer une fonction RPC pour insérer des événements de manière sûre
CREATE OR REPLACE FUNCTION create_event_safe(
  p_title TEXT,
  p_description TEXT,
  p_date TIMESTAMPTZ,
  p_location TEXT,
  p_is_private BOOLEAN,
  p_image_url TEXT,
  p_subtitle TEXT,
  p_extra_data JSONB
) RETURNS TABLE (
  id UUID,
  title TEXT,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_user_id UUID;
  v_event_id UUID;
BEGIN
  -- Récupérer l'ID de l'utilisateur actuel
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Insérer l'événement avec seulement les colonnes de base
  INSERT INTO events (
    title,
    description,
    date,
    location,
    is_private,
    created_by,
    image_url,
    subtitle,
    extra_data
  ) VALUES (
    p_title,
    p_description,
    p_date,
    p_location,
    p_is_private,
    v_user_id,
    p_image_url,
    p_subtitle,
    p_extra_data
  )
  RETURNING events.id INTO v_event_id;

  -- Retourner les infos de base
  RETURN QUERY
  SELECT 
    events.id,
    events.title,
    events.created_at
  FROM events
  WHERE events.id = v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Donner les permissions
GRANT EXECUTE ON FUNCTION create_event_safe TO authenticated;

-- Ajouter un commentaire
COMMENT ON FUNCTION create_event_safe IS 'Safely create an event with only base columns';