-- Migration complète pour garantir que TOUTES les tables et colonnes nécessaires existent
-- Cette migration unifie et corrige toutes les structures pour les événements

-- =====================================================
-- 1. D'ABORD, S'ASSURER QUE LA TABLE EVENTS A TOUTES LES COLONNES
-- =====================================================

-- Ajouter la colonne extra_data si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'extra_data'
    ) THEN
        ALTER TABLE events ADD COLUMN extra_data JSONB DEFAULT '{}';
    END IF;
END $$;

-- Ajouter les colonnes de localisation
DO $$ 
BEGIN
    -- Colonnes de base pour la localisation
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'venue_name') THEN
        ALTER TABLE events ADD COLUMN venue_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'address') THEN
        ALTER TABLE events ADD COLUMN address TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'city') THEN
        ALTER TABLE events ADD COLUMN city TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'postal_code') THEN
        ALTER TABLE events ADD COLUMN postal_code TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'country') THEN
        ALTER TABLE events ADD COLUMN country TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'coordinates') THEN
        ALTER TABLE events ADD COLUMN coordinates JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'location_details') THEN
        ALTER TABLE events ADD COLUMN location_details JSONB;
    END IF;
END $$;

-- Ajouter les colonnes temporelles
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'start_time') THEN
        ALTER TABLE events ADD COLUMN start_time TIMESTAMPTZ;
        -- Migrer depuis 'date' si elle existe
        UPDATE events SET start_time = date WHERE start_time IS NULL AND date IS NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'end_time') THEN
        ALTER TABLE events ADD COLUMN end_time TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'timezone') THEN
        ALTER TABLE events ADD COLUMN timezone TEXT DEFAULT 'Europe/Paris';
    END IF;
END $$;

-- Ajouter les colonnes de configuration
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'category') THEN
        ALTER TABLE events ADD COLUMN category TEXT DEFAULT 'social';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'max_attendees') THEN
        ALTER TABLE events ADD COLUMN max_attendees INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'current_attendees') THEN
        ALTER TABLE events ADD COLUMN current_attendees INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'price') THEN
        ALTER TABLE events ADD COLUMN price DECIMAL(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'currency') THEN
        ALTER TABLE events ADD COLUMN currency VARCHAR(3) DEFAULT 'EUR';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'status') THEN
        ALTER TABLE events ADD COLUMN status TEXT DEFAULT 'published' 
            CHECK (status IN ('draft', 'published', 'ongoing', 'ended', 'cancelled'));
    END IF;
END $$;

-- Ajouter les colonnes RSVP
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'rsvp_deadline') THEN
        ALTER TABLE events ADD COLUMN rsvp_deadline TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'rsvp_reminder_enabled') THEN
        ALTER TABLE events ADD COLUMN rsvp_reminder_enabled BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'rsvp_reminder_timing') THEN
        ALTER TABLE events ADD COLUMN rsvp_reminder_timing TEXT DEFAULT '24h';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'approval_required') THEN
        ALTER TABLE events ADD COLUMN approval_required BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'waitlist_enabled') THEN
        ALTER TABLE events ADD COLUMN waitlist_enabled BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Ajouter la colonne pour les stickers
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'cover_stickers') THEN
        ALTER TABLE events ADD COLUMN cover_stickers JSONB DEFAULT '[]';
    END IF;
END $$;

-- =====================================================
-- 2. CRÉER LES TABLES D'EXTRAS SI ELLES N'EXISTENT PAS
-- =====================================================

-- Table pour les co-hosts
CREATE TABLE IF NOT EXISTS event_co_hosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    added_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Table pour les paramètres RSVP (backup si pas dans events)
CREATE TABLE IF NOT EXISTS event_rsvp_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE UNIQUE,
    deadline TIMESTAMPTZ NOT NULL,
    reminder_enabled BOOLEAN DEFAULT false,
    reminder_timing TEXT DEFAULT '24h',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour les coûts
CREATE TABLE IF NOT EXISTS event_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour les photos
CREATE TABLE IF NOT EXISTS event_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    caption TEXT,
    position INTEGER DEFAULT 0,
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour les questionnaires
CREATE TABLE IF NOT EXISTS event_questionnaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    question_type TEXT CHECK (question_type IN ('text', 'number', 'choice', 'multiple')) DEFAULT 'text',
    options JSONB,
    position INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour les réponses au questionnaire
