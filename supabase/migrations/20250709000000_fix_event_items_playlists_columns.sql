-- Migration pour corriger les colonnes manquantes dans event_items et event_playlists

-- 1. Corriger la table event_items
-- Vérifier si la table existe avec la colonne 'name' et la renommer en 'item_name'
DO $$ 
BEGIN
    -- Si la colonne 'name' existe et 'item_name' n'existe pas, renommer
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'event_items' 
        AND column_name = 'name'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'event_items' 
        AND column_name = 'item_name'
    ) THEN
        ALTER TABLE event_items RENAME COLUMN name TO item_name;
    END IF;
    
    -- Si la table event_items n'existe pas, la créer
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'event_items'
    ) THEN
        CREATE TABLE event_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            event_id UUID REFERENCES events(id) ON DELETE CASCADE,
            item_name TEXT NOT NULL,
            quantity INTEGER DEFAULT 1,
            assigned_to UUID REFERENCES profiles(id),
            is_brought BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
    
    -- Ajouter la colonne item_name si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'event_items' 
        AND column_name = 'item_name'
    ) THEN
        ALTER TABLE event_items ADD COLUMN item_name TEXT;
        -- Copier les données de 'name' si elle existe
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'event_items' 
            AND column_name = 'name'
        ) THEN
            UPDATE event_items SET item_name = name WHERE item_name IS NULL;
            ALTER TABLE event_items ALTER COLUMN item_name SET NOT NULL;
        END IF;
    END IF;
END $$;

-- 2. Corriger la table event_playlists
DO $$ 
BEGIN
    -- Si la table event_playlists n'existe pas, la créer
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'event_playlists'
    ) THEN
        CREATE TABLE event_playlists (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            event_id UUID REFERENCES events(id) ON DELETE CASCADE,
            playlist_name TEXT,
            spotify_link TEXT,
            apple_music_link TEXT,
            deezer_link TEXT,
            songs JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
    
    -- Ajouter la colonne apple_music_link si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'event_playlists' 
        AND column_name = 'apple_music_link'
    ) THEN
        ALTER TABLE event_playlists ADD COLUMN apple_music_link TEXT;
        
        -- Si apple_music_url existe, copier les données
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'event_playlists' 
            AND column_name = 'apple_music_url'
        ) THEN
            UPDATE event_playlists SET apple_music_link = apple_music_url WHERE apple_music_link IS NULL;
        END IF;
    END IF;
    
    -- Ajouter les autres colonnes si elles n'existent pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'event_playlists' 
        AND column_name = 'deezer_link'
    ) THEN
        ALTER TABLE event_playlists ADD COLUMN deezer_link TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'event_playlists' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE event_playlists ADD COLUMN created_by UUID REFERENCES profiles(id);
    END IF;
END $$;

-- 3. Nettoyer les tables dupliquées event_items_to_bring si elles existent
-- (puisque le code utilise event_items, pas event_items_to_bring)
DO $$ 
BEGIN
    -- Si event_items_to_bring existe et event_items existe aussi, 
    -- migrer les données et supprimer event_items_to_bring
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'event_items_to_bring'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'event_items'
    ) THEN
        -- Migrer les données si nécessaire
        INSERT INTO event_items (event_id, item_name, quantity, assigned_to, created_at)
        SELECT event_id, item_name, quantity, assigned_to, created_at
        FROM event_items_to_bring
        WHERE NOT EXISTS (
            SELECT 1 FROM event_items 
            WHERE event_items.event_id = event_items_to_bring.event_id 
            AND event_items.item_name = event_items_to_bring.item_name
        );
        
        -- Supprimer la table dupliquée
        DROP TABLE IF EXISTS event_items_to_bring CASCADE;
    END IF;
END $$;

-- 4. Activer RLS sur les tables
ALTER TABLE event_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_playlists ENABLE ROW LEVEL SECURITY;

-- 5. Créer les politiques RLS si elles n'existent pas
-- Politiques pour event_items
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'event_items' 
        AND policyname = 'Users can view items for events they participate in'
    ) THEN
        CREATE POLICY "Users can view items for events they participate in" ON event_items
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM event_participants
                    WHERE event_participants.event_id = event_items.event_id
                    AND event_participants.user_id = auth.uid()
                )
            );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'event_items' 
        AND policyname = 'Users can manage items for events they organize'
    ) THEN
        CREATE POLICY "Users can manage items for events they organize" ON event_items
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM events
                    WHERE events.id = event_items.event_id
                    AND events.created_by = auth.uid()
                )
            );
    END IF;
END $$;

-- Politiques pour event_playlists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'event_playlists' 
        AND policyname = 'Users can view playlists for events they participate in'
    ) THEN
        CREATE POLICY "Users can view playlists for events they participate in" ON event_playlists
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM event_participants
                    WHERE event_participants.event_id = event_playlists.event_id
                    AND event_participants.user_id = auth.uid()
                )
            );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'event_playlists' 
        AND policyname = 'Users can manage playlists for events they organize'
    ) THEN
        CREATE POLICY "Users can manage playlists for events they organize" ON event_playlists
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM events
                    WHERE events.id = event_playlists.event_id
                    AND events.created_by = auth.uid()
                )
            );
    END IF;
END $$;

-- 6. Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_event_items_event_id ON event_items(event_id);
CREATE INDEX IF NOT EXISTS idx_event_playlists_event_id ON event_playlists(event_id);