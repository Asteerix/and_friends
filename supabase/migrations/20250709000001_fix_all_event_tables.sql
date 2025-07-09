-- Migration complète pour corriger toutes les erreurs des tables d'événements

-- 1. CORRECTION DE LA TABLE event_items
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
            quantity_needed INTEGER DEFAULT 1,
            quantity_assigned INTEGER DEFAULT 0,
            position INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- 2. CORRECTION DE LA TABLE event_playlists
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
            created_by UUID REFERENCES profiles(id),
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
    END IF;
END $$;

-- 3. CRÉATION DE LA TABLE event_questionnaire (au singulier)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'event_questionnaire'
    ) THEN
        CREATE TABLE event_questionnaire (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            event_id UUID REFERENCES events(id) ON DELETE CASCADE,
            question TEXT NOT NULL,
            question_type TEXT DEFAULT 'text',
            position INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- 4. CRÉATION DE LA TABLE event_cover_stickers
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'event_cover_stickers'
    ) THEN
        CREATE TABLE event_cover_stickers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            event_id UUID REFERENCES events(id) ON DELETE CASCADE,
            sticker_emoji TEXT NOT NULL,
            position_x DECIMAL(5,2),
            position_y DECIMAL(5,2),
            rotation DECIMAL(5,2) DEFAULT 0,
            scale DECIMAL(3,2) DEFAULT 1,
            z_index INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- 5. VÉRIFICATION DES COLONNES event_participants
DO $$ 
BEGIN
    -- Ajouter les colonnes manquantes si nécessaire
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'event_participants' 
        AND column_name = 'invited_by'
    ) THEN
        ALTER TABLE event_participants ADD COLUMN invited_by UUID REFERENCES profiles(id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'event_participants' 
        AND column_name = 'invited_at'
    ) THEN
        ALTER TABLE event_participants ADD COLUMN invited_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 6. ACTIVATION RLS sur toutes les tables
ALTER TABLE event_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_questionnaire ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_cover_stickers ENABLE ROW LEVEL SECURITY;

-- 7. POLITIQUES RLS pour event_items
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

-- 8. POLITIQUES RLS pour event_playlists
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

-- 9. POLITIQUES RLS pour event_questionnaire
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'event_questionnaire' 
        AND policyname = 'Users can view questionnaires for events they participate in'
    ) THEN
        CREATE POLICY "Users can view questionnaires for events they participate in" ON event_questionnaire
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM event_participants
                    WHERE event_participants.event_id = event_questionnaire.event_id
                    AND event_participants.user_id = auth.uid()
                )
            );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'event_questionnaire' 
        AND policyname = 'Users can manage questionnaires for events they organize'
    ) THEN
        CREATE POLICY "Users can manage questionnaires for events they organize" ON event_questionnaire
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM events
                    WHERE events.id = event_questionnaire.event_id
                    AND events.created_by = auth.uid()
                )
            );
    END IF;
END $$;

-- 10. POLITIQUES RLS pour event_cover_stickers
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'event_cover_stickers' 
        AND policyname = 'Users can view stickers for events they participate in'
    ) THEN
        CREATE POLICY "Users can view stickers for events they participate in" ON event_cover_stickers
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM event_participants
                    WHERE event_participants.event_id = event_cover_stickers.event_id
                    AND event_participants.user_id = auth.uid()
                )
            );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'event_cover_stickers' 
        AND policyname = 'Users can manage stickers for events they organize'
    ) THEN
        CREATE POLICY "Users can manage stickers for events they organize" ON event_cover_stickers
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM events
                    WHERE events.id = event_cover_stickers.event_id
                    AND events.created_by = auth.uid()
                )
            );
    END IF;
END $$;

-- 11. CRÉATION DES INDEX pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_event_items_event_id ON event_items(event_id);
CREATE INDEX IF NOT EXISTS idx_event_playlists_event_id ON event_playlists(event_id);
CREATE INDEX IF NOT EXISTS idx_event_questionnaire_event_id ON event_questionnaire(event_id);
CREATE INDEX IF NOT EXISTS idx_event_cover_stickers_event_id ON event_cover_stickers(event_id);

-- 12. VÉRIFICATION DE LA TABLE event_costs
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'event_costs'
    ) THEN
        CREATE TABLE event_costs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            event_id UUID REFERENCES events(id) ON DELETE CASCADE,
            amount DECIMAL(10,2) NOT NULL,
            description TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        ALTER TABLE event_costs ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view costs for events they participate in" ON event_costs
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM event_participants
                    WHERE event_participants.event_id = event_costs.event_id
                    AND event_participants.user_id = auth.uid()
                )
            );
            
        CREATE POLICY "Users can manage costs for events they organize" ON event_costs
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM events
                    WHERE events.id = event_costs.event_id
                    AND events.created_by = auth.uid()
                )
            );
    END IF;
END $$;

-- 13. NETTOYAGE DES TABLES DUPLIQUÉES
DO $$ 
BEGIN
    -- Si event_items_to_bring existe et event_items existe, migrer et supprimer
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'event_items_to_bring'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'event_items'
    ) THEN
        -- Migrer les données
        INSERT INTO event_items (event_id, item_name, quantity_needed, created_at)
        SELECT event_id, item_name, quantity, created_at
        FROM event_items_to_bring
        WHERE NOT EXISTS (
            SELECT 1 FROM event_items 
            WHERE event_items.event_id = event_items_to_bring.event_id 
            AND event_items.item_name = event_items_to_bring.item_name
        );
        
        -- Supprimer la table dupliquée
        DROP TABLE IF EXISTS event_items_to_bring CASCADE;
    END IF;
    
    -- Si event_questionnaires (pluriel) existe, migrer vers event_questionnaire (singulier)
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'event_questionnaires'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'event_questionnaire'
    ) THEN
        -- Migrer les données
        INSERT INTO event_questionnaire (event_id, question, question_type, position, created_at)
        SELECT event_id, question, question_type, position, created_at
        FROM event_questionnaires
        WHERE NOT EXISTS (
            SELECT 1 FROM event_questionnaire 
            WHERE event_questionnaire.event_id = event_questionnaires.event_id 
            AND event_questionnaire.question = event_questionnaires.question
        );
        
        -- Supprimer la table dupliquée
        DROP TABLE IF EXISTS event_questionnaires CASCADE;
    END IF;
END $$;

-- Fin de la migration