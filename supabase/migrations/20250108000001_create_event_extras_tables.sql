-- Migration pour créer toutes les tables d'extras pour les événements
-- Ces tables permettent de stocker tous les extras configurables lors de la création d'événement

-- 1. Table pour les paramètres RSVP
CREATE TABLE IF NOT EXISTS event_rsvp_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    deadline TIMESTAMPTZ NOT NULL,
    reminder_enabled BOOLEAN DEFAULT false,
    reminder_timing TEXT DEFAULT '24h',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id)
);

-- 2. Table pour les coûts/frais de l'événement
CREATE TABLE IF NOT EXISTS event_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table pour les photos de l'événement
CREATE TABLE IF NOT EXISTS event_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    position INT DEFAULT 0,
    caption TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table pour les questionnaires
CREATE TABLE IF NOT EXISTS event_questionnaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    question_type TEXT DEFAULT 'text' CHECK (question_type IN ('text', 'number', 'choice', 'multiple_choice', 'yes_no')),
    position INT DEFAULT 0,
    is_required BOOLEAN DEFAULT false,
    choices JSONB, -- Pour stocker les choix possibles si question_type = 'choice' ou 'multiple_choice'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table pour les réponses au questionnaire
CREATE TABLE IF NOT EXISTS event_questionnaire_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES event_questionnaires(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(question_id, user_id)
);

-- 6. Table pour les items à apporter
CREATE TABLE IF NOT EXISTS event_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity INT DEFAULT 1,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    is_brought BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Table pour les playlists
CREATE TABLE IF NOT EXISTS event_playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    song_title TEXT NOT NULL,
    artist TEXT,
    spotify_url TEXT,
    youtube_url TEXT,
    position INT DEFAULT 0,
    suggested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Ajouter une colonne pour les stickers de couverture si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'cover_stickers'
    ) THEN
        ALTER TABLE events ADD COLUMN cover_stickers JSONB DEFAULT '[]';
    END IF;
END $$;

-- 9. Ajouter des colonnes manquantes à events si nécessaire
DO $$ 
BEGIN
    -- Ajouter start_time si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'start_time'
    ) THEN
        ALTER TABLE events ADD COLUMN start_time TIMESTAMPTZ;
        -- Mettre à jour avec la valeur de date si elle existe
        UPDATE events SET start_time = date WHERE start_time IS NULL;
    END IF;
    
    -- Ajouter end_time si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'end_time'
    ) THEN
        ALTER TABLE events ADD COLUMN end_time TIMESTAMPTZ;
    END IF;
    
    -- Ajouter timezone si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'timezone'
    ) THEN
        ALTER TABLE events ADD COLUMN timezone TEXT DEFAULT 'Europe/Paris';
    END IF;
    
    -- Ajouter venue_name si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'venue_name'
    ) THEN
        ALTER TABLE events ADD COLUMN venue_name TEXT;
    END IF;
    
    -- Ajouter address si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'address'
    ) THEN
        ALTER TABLE events ADD COLUMN address TEXT;
    END IF;
    
    -- Ajouter city si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'city'
    ) THEN
        ALTER TABLE events ADD COLUMN city TEXT;
    END IF;
    
    -- Ajouter postal_code si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'postal_code'
    ) THEN
        ALTER TABLE events ADD COLUMN postal_code TEXT;
    END IF;
    
    -- Ajouter country si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'country'
    ) THEN
        ALTER TABLE events ADD COLUMN country TEXT;
    END IF;
    
    -- Ajouter coordinates si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'coordinates'
    ) THEN
        ALTER TABLE events ADD COLUMN coordinates JSONB;
    END IF;
    
    -- Ajouter privacy si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'privacy'
    ) THEN
        ALTER TABLE events ADD COLUMN privacy TEXT DEFAULT 'public' CHECK (privacy IN ('public', 'private', 'friends'));
    END IF;
    
    -- Ajouter status si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'status'
    ) THEN
        ALTER TABLE events ADD COLUMN status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'cancelled', 'ended'));
    END IF;
END $$;

-- Enable RLS (Row Level Security) pour toutes les nouvelles tables
ALTER TABLE event_rsvp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_playlists ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour event_rsvp_settings
CREATE POLICY "Les utilisateurs peuvent voir les paramètres RSVP des événements publics ou auxquels ils participent"
    ON event_rsvp_settings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_rsvp_settings.event_id
            AND (
                e.is_private = false
                OR e.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM event_participants ep
                    WHERE ep.event_id = e.id AND ep.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Le créateur de l'événement peut gérer les paramètres RSVP"
    ON event_rsvp_settings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_rsvp_settings.event_id
            AND e.created_by = auth.uid()
        )
    );

