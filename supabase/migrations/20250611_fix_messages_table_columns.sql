-- Migration pour corriger les incohérences de colonnes dans la table messages
-- et ajouter les colonnes manquantes pour le système de conversation complet

-- 1. Renommer les colonnes existantes pour correspondre au code
ALTER TABLE messages RENAME COLUMN author_id TO user_id;
ALTER TABLE messages RENAME COLUMN text TO content;
ALTER TABLE messages RENAME COLUMN meta TO metadata;
ALTER TABLE messages RENAME COLUMN type TO message_type;

-- 2. Ajouter les colonnes manquantes
ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_by UUID[] DEFAULT ARRAY[]::UUID[];

-- 3. Ajouter une contrainte pour message_type
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_message_type_check 
  CHECK (message_type IN ('text', 'image', 'video', 'audio', 'voice', 'file', 'location', 'poll', 'event_share', 'story_reply', 'system'));

-- 4. Mettre à jour les politiques RLS pour utiliser les nouveaux noms de colonnes
DROP POLICY IF EXISTS "Users can send messages to their chats" ON messages;
CREATE POLICY "Users can send messages to their chats" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    auth.uid() IN (
      SELECT user_id FROM chat_participants WHERE chat_id = messages.chat_id
    )
  );

-- 5. Ajouter un trigger pour updated_at sur messages
CREATE TRIGGER update_messages_updated_at 
  BEFORE UPDATE ON messages 
  FOR EACH ROW 
  EXECUTE PROCEDURE update_updated_at_column();

-- 6. Créer des index supplémentaires pour les performances
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_is_deleted ON messages(is_deleted) WHERE is_deleted = false;

-- 7. Mettre à jour les messages système existants pour avoir le bon type
UPDATE messages 
SET message_type = 'system' 
WHERE message_type = 'text' 
  AND content LIKE '%a rejoint%' 
  OR content LIKE '%a quitté%'
  OR content LIKE '%a été créé%'
  OR content LIKE '%annulé%';

-- 8. Ajouter une fonction pour obtenir les messages non lus
CREATE OR REPLACE FUNCTION get_unread_messages_count(p_chat_id UUID, p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN COUNT(*)
  FROM messages
  WHERE chat_id = p_chat_id
    AND user_id != p_user_id
    AND NOT (p_user_id = ANY(read_by))
    AND is_deleted = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Fonction pour marquer les messages comme lus
CREATE OR REPLACE FUNCTION mark_messages_as_read(p_message_ids UUID[], p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE messages
  SET read_by = array_append(read_by, p_user_id)
  WHERE id = ANY(p_message_ids)
    AND NOT (p_user_id = ANY(read_by));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Vue pour obtenir les derniers messages de chaque chat
CREATE OR REPLACE VIEW chat_last_messages AS
SELECT DISTINCT ON (chat_id)
  chat_id,
  id as message_id,
  user_id,
  content,
  message_type,
  created_at
FROM messages
WHERE is_deleted = false
ORDER BY chat_id, created_at DESC;