CREATE TABLE IF NOT EXISTS event_questionnaire_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES event_questionnaires(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(question_id, user_id)
);

-- Table pour les items à apporter
CREATE TABLE IF NOT EXISTS event_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    assigned_to UUID REFERENCES profiles(id),
    is_brought BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour les playlists
CREATE TABLE IF NOT EXISTS event_playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    playlist_name TEXT,
    song_title TEXT,
    artist TEXT,
    spotify_url TEXT,
    spotify_link TEXT, -- Pour le lien de playlist complète
    position INTEGER DEFAULT 0,
    songs JSONB, -- Pour stocker la playlist complète si nécessaire
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour les stickers de couverture (alternative à la colonne JSONB)
CREATE TABLE IF NOT EXISTS event_cover_stickers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    sticker_emoji TEXT NOT NULL,
    position_x FLOAT NOT NULL,
    position_y FLOAT NOT NULL,
    scale FLOAT DEFAULT 1.0,
    rotation FLOAT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. AJOUTER DES COLONNES MANQUANTES AUX TABLES EXISTANTES
-- =====================================================

-- Fixer la table event_participants
DO $$ 
BEGIN
    -- Ajouter role si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_participants' AND column_name = 'role'
    ) THEN
        ALTER TABLE event_participants ADD COLUMN role TEXT DEFAULT 'attendee' 
            CHECK (role IN ('organizer', 'co-host', 'attendee'));
    END IF;
    
    -- Ajouter invited_by si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_participants' AND column_name = 'invited_by'
    ) THEN
        ALTER TABLE event_participants ADD COLUMN invited_by UUID REFERENCES profiles(id);
    END IF;
END $$;

-- =====================================================
-- 4. ACTIVER RLS SUR TOUTES LES TABLES
-- =====================================================

ALTER TABLE event_co_hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_cover_stickers ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. CRÉER LES POLITIQUES RLS
-- =====================================================

-- Policies pour event_co_hosts
DROP POLICY IF EXISTS "view_co_hosts" ON event_co_hosts;
CREATE POLICY "view_co_hosts" ON event_co_hosts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_co_hosts.event_id 
            AND (
                NOT is_private 
                OR created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM event_participants 
                    WHERE event_id = events.id AND user_id = auth.uid()
                )
            )
        )
    );

DROP POLICY IF EXISTS "manage_co_hosts" ON event_co_hosts;
CREATE POLICY "manage_co_hosts" ON event_co_hosts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_co_hosts.event_id AND created_by = auth.uid()
        )
    );

-- Policies simplifiées pour les autres tables (vue pour tous, gestion pour créateur)
-- event_costs
DROP POLICY IF EXISTS "view_costs" ON event_costs;
CREATE POLICY "view_costs" ON event_costs FOR SELECT USING (true);

DROP POLICY IF EXISTS "manage_costs" ON event_costs;
CREATE POLICY "manage_costs" ON event_costs FOR ALL USING (
    EXISTS (SELECT 1 FROM events WHERE id = event_costs.event_id AND created_by = auth.uid())
);

-- event_photos
DROP POLICY IF EXISTS "view_photos" ON event_photos;
CREATE POLICY "view_photos" ON event_photos FOR SELECT USING (true);

DROP POLICY IF EXISTS "manage_photos" ON event_photos;
CREATE POLICY "manage_photos" ON event_photos FOR ALL USING (
    EXISTS (SELECT 1 FROM events WHERE id = event_photos.event_id AND created_by = auth.uid())
);

-- event_questionnaires
DROP POLICY IF EXISTS "view_questionnaires" ON event_questionnaires;
CREATE POLICY "view_questionnaires" ON event_questionnaires FOR SELECT USING (true);

DROP POLICY IF EXISTS "manage_questionnaires" ON event_questionnaires;
CREATE POLICY "manage_questionnaires" ON event_questionnaires FOR ALL USING (
    EXISTS (SELECT 1 FROM events WHERE id = event_questionnaires.event_id AND created_by = auth.uid())
);

-- event_items
DROP POLICY IF EXISTS "view_items" ON event_items;
CREATE POLICY "view_items" ON event_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "manage_items" ON event_items;
CREATE POLICY "manage_items" ON event_items FOR ALL USING (
    EXISTS (SELECT 1 FROM events WHERE id = event_items.event_id AND created_by = auth.uid())
);

