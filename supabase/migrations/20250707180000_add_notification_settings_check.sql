-- Fonction pour vérifier si une notification doit être envoyée selon les paramètres utilisateur
CREATE OR REPLACE FUNCTION should_send_notification(
  p_user_id UUID,
  p_notification_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  user_settings JSONB;
  result BOOLEAN := TRUE;
BEGIN
  -- Récupérer les paramètres de l'utilisateur
  SELECT settings INTO user_settings
  FROM profiles
  WHERE id = p_user_id;
  
  -- Si pas de paramètres, on envoie par défaut
  IF user_settings IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Vérifier selon le type de notification
  CASE p_notification_type
    WHEN 'event_invite' THEN
      result := COALESCE((user_settings -> 'notifications' -> 'event_invites')::BOOLEAN, TRUE);
    WHEN 'friend_request', 'friend_accepted' THEN
      result := COALESCE((user_settings -> 'notifications' -> 'friend_requests')::BOOLEAN, TRUE);
    WHEN 'event_reminder' THEN
      result := COALESCE((user_settings -> 'notifications' -> 'event_reminders')::BOOLEAN, TRUE);
    ELSE
      -- Pour tous les autres types, on envoie par défaut
      result := TRUE;
  END CASE;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fonction pour créer une notification avec vérification des paramètres
CREATE OR REPLACE FUNCTION create_notification_with_settings_check(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT DEFAULT NULL,
  p_data JSONB DEFAULT NULL,
  p_related_user_id UUID DEFAULT NULL,
  p_related_id UUID DEFAULT NULL,
  p_related_type TEXT DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  -- Vérifier si l'utilisateur accepte ce type de notification
  IF NOT should_send_notification(p_user_id, p_type) THEN
    RETURN NULL;
  END IF;
  
  -- Créer la notification
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    related_user_id,
    related_id,
    related_type,
    action_url,
    read,
    created_at
  ) VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_data,
    p_related_user_id,
    p_related_id,
    p_related_type,
    p_action_url,
    FALSE,
    NOW()
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fonction pour vérifier la confidentialité avant d'inviter à un événement
CREATE OR REPLACE FUNCTION can_invite_to_event(
  p_inviter_id UUID,
  p_invitee_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  invitee_settings JSONB;
  privacy_setting TEXT;
  are_friends BOOLEAN;
BEGIN
  -- Récupérer les paramètres de confidentialité de l'invité
  SELECT settings INTO invitee_settings
  FROM profiles
  WHERE id = p_invitee_id;
  
  -- Obtenir le paramètre de confidentialité
  privacy_setting := COALESCE(
    (invitee_settings -> 'privacy' -> 'who_can_invite')::TEXT, 
    'Public'
  );
  
  -- Nettoyer les guillemets JSON si présents
  privacy_setting := TRIM(BOTH '"' FROM privacy_setting);
  
  -- Vérifier selon le paramètre
  CASE privacy_setting
    WHEN 'No One' THEN
      RETURN FALSE;
    WHEN 'Friends' THEN
      -- Vérifier si les utilisateurs sont amis
      SELECT EXISTS (
        SELECT 1 FROM friendships
        WHERE status = 'accepted'
        AND ((user_id = p_inviter_id AND friend_id = p_invitee_id)
          OR (user_id = p_invitee_id AND friend_id = p_inviter_id))
      ) INTO are_friends;
      RETURN are_friends;
    ELSE -- 'Public' ou toute autre valeur
      RETURN TRUE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fonction pour vérifier si un profil doit être masqué dans la recherche
CREATE OR REPLACE FUNCTION is_profile_hidden_from_search(
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  user_settings JSONB;
BEGIN
  SELECT settings INTO user_settings
  FROM profiles
  WHERE id = p_user_id;
  
  RETURN COALESCE(
    (user_settings -> 'privacy' -> 'hide_from_search')::BOOLEAN, 
    FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Modifier la fonction search_users pour respecter les paramètres de confidentialité
CREATE OR REPLACE FUNCTION search_users(search_query TEXT, current_user_id UUID)
RETURNS TABLE(
    id UUID,
    username TEXT,
    avatar_url TEXT,
    mutual_friends_count INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.avatar_url,
        0 as mutual_friends_count
    FROM profiles p
    WHERE p.id != current_user_id
    AND NOT is_profile_hidden_from_search(p.id)  -- Respecter le paramètre de confidentialité
    AND (
        p.username ILIKE '%' || search_query || '%'
        OR p.email ILIKE '%' || search_query || '%'
    )
    LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ajouter des commentaires pour la documentation
COMMENT ON FUNCTION should_send_notification IS 'Vérifie si une notification doit être envoyée selon les paramètres utilisateur';
COMMENT ON FUNCTION create_notification_with_settings_check IS 'Crée une notification en respectant les paramètres utilisateur';
COMMENT ON FUNCTION can_invite_to_event IS 'Vérifie si un utilisateur peut inviter un autre à un événement selon ses paramètres de confidentialité';
COMMENT ON FUNCTION is_profile_hidden_from_search IS 'Vérifie si un profil doit être masqué dans les résultats de recherche';