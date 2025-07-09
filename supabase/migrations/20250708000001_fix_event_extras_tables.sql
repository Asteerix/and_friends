-- Fix et création des tables manquantes pour les extras d'événements

-- 1. Vérifier si la colonne extra_data existe, sinon l'ajouter
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'extra_data'
    ) THEN
        ALTER TABLE events ADD COLUMN extra_data JSONB DEFAULT '{}';
    END IF;
END $$;

-- 2. Créer les tables manquantes pour les extras

-- Table pour les paramètres RSVP
CREATE TABLE IF NOT EXISTS event_rsvp_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE UNIQUE,
    deadline TIMESTAMPTZ NOT NULL,
    reminder_enabled BOOLEAN DEFAULT false,
    reminder_timing TEXT DEFAULT '24h',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour les coûts (si elle n'existe pas)
CREATE TABLE IF NOT EXISTS event_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour les photos (si elle n'existe pas)
CREATE TABLE IF NOT EXISTS event_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    caption TEXT,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour les questionnaires (corriger le nom)
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

-- Table pour les items à apporter
CREATE TABLE IF NOT EXISTS event_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    assigned_to UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour les playlists
CREATE TABLE IF NOT EXISTS event_playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    song_title TEXT,
    artist TEXT,
    spotify_url TEXT,
    apple_music_url TEXT,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour les stickers de couverture
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS cover_stickers JSONB DEFAULT '[]';

-- Ajouter les colonnes manquantes à event_participants
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'event_participants' 
        AND column_name = 'event_created_by'
    ) THEN
        ALTER TABLE event_participants ADD COLUMN event_created_by UUID REFERENCES profiles(id);
    END IF;
END $$;

-- Enable RLS sur toutes les nouvelles tables
ALTER TABLE event_rsvp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_playlists ENABLE ROW LEVEL SECURITY;

-- Policies pour event_rsvp_settings
CREATE POLICY "Users can view RSVP settings for accessible events" ON event_rsvp_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_rsvp_settings.event_id 
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

CREATE POLICY "Event creators can manage RSVP settings" ON event_rsvp_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_rsvp_settings.event_id AND created_by = auth.uid()
        )
    );

-- Policies pour event_costs
CREATE POLICY "Users can view costs for accessible events" ON event_costs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_costs.event_id 
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

CREATE POLICY "Event creators can manage costs" ON event_costs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_costs.event_id AND created_by = auth.uid()
        )
    );

-- Policies pour event_photos
CREATE POLICY "Users can view photos for accessible events" ON event_photos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_photos.event_id 
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

CREATE POLICY "Event creators can manage photos" ON event_photos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_photos.event_id AND created_by = auth.uid()
        )
    );

-- Policies pour event_questionnaires
CREATE POLICY "Users can view questionnaire for accessible events" ON event_questionnaires
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_questionnaires.event_id 
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

CREATE POLICY "Event creators can manage questionnaire" ON event_questionnaires
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_questionnaires.event_id AND created_by = auth.uid()
        )
    );

-- Policies pour event_items
CREATE POLICY "Users can view items for accessible events" ON event_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_items.event_id 
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

CREATE POLICY "Event participants can manage items" ON event_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_items.event_id 
            AND (
                created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM event_participants 
                    WHERE event_id = events.id AND user_id = auth.uid()
                )
            )
        )
    );

-- Policies pour event_playlists
CREATE POLICY "Users can view playlists for accessible events" ON event_playlists
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_playlists.event_id 
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

CREATE POLICY "Event creators can manage playlists" ON event_playlists
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_playlists.event_id AND created_by = auth.uid()
        )
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON event_rsvp_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_costs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_photos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_questionnaires TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_playlists TO authenticated;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_event_rsvp_settings_event_id ON event_rsvp_settings(event_id);
CREATE INDEX IF NOT EXISTS idx_event_costs_event_id ON event_costs(event_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON event_photos(event_id);
CREATE INDEX IF NOT EXISTS idx_event_questionnaires_event_id ON event_questionnaires(event_id);
CREATE INDEX IF NOT EXISTS idx_event_items_event_id ON event_items(event_id);
CREATE INDEX IF NOT EXISTS idx_event_playlists_event_id ON event_playlists(event_id);

-- Créer la table de log de migration si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.migration_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log cette migration
INSERT INTO public.migration_log (name, executed_at) 
VALUES ('20250708000001_fix_event_extras_tables.sql', NOW())
ON CONFLICT (name) DO NOTHING;