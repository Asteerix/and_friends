-- Migration pour améliorer le système de conversation
-- Ajoute les fonctionnalités manquantes pour les demandes d'amis, les messages en attente, etc.

-- 1. Ajouter des colonnes manquantes aux tables existantes

-- Ajouter le statut aux chats (pour les demandes de messages)
ALTER TABLE chats ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'archived'));

-- Ajouter is_pending aux participants (pour les demandes de messages)
ALTER TABLE chat_participants ADD COLUMN IF NOT EXISTS is_pending BOOLEAN DEFAULT FALSE;

-- Ajouter les colonnes manquantes à la table events
ALTER TABLE events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'draft', 'completed'));
ALTER TABLE events ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- 2. Créer la table friend_requests si elle n'existe pas
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  UNIQUE(sender_id, recipient_id)
);

-- 3. Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_chats_event_id ON chats(event_id);
CREATE INDEX IF NOT EXISTS idx_chats_status ON chats(status);
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_user ON chat_participants(chat_id, user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created_at ON messages(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friend_requests_recipient ON friend_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- 4. Créer des fonctions helper pour le système de conversation

-- Fonction pour obtenir le nom d'affichage d'un chat privé
CREATE OR REPLACE FUNCTION get_private_chat_display_name(chat_id UUID, current_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  other_user_name TEXT;
BEGIN
  SELECT COALESCE(p.full_name, p.username, 'Utilisateur')
  INTO other_user_name
  FROM chat_participants cp
  JOIN profiles p ON p.id = cp.user_id
  WHERE cp.chat_id = $1
    AND cp.user_id != $2
  LIMIT 1;
  
  RETURN other_user_name;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour vérifier si deux utilisateurs sont amis
CREATE OR REPLACE FUNCTION are_users_friends(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM friend_requests
    WHERE status = 'accepted'
      AND ((sender_id = user1_id AND recipient_id = user2_id)
        OR (sender_id = user2_id AND recipient_id = user1_id))
  );
END;
$$ LANGUAGE plpgsql;

-- 5. Créer des vues pour simplifier l'accès aux données

-- Vue pour les conversations avec leurs derniers messages
CREATE OR REPLACE VIEW chat_with_last_message AS
SELECT 
  c.*,
  lm.last_message_id,
  lm.last_message_content,
  lm.last_message_created_at,
  lm.last_message_user_id
FROM chats c
LEFT JOIN LATERAL (
  SELECT 
    m.id as last_message_id,
    m.content as last_message_content,
    m.created_at as last_message_created_at,
    m.user_id as last_message_user_id
  FROM messages m
  WHERE m.chat_id = c.id
  ORDER BY m.created_at DESC
  LIMIT 1
) lm ON true;

-- 6. Politiques RLS (Row Level Security)

-- Politiques pour friend_requests
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friend requests" ON friend_requests
  FOR SELECT USING (auth.uid() IN (sender_id, recipient_id));

CREATE POLICY "Users can send friend requests" ON friend_requests
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update friend requests" ON friend_requests
  FOR UPDATE USING (auth.uid() = recipient_id);

-- Politique pour les chats en attente
CREATE POLICY "Users can view pending chats they're part of" ON chats
  FOR SELECT USING (
    status = 'active' 
    OR (status = 'pending' AND EXISTS (
      SELECT 1 FROM chat_participants 
      WHERE chat_id = chats.id AND user_id = auth.uid()
    ))
  );

-- 7. Triggers pour automatiser certaines actions

-- Trigger pour ajouter automatiquement les participants d'un événement au chat
CREATE OR REPLACE FUNCTION add_event_participant_to_chat()
RETURNS TRIGGER AS $$
DECLARE
  event_chat_id UUID;
BEGIN
  -- Trouver le chat de l'événement
  SELECT id INTO event_chat_id
  FROM chats
  WHERE event_id = NEW.event_id
  LIMIT 1;
  
  -- Si un chat existe et que le participant rejoint (status = 'going')
  IF event_chat_id IS NOT NULL AND NEW.status = 'going' THEN
    -- Ajouter au chat s'il n'y est pas déjà
    INSERT INTO chat_participants (chat_id, user_id, is_admin)
    VALUES (event_chat_id, NEW.user_id, FALSE)
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER add_event_participant_to_chat_trigger
AFTER INSERT OR UPDATE OF status ON event_participants
FOR EACH ROW
EXECUTE FUNCTION add_event_participant_to_chat();

-- Trigger pour retirer les participants du chat quand ils quittent l'événement
CREATE OR REPLACE FUNCTION remove_event_participant_from_chat()
RETURNS TRIGGER AS $$
DECLARE
  event_chat_id UUID;
BEGIN
  -- Si le statut passe de 'going' à autre chose
  IF OLD.status = 'going' AND NEW.status != 'going' THEN
    -- Trouver le chat de l'événement
    SELECT id INTO event_chat_id
    FROM chats
    WHERE event_id = OLD.event_id
    LIMIT 1;
    
    -- Retirer du chat
    IF event_chat_id IS NOT NULL THEN
      DELETE FROM chat_participants
      WHERE chat_id = event_chat_id AND user_id = OLD.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER remove_event_participant_from_chat_trigger
AFTER UPDATE OF status ON event_participants
FOR EACH ROW
EXECUTE FUNCTION remove_event_participant_from_chat();

-- 8. Fonction pour créer automatiquement un chat privé quand une demande d'ami est acceptée
CREATE OR REPLACE FUNCTION create_chat_on_friend_accept()
RETURNS TRIGGER AS $$
DECLARE
  new_chat_id UUID;
BEGIN
  -- Si la demande passe à 'accepted'
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Créer un chat privé
    INSERT INTO chats (is_group, created_by)
    VALUES (FALSE, NEW.sender_id)
    RETURNING id INTO new_chat_id;
    
    -- Ajouter les deux participants
    INSERT INTO chat_participants (chat_id, user_id)
    VALUES 
      (new_chat_id, NEW.sender_id),
      (new_chat_id, NEW.recipient_id);
    
    -- Message système de bienvenue
    INSERT INTO messages (chat_id, user_id, content, type)
    VALUES (new_chat_id, NEW.sender_id, 'Vous êtes maintenant amis ! 🎉', 'system');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_chat_on_friend_accept_trigger
AFTER UPDATE OF status ON friend_requests
FOR EACH ROW
EXECUTE FUNCTION create_chat_on_friend_accept();