-- event_playlists
DROP POLICY IF EXISTS "view_playlists" ON event_playlists;
CREATE POLICY "view_playlists" ON event_playlists FOR SELECT USING (true);

DROP POLICY IF EXISTS "manage_playlists" ON event_playlists;
CREATE POLICY "manage_playlists" ON event_playlists FOR ALL USING (
    EXISTS (SELECT 1 FROM events WHERE id = event_playlists.event_id AND created_by = auth.uid())
);

-- event_cover_stickers
DROP POLICY IF EXISTS "view_stickers" ON event_cover_stickers;
CREATE POLICY "view_stickers" ON event_cover_stickers FOR SELECT USING (true);

DROP POLICY IF EXISTS "manage_stickers" ON event_cover_stickers;
CREATE POLICY "manage_stickers" ON event_cover_stickers FOR ALL USING (
    EXISTS (SELECT 1 FROM events WHERE id = event_cover_stickers.event_id AND created_by = auth.uid())
);

-- =====================================================
-- 6. CRÉER LES INDEX POUR LES PERFORMANCES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_event_co_hosts_event_id ON event_co_hosts(event_id);
CREATE INDEX IF NOT EXISTS idx_event_co_hosts_user_id ON event_co_hosts(user_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvp_settings_event_id ON event_rsvp_settings(event_id);
CREATE INDEX IF NOT EXISTS idx_event_costs_event_id ON event_costs(event_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON event_photos(event_id);
CREATE INDEX IF NOT EXISTS idx_event_questionnaires_event_id ON event_questionnaires(event_id);
CREATE INDEX IF NOT EXISTS idx_event_items_event_id ON event_items(event_id);
CREATE INDEX IF NOT EXISTS idx_event_playlists_event_id ON event_playlists(event_id);
CREATE INDEX IF NOT EXISTS idx_event_cover_stickers_event_id ON event_cover_stickers(event_id);

-- Index sur events
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_is_private ON events(is_private);

-- =====================================================
-- 7. CRÉER LES STORAGE BUCKETS SI NÉCESSAIRE
-- =====================================================

-- Note: Les buckets doivent être créés via le dashboard Supabase ou l'API admin
-- Les buckets nécessaires sont:
-- - 'events' ou 'event-images' pour les images de couverture et photos

-- =====================================================
-- 8. FONCTION HELPER POUR DEBUG
-- =====================================================

CREATE OR REPLACE FUNCTION check_event_tables()
RETURNS TABLE (
    table_name TEXT,
    exists BOOLEAN,
    column_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.table_name::TEXT,
        true as exists,
        COUNT(c.column_name)::INTEGER as column_count
    FROM information_schema.tables t
    LEFT JOIN information_schema.columns c ON c.table_name = t.table_name
    WHERE t.table_schema = 'public' 
    AND t.table_name IN (
        'events', 'event_participants', 'event_co_hosts', 
        'event_rsvp_settings', 'event_costs', 'event_photos',
        'event_questionnaires', 'event_questionnaire_responses',
        'event_items', 'event_playlists', 'event_cover_stickers'
    )
    GROUP BY t.table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_event_tables() TO authenticated;

-- =====================================================
-- 9. COMMENTAIRES POUR LA DOCUMENTATION
-- =====================================================

COMMENT ON TABLE event_co_hosts IS 'Co-organisateurs des événements';
COMMENT ON TABLE event_rsvp_settings IS 'Paramètres RSVP pour les événements';
COMMENT ON TABLE event_costs IS 'Coûts et frais associés aux événements';
COMMENT ON TABLE event_photos IS 'Photos des événements';
COMMENT ON TABLE event_questionnaires IS 'Questions pour les participants';
COMMENT ON TABLE event_questionnaire_responses IS 'Réponses au questionnaire';
COMMENT ON TABLE event_items IS 'Items à apporter pour l événement';
COMMENT ON TABLE event_playlists IS 'Playlists musicales des événements';
COMMENT ON TABLE event_cover_stickers IS 'Stickers placés sur la couverture';

COMMENT ON COLUMN events.extra_data IS 'Données JSON pour stocker tous les extras non structurés';
COMMENT ON COLUMN events.location_details IS 'Détails complets de localisation en JSON';
COMMENT ON COLUMN events.cover_stickers IS 'Stickers de couverture stockés en JSON';

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================
-- Cette migration garantit que TOUTES les tables et colonnes nécessaires
-- existent pour la création d'événements avec tous les extras