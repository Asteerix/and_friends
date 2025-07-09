-- Ajouter les colonnes manquantes à la table events
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS location_details JSONB,
  ADD COLUMN IF NOT EXISTS extra_data JSONB,
  ADD COLUMN IF NOT EXISTS rsvp_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rsvp_reminder_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rsvp_reminder_timing TEXT DEFAULT '24h';

-- Table pour les co-hosts
CREATE TABLE IF NOT EXISTS event_co_hosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    added_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, user_id)
);

-- Table pour les coûts par personne
CREATE TABLE IF NOT EXISTS event_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Table pour les photos d'événements
CREATE TABLE IF NOT EXISTS event_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    caption TEXT,
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Table pour les questionnaires
CREATE TABLE IF NOT EXISTS event_questionnaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'text', -- text, choice, multiple_choice
    options JSONB, -- Pour les questions à choix
    required BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Table pour les réponses aux questionnaires
CREATE TABLE IF NOT EXISTS event_questionnaire_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES event_questionnaires(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    response TEXT,
    response_data JSONB, -- Pour les réponses complexes
    responded_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(question_id, user_id)
);

-- Table pour les items à apporter
CREATE TABLE IF NOT EXISTS event_items_to_bring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Table pour les playlists
CREATE TABLE IF NOT EXISTS event_playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    spotify_link TEXT,
    apple_music_link TEXT,
    deezer_link TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Table pour les autocollants (stickers) placés
CREATE TABLE IF NOT EXISTS event_cover_stickers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    sticker_emoji TEXT NOT NULL,
    position_x DECIMAL(5, 2) NOT NULL, -- Position en pourcentage
    position_y DECIMAL(5, 2) NOT NULL,
    scale DECIMAL(3, 2) DEFAULT 1.0,
    rotation INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Mise à jour de event_participants pour supprimer la colonne inexistante
-- Note: Cette colonne n'existe pas dans la structure actuelle, donc on ne la supprime pas

-- Enable RLS pour les nouvelles tables
ALTER TABLE event_co_hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_items_to_bring ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_cover_stickers ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour event_co_hosts
CREATE POLICY "Users can view co-hosts of public events or events they participate in" ON event_co_hosts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_co_hosts.event_id 
            AND (NOT e.is_private OR e.created_by = auth.uid() OR EXISTS (
                SELECT 1 FROM event_participants ep 
                WHERE ep.event_id = e.id AND ep.user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Event creators can manage co-hosts" ON event_co_hosts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_co_hosts.event_id AND e.created_by = auth.uid()
        )
    );

-- Politiques RLS pour event_costs
CREATE POLICY "Users can view costs of events they participate in" ON event_costs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_costs.event_id 
            AND (e.created_by = auth.uid() OR EXISTS (
                SELECT 1 FROM event_participants ep 
                WHERE ep.event_id = e.id AND ep.user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Event creators can manage costs" ON event_costs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_costs.event_id AND e.created_by = auth.uid()
        )
    );

-- Politiques RLS pour event_photos
CREATE POLICY "Users can view photos of events they participate in" ON event_photos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_photos.event_id 
            AND (NOT e.is_private OR e.created_by = auth.uid() OR EXISTS (
                SELECT 1 FROM event_participants ep 
                WHERE ep.event_id = e.id AND ep.user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Event participants can upload photos" ON event_photos
    FOR INSERT WITH CHECK (
        auth.uid() = uploaded_by AND EXISTS (
            SELECT 1 FROM event_participants ep 
            WHERE ep.event_id = event_photos.event_id AND ep.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own photos" ON event_photos
    FOR DELETE USING (auth.uid() = uploaded_by);

-- Politiques RLS pour event_questionnaires
CREATE POLICY "Users can view questionnaires of events they participate in" ON event_questionnaires
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_questionnaires.event_id 
            AND (e.created_by = auth.uid() OR EXISTS (
                SELECT 1 FROM event_participants ep 
                WHERE ep.event_id = e.id AND ep.user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Event creators can manage questionnaires" ON event_questionnaires
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_questionnaires.event_id AND e.created_by = auth.uid()
        )
    );

-- Politiques RLS pour event_questionnaire_responses
CREATE POLICY "Users can view their own responses" ON event_questionnaire_responses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can submit responses" ON event_questionnaire_responses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own responses" ON event_questionnaire_responses
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Event creators can view all responses" ON event_questionnaire_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_questionnaires q
            JOIN events e ON e.id = q.event_id
            WHERE q.id = event_questionnaire_responses.question_id AND e.created_by = auth.uid()
        )
    );

-- Politiques RLS pour event_items_to_bring
CREATE POLICY "Users can view items of events they participate in" ON event_items_to_bring
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_items_to_bring.event_id 
            AND (e.created_by = auth.uid() OR EXISTS (
                SELECT 1 FROM event_participants ep 
                WHERE ep.event_id = e.id AND ep.user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Event participants can manage items" ON event_items_to_bring
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM event_participants ep 
            WHERE ep.event_id = event_items_to_bring.event_id AND ep.user_id = auth.uid()
        )
    );

-- Politiques RLS pour event_playlists
CREATE POLICY "Users can view playlists of events they participate in" ON event_playlists
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_playlists.event_id 
            AND (NOT e.is_private OR e.created_by = auth.uid() OR EXISTS (
                SELECT 1 FROM event_participants ep 
                WHERE ep.event_id = e.id AND ep.user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Event creators can manage playlists" ON event_playlists
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_playlists.event_id AND e.created_by = auth.uid()
        )
    );

-- Politiques RLS pour event_cover_stickers
CREATE POLICY "Users can view stickers of public events or events they participate in" ON event_cover_stickers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_cover_stickers.event_id 
            AND (NOT e.is_private OR e.created_by = auth.uid() OR EXISTS (
                SELECT 1 FROM event_participants ep 
                WHERE ep.event_id = e.id AND ep.user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Event creators can manage stickers" ON event_cover_stickers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_cover_stickers.event_id AND e.created_by = auth.uid()
        )
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON event_co_hosts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_costs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_photos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_questionnaires TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_questionnaire_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_items_to_bring TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_playlists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_cover_stickers TO authenticated;

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_event_co_hosts_event_id ON event_co_hosts(event_id);
CREATE INDEX IF NOT EXISTS idx_event_costs_event_id ON event_costs(event_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON event_photos(event_id);
CREATE INDEX IF NOT EXISTS idx_event_questionnaires_event_id ON event_questionnaires(event_id);
CREATE INDEX IF NOT EXISTS idx_event_questionnaire_responses_question_id ON event_questionnaire_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_event_items_to_bring_event_id ON event_items_to_bring(event_id);
CREATE INDEX IF NOT EXISTS idx_event_playlists_event_id ON event_playlists(event_id);
CREATE INDEX IF NOT EXISTS idx_event_cover_stickers_event_id ON event_cover_stickers(event_id);

-- Commentaires pour documentation
COMMENT ON TABLE event_co_hosts IS 'Co-organisateurs des événements';
COMMENT ON TABLE event_costs IS 'Coûts par personne pour les événements';
COMMENT ON TABLE event_photos IS 'Photos ajoutées aux événements';
COMMENT ON TABLE event_questionnaires IS 'Questions posées aux participants';
COMMENT ON TABLE event_questionnaire_responses IS 'Réponses des participants aux questionnaires';
COMMENT ON TABLE event_items_to_bring IS 'Items à apporter pour les événements';
COMMENT ON TABLE event_playlists IS 'Playlists musicales des événements';
COMMENT ON TABLE event_cover_stickers IS 'Autocollants placés sur les couvertures d événements';