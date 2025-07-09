-- Migration finale pour s'assurer que TOUTES les tables d'extras existent
-- Cette migration corrige les incohérences et assure la compatibilité

-- 1. Ajouter les colonnes manquantes à la table events si elles n'existent pas
ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS extra_data JSONB,
  ADD COLUMN IF NOT EXISTS location_details JSONB,
  ADD COLUMN IF NOT EXISTS rsvp_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rsvp_reminder_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rsvp_reminder_timing TEXT DEFAULT '24h';

-- 2. Créer la table event_costs si elle n'existe pas (version unifiée)
CREATE TABLE IF NOT EXISTS event_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour event_costs
CREATE INDEX IF NOT EXISTS idx_event_costs_event_id ON event_costs(event_id);

-- RLS pour event_costs
ALTER TABLE event_costs ENABLE ROW LEVEL SECURITY;

-- Politiques pour event_costs (drop et recreate pour éviter les doublons)
DROP POLICY IF EXISTS "Users can view costs of events they participate in" ON event_costs;
DROP POLICY IF EXISTS "Event creators can manage costs" ON event_costs;

CREATE POLICY "Users can view costs of events they participate in" ON event_costs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_costs.event_id 
            AND (e.organizer_id = auth.uid() OR EXISTS (
                SELECT 1 FROM event_attendees ea 
                WHERE ea.event_id = e.id AND ea.user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Event creators can manage costs" ON event_costs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_costs.event_id AND e.organizer_id = auth.uid()
        )
    );

-- 3. Créer la table event_photos si elle n'existe pas
CREATE TABLE IF NOT EXISTS event_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    caption TEXT,
    position INTEGER DEFAULT 0,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour event_photos
CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON event_photos(event_id);

-- RLS pour event_photos
ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;

-- Politiques pour event_photos (drop et recreate)
DROP POLICY IF EXISTS "Users can view photos of events they participate in" ON event_photos;
DROP POLICY IF EXISTS "Event participants can upload photos" ON event_photos;
DROP POLICY IF EXISTS "Users can delete their own photos" ON event_photos;

