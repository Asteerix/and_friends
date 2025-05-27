-- Correction des problèmes de base de données

-- S'assurer que la colonne is_private existe dans events
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'is_private'
    ) THEN
        ALTER TABLE events ADD COLUMN is_private boolean DEFAULT false;
    END IF;
END $$;

-- Mettre à jour les colonnes messages pour correspondre aux hooks
ALTER TABLE messages 
DROP COLUMN IF EXISTS text,
ADD COLUMN IF NOT EXISTS content text,
ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text',
ADD COLUMN IF NOT EXISTS metadata jsonb,
DROP COLUMN IF EXISTS meta,
DROP COLUMN IF EXISTS type;

-- Renommer author_id en user_id pour correspondre aux hooks
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'author_id'
    ) THEN
        ALTER TABLE messages RENAME COLUMN author_id TO user_id;
    END IF;
END $$;

-- Créer des données de test si les tables sont vides
INSERT INTO events (title, description, date, location, created_by, is_private) 
SELECT 
    'Welcome Event',
    'A test event to get you started',
    NOW() + INTERVAL '7 days',
    'Virtual',
    (SELECT id FROM profiles LIMIT 1),
    false
WHERE NOT EXISTS (SELECT 1 FROM events);