-- Politiques RLS pour event_costs
CREATE POLICY "Les utilisateurs peuvent voir les coûts des événements publics ou auxquels ils participent"
    ON event_costs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_costs.event_id
            AND (
                e.is_private = false
                OR e.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM event_participants ep
                    WHERE ep.event_id = e.id AND ep.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Le créateur de l'événement peut gérer les coûts"
    ON event_costs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_costs.event_id
            AND e.created_by = auth.uid()
        )
    );

-- Politiques RLS pour event_photos
CREATE POLICY "Les utilisateurs peuvent voir les photos des événements publics ou auxquels ils participent"
    ON event_photos FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_photos.event_id
            AND (
                e.is_private = false
                OR e.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM event_participants ep
                    WHERE ep.event_id = e.id AND ep.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Le créateur de l'événement et les participants peuvent ajouter des photos"
    ON event_photos FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_photos.event_id
            AND (
                e.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM event_participants ep
                    WHERE ep.event_id = e.id AND ep.user_id = auth.uid()
                )
            )
        )
    );

-- Politiques RLS pour event_questionnaires
CREATE POLICY "Les utilisateurs peuvent voir les questionnaires des événements auxquels ils participent"
    ON event_questionnaires FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_questionnaires.event_id
            AND (
                e.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM event_participants ep
                    WHERE ep.event_id = e.id AND ep.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Le créateur de l'événement peut gérer les questionnaires"
    ON event_questionnaires FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_questionnaires.event_id
            AND e.created_by = auth.uid()
        )
    );

-- Politiques RLS pour event_questionnaire_responses
CREATE POLICY "Les utilisateurs peuvent voir leurs propres réponses"
    ON event_questionnaire_responses FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Les utilisateurs peuvent répondre aux questionnaires des événements auxquels ils participent"
    ON event_questionnaire_responses FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM event_questionnaires eq
            JOIN events e ON e.id = eq.event_id
            WHERE eq.id = event_questionnaire_responses.question_id
            AND EXISTS (
                SELECT 1 FROM event_participants ep
                WHERE ep.event_id = e.id AND ep.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Les utilisateurs peuvent modifier leurs propres réponses"
    ON event_questionnaire_responses FOR UPDATE
    USING (user_id = auth.uid());

-- Politiques RLS pour event_items
CREATE POLICY "Les utilisateurs peuvent voir les items des événements auxquels ils participent"
    ON event_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_items.event_id
            AND (
                e.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM event_participants ep
                    WHERE ep.event_id = e.id AND ep.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Le créateur de l'événement peut gérer les items"
    ON event_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_items.event_id
            AND e.created_by = auth.uid()
        )
    );

CREATE POLICY "Les participants peuvent s'assigner des items"
    ON event_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_items.event_id
            AND EXISTS (
                SELECT 1 FROM event_participants ep
                WHERE ep.event_id = e.id AND ep.user_id = auth.uid()
            )
        )
    );

-- Politiques RLS pour event_playlists
CREATE POLICY "Les utilisateurs peuvent voir les playlists des événements publics ou auxquels ils participent"
    ON event_playlists FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_playlists.event_id
            AND (
                e.is_private = false
                OR e.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM event_participants ep
                    WHERE ep.event_id = e.id AND ep.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Le créateur et les participants peuvent ajouter des chansons"
    ON event_playlists FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_playlists.event_id
            AND (
                e.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM event_participants ep
                    WHERE ep.event_id = e.id AND ep.user_id = auth.uid()
                )
            )
        )
    );

-- Indexes pour les performances
CREATE INDEX IF NOT EXISTS idx_event_rsvp_settings_event_id ON event_rsvp_settings(event_id);
CREATE INDEX IF NOT EXISTS idx_event_costs_event_id ON event_costs(event_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON event_photos(event_id);
CREATE INDEX IF NOT EXISTS idx_event_questionnaires_event_id ON event_questionnaires(event_id);
CREATE INDEX IF NOT EXISTS idx_event_questionnaire_responses_question_id ON event_questionnaire_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_event_questionnaire_responses_user_id ON event_questionnaire_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_event_items_event_id ON event_items(event_id);
CREATE INDEX IF NOT EXISTS idx_event_items_assigned_to ON event_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_event_playlists_event_id ON event_playlists(event_id);

-- Commentaires pour la documentation
COMMENT ON TABLE event_rsvp_settings IS 'Paramètres RSVP pour les événements (deadline, rappels)';
COMMENT ON TABLE event_costs IS 'Coûts et frais associés aux événements';
COMMENT ON TABLE event_photos IS 'Photos associées aux événements';
COMMENT ON TABLE event_questionnaires IS 'Questions posées aux participants lors de l''inscription';
COMMENT ON TABLE event_questionnaire_responses IS 'Réponses des participants aux questionnaires';
COMMENT ON TABLE event_items IS 'Items à apporter pour l''événement';
COMMENT ON TABLE event_playlists IS 'Playlists musicales pour les événements';