CREATE POLICY "Users can view photos of events they participate in" ON event_photos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_photos.event_id 
            AND (e.privacy = 'public' OR e.organizer_id = auth.uid() OR EXISTS (
                SELECT 1 FROM event_attendees ea 
                WHERE ea.event_id = e.id AND ea.user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Event participants can upload photos" ON event_photos
    FOR INSERT WITH CHECK (
        auth.uid() = uploaded_by AND EXISTS (
            SELECT 1 FROM event_attendees ea 
            WHERE ea.event_id = event_photos.event_id AND ea.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own photos" ON event_photos
    FOR DELETE USING (auth.uid() = uploaded_by);

-- 4. Renommer event_questionnaires en event_questionnaire si nécessaire
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_questionnaires') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_questionnaire') THEN
        ALTER TABLE event_questionnaires RENAME TO event_questionnaire;
    END IF;
END $$;

-- 5. Créer la table event_questionnaire si elle n'existe pas
CREATE TABLE IF NOT EXISTS event_questionnaire (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    question_type TEXT DEFAULT 'text',
    options JSONB,
    is_required BOOLEAN DEFAULT false,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour event_questionnaire
CREATE INDEX IF NOT EXISTS idx_event_questionnaire_event_id ON event_questionnaire(event_id);

-- RLS pour event_questionnaire
ALTER TABLE event_questionnaire ENABLE ROW LEVEL SECURITY;

-- Politiques pour event_questionnaire (drop et recreate)
DROP POLICY IF EXISTS "Users can view questionnaires of events they participate in" ON event_questionnaire;
DROP POLICY IF EXISTS "Event creators can manage questionnaires" ON event_questionnaire;

CREATE POLICY "Users can view questionnaires of events they participate in" ON event_questionnaire
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_questionnaire.event_id 
            AND (e.organizer_id = auth.uid() OR EXISTS (
                SELECT 1 FROM event_attendees ea 
                WHERE ea.event_id = e.id AND ea.user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Event creators can manage questionnaires" ON event_questionnaire
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_questionnaire.event_id AND e.organizer_id = auth.uid()
        )
    );

-- 6. Créer la table event_items_to_bring si elle n'existe pas
CREATE TABLE IF NOT EXISTS event_items_to_bring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour event_items_to_bring
CREATE INDEX IF NOT EXISTS idx_event_items_to_bring_event_id ON event_items_to_bring(event_id);

-- RLS pour event_items_to_bring
ALTER TABLE event_items_to_bring ENABLE ROW LEVEL SECURITY;

-- Politiques pour event_items_to_bring (drop et recreate)
DROP POLICY IF EXISTS "Users can view items of events they participate in" ON event_items_to_bring;
DROP POLICY IF EXISTS "Event participants can manage items" ON event_items_to_bring;

CREATE POLICY "Users can view items of events they participate in" ON event_items_to_bring
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_items_to_bring.event_id 
            AND (e.organizer_id = auth.uid() OR EXISTS (
                SELECT 1 FROM event_attendees ea 
                WHERE ea.event_id = e.id AND ea.user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Event participants can manage items" ON event_items_to_bring
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM event_attendees ea 
            WHERE ea.event_id = event_items_to_bring.event_id AND ea.user_id = auth.uid()
        )
    );

-- 7. Créer la table event_playlists si elle n'existe pas
CREATE TABLE IF NOT EXISTS event_playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    playlist_name TEXT,
    spotify_link TEXT,
    apple_music_link TEXT,
    deezer_link TEXT,
    songs JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour event_playlists
CREATE INDEX IF NOT EXISTS idx_event_playlists_event_id ON event_playlists(event_id);

-- RLS pour event_playlists
ALTER TABLE event_playlists ENABLE ROW LEVEL SECURITY;

-- Politiques pour event_playlists (drop et recreate)
DROP POLICY IF EXISTS "Users can view playlists of public events or events they participate in" ON event_playlists;
DROP POLICY IF EXISTS "Event creators can manage playlists" ON event_playlists;

CREATE POLICY "Users can view playlists of public events or events they participate in" ON event_playlists
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_playlists.event_id 
            AND (e.privacy = 'public' OR e.organizer_id = auth.uid() OR EXISTS (
                SELECT 1 FROM event_attendees ea 
                WHERE ea.event_id = e.id AND ea.user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Event creators can manage playlists" ON event_playlists
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_playlists.event_id AND e.organizer_id = auth.uid()
        )
    );

-- 8. Créer la table event_cover_stickers si elle n'existe pas
CREATE TABLE IF NOT EXISTS event_cover_stickers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    sticker_emoji TEXT NOT NULL,
    position_x DECIMAL(5, 2) NOT NULL,
    position_y DECIMAL(5, 2) NOT NULL,
    scale DECIMAL(3, 2) DEFAULT 1.0,
    rotation INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour event_cover_stickers
CREATE INDEX IF NOT EXISTS idx_event_cover_stickers_event_id ON event_cover_stickers(event_id);

-- RLS pour event_cover_stickers
ALTER TABLE event_cover_stickers ENABLE ROW LEVEL SECURITY;

-- Politiques pour event_cover_stickers (drop et recreate)
DROP POLICY IF EXISTS "Users can view stickers of public events or events they participate in" ON event_cover_stickers;
DROP POLICY IF EXISTS "Event creators can manage stickers" ON event_cover_stickers;

CREATE POLICY "Users can view stickers of public events or events they participate in" ON event_cover_stickers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_cover_stickers.event_id 
            AND (e.privacy = 'public' OR e.organizer_id = auth.uid() OR EXISTS (
                SELECT 1 FROM event_attendees ea 
                WHERE ea.event_id = e.id AND ea.user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Event creators can manage stickers" ON event_cover_stickers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_cover_stickers.event_id AND e.organizer_id = auth.uid()
        )
    );

-- 9. Permissions pour toutes les tables
GRANT SELECT, INSERT, UPDATE, DELETE ON event_costs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_photos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_questionnaire TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_items_to_bring TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_playlists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_cover_stickers TO authenticated;

-- 10. Créer les buckets de storage s'ils n'existent pas (via fonction)
-- Note: Les buckets doivent être créés via le dashboard Supabase ou via l'API
-- Cette migration documente simplement les buckets nécessaires

-- Buckets requis:
-- - 'events' ou 'event-images' : Pour les images de couverture et photos d'événements
-- - 'event-covers' : Pour les couvertures d'événements (optionnel si 'events' est utilisé)
-- - 'event-memories' : Pour les souvenirs d'événements (photos/vidéos après l'événement)

-- Commentaires de documentation
COMMENT ON TABLE event_costs IS 'Coûts par personne pour les événements';
COMMENT ON TABLE event_photos IS 'Photos ajoutées aux événements';
COMMENT ON TABLE event_questionnaire IS 'Questions posées aux participants';
COMMENT ON TABLE event_items_to_bring IS 'Items à apporter pour les événements';
COMMENT ON TABLE event_playlists IS 'Playlists musicales des événements';
COMMENT ON TABLE event_cover_stickers IS 'Autocollants placés sur les couvertures d événements';

-- 11. Vue utile pour debug
CREATE OR REPLACE VIEW event_extras_summary AS
SELECT 
    e.id as event_id,
    e.title as event_title,
    e.created_at,
    (SELECT COUNT(*) FROM event_costs WHERE event_id = e.id) as costs_count,
    (SELECT COUNT(*) FROM event_photos WHERE event_id = e.id) as photos_count,
    (SELECT COUNT(*) FROM event_questionnaire WHERE event_id = e.id) as questions_count,
    (SELECT COUNT(*) FROM event_items_to_bring WHERE event_id = e.id) as items_count,
    (SELECT COUNT(*) FROM event_playlists WHERE event_id = e.id) as playlists_count,
    (SELECT COUNT(*) FROM event_cover_stickers WHERE event_id = e.id) as stickers_count
FROM events e
ORDER BY e.created_at DESC;

-- Grant permission sur la vue
GRANT SELECT ON event_extras_summary TO authenticated;

-- Fin de la migration
-- Cette migration assure que toutes les tables nécessaires existent
-- et que les politiques RLS sont correctement configurées