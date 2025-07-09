-- Script pour s'assurer que toutes les tables et colonnes nécessaires existent
-- pour la création complète d'événements

-- 1. Vérifier et ajouter les colonnes manquantes à la table events
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS subtitle TEXT,
ADD COLUMN IF NOT EXISTS cover_bg_color TEXT,
ADD COLUMN IF NOT EXISTS cover_font TEXT,
ADD COLUMN IF NOT EXISTS cover_image TEXT,
ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS rsvp_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rsvp_reminder_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rsvp_reminder_timing TEXT DEFAULT '24h',
ADD COLUMN IF NOT EXISTS location_details JSONB;

-- 2. Créer la table event_co_hosts si elle n'existe pas
CREATE TABLE IF NOT EXISTS event_co_hosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    added_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, user_id)
);

-- 3. Créer la table event_costs si elle n'existe pas
CREATE TABLE IF NOT EXISTS event_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Créer la table event_photos si elle n'existe pas
CREATE TABLE IF NOT EXISTS event_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    caption TEXT,
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Créer la table event_questionnaires si elle n'existe pas
CREATE TABLE IF NOT EXISTS event_questionnaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'text',
    options JSONB,
    required BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Créer la table event_items_to_bring si elle n'existe pas
CREATE TABLE IF NOT EXISTS event_items_to_bring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Créer la table event_cover_stickers si elle n'existe pas
CREATE TABLE IF NOT EXISTS event_cover_stickers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    sticker_emoji TEXT NOT NULL,
    position_x FLOAT NOT NULL,
    position_y FLOAT NOT NULL,
    scale FLOAT DEFAULT 1,
    rotation FLOAT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Activer RLS sur toutes les tables
ALTER TABLE event_co_hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_items_to_bring ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_cover_stickers ENABLE ROW LEVEL SECURITY;

-- 9. Créer les politiques RLS pour event_co_hosts
CREATE POLICY "Users can view event co-hosts" ON event_co_hosts
    FOR SELECT USING (true);

CREATE POLICY "Event creator can add co-hosts" ON event_co_hosts
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT created_by FROM events WHERE id = event_co_hosts.event_id
        )
    );

-- 10. Créer les politiques RLS pour event_costs
CREATE POLICY "Users can view event costs" ON event_costs
    FOR SELECT USING (true);

CREATE POLICY "Event organizers can manage costs" ON event_costs
    FOR ALL USING (
        auth.uid() IN (
            SELECT created_by FROM events WHERE id = event_costs.event_id
            UNION
            SELECT user_id FROM event_co_hosts WHERE event_id = event_costs.event_id
        )
    );

-- 11. Créer les politiques RLS pour event_photos
CREATE POLICY "Users can view event photos" ON event_photos
    FOR SELECT USING (true);

CREATE POLICY "Event participants can add photos" ON event_photos
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM event_participants WHERE event_id = event_photos.event_id
        )
    );

-- 12. Créer les politiques RLS pour event_questionnaires
CREATE POLICY "Users can view event questionnaires" ON event_questionnaires
    FOR SELECT USING (true);

CREATE POLICY "Event organizers can manage questionnaires" ON event_questionnaires
    FOR ALL USING (
        auth.uid() IN (
            SELECT created_by FROM events WHERE id = event_questionnaires.event_id
            UNION
            SELECT user_id FROM event_co_hosts WHERE event_id = event_questionnaires.event_id
        )
    );

-- 13. Créer les politiques RLS pour event_items_to_bring
CREATE POLICY "Users can view event items" ON event_items_to_bring
    FOR SELECT USING (true);

CREATE POLICY "Event participants can manage items" ON event_items_to_bring
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM event_participants WHERE event_id = event_items_to_bring.event_id
        )
    );

-- 14. Créer les politiques RLS pour event_cover_stickers
CREATE POLICY "Users can view event stickers" ON event_cover_stickers
    FOR SELECT USING (true);

CREATE POLICY "Event organizers can manage stickers" ON event_cover_stickers
    FOR ALL USING (
        auth.uid() IN (
            SELECT created_by FROM events WHERE id = event_cover_stickers.event_id
            UNION
            SELECT user_id FROM event_co_hosts WHERE event_id = event_cover_stickers.event_id
        )
    );

-- 15. Créer les index pour les performances
CREATE INDEX IF NOT EXISTS idx_event_co_hosts_event_id ON event_co_hosts(event_id);
CREATE INDEX IF NOT EXISTS idx_event_costs_event_id ON event_costs(event_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON event_photos(event_id);
CREATE INDEX IF NOT EXISTS idx_event_questionnaires_event_id ON event_questionnaires(event_id);
CREATE INDEX IF NOT EXISTS idx_event_items_event_id ON event_items_to_bring(event_id);
CREATE INDEX IF NOT EXISTS idx_event_stickers_event_id ON event_cover_stickers(event_id);

-- 16. Créer le bucket de stockage s'il n'existe pas
INSERT INTO storage.buckets (id, name, public)
VALUES ('events', 'events', true)
ON CONFLICT (id) DO NOTHING;

-- 17. Politique pour le bucket events
CREATE POLICY "Authenticated users can upload event images" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'events' AND 
    auth.role() = 'authenticated'
);

CREATE POLICY "Public can view event images" ON storage.objects
FOR SELECT USING (bucket_id = 'events');

CREATE POLICY "Users can update their own event images" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'events' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own event images" ON storage.objects
FOR DELETE USING (
    bucket_id = 'events' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Afficher un résumé
DO $$
BEGIN
    RAISE NOTICE 'Script terminé avec succès!';
    RAISE NOTICE 'Tables créées/vérifiées:';
    RAISE NOTICE '- events (avec colonnes extras)';
    RAISE NOTICE '- event_co_hosts';
    RAISE NOTICE '- event_costs';
    RAISE NOTICE '- event_photos';
    RAISE NOTICE '- event_questionnaires';
    RAISE NOTICE '- event_items_to_bring';
    RAISE NOTICE '- event_cover_stickers';
    RAISE NOTICE 'Bucket de stockage: events';
END $$;