-- Migration pour corriger la structure des tables d'événements

-- 1. Ajouter les colonnes manquantes à event_costs
ALTER TABLE event_costs 
ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- 2. Recréer event_cohosts avec la bonne structure
-- D'abord sauvegarder les données existantes
CREATE TEMP TABLE temp_event_cohosts AS SELECT * FROM event_cohosts;

-- Supprimer l'ancienne table
DROP TABLE IF EXISTS event_cohosts CASCADE;

-- Recréer avec la bonne structure
CREATE TABLE event_cohosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    permissions TEXT[] DEFAULT ARRAY['view_guests', 'invite_guests'],
    invited_by UUID REFERENCES profiles(id),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Restaurer les données
INSERT INTO event_cohosts (event_id, user_id, added_at)
SELECT event_id, user_id, added_at FROM temp_event_cohosts;

-- Nettoyer
DROP TABLE temp_event_cohosts;

-- 3. S'assurer que event_questionnaire a les bonnes colonnes
DO $$ 
BEGIN
    -- Ajouter question_text si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'event_questionnaire' 
                   AND column_name = 'question_text' 
                   AND table_schema = 'public') THEN
        ALTER TABLE event_questionnaire ADD COLUMN question_text TEXT;
        -- Copier les données de 'question' si elle existe
        UPDATE event_questionnaire SET question_text = question WHERE question_text IS NULL;
    END IF;
    
    -- Ajouter question_type si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'event_questionnaire' 
                   AND column_name = 'question_type' 
                   AND table_schema = 'public') THEN
        ALTER TABLE event_questionnaire ADD COLUMN question_type TEXT;
        -- Copier les données de 'type' si elle existe
        UPDATE event_questionnaire SET question_type = type WHERE question_type IS NULL;
    END IF;
    
    -- Ajouter question_options si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'event_questionnaire' 
                   AND column_name = 'question_options' 
                   AND table_schema = 'public') THEN
        ALTER TABLE event_questionnaire ADD COLUMN question_options JSONB;
        -- Copier les données de 'options' si elle existe
        UPDATE event_questionnaire SET question_options = options WHERE question_options IS NULL;
    END IF;
END $$;

-- 4. Ajouter spotify_link à event_playlists comme alias de spotify_url
ALTER TABLE event_playlists 
ADD COLUMN IF NOT EXISTS spotify_link TEXT;

-- Copier les données existantes
UPDATE event_playlists 
SET spotify_link = spotify_url 
WHERE spotify_link IS NULL AND spotify_url IS NOT NULL;

-- 5. Réactiver RLS
ALTER TABLE event_cohosts ENABLE ROW LEVEL SECURITY;

-- 6. Recréer les politiques RLS pour event_cohosts
CREATE POLICY "Users can view co-hosts of events they participate in" ON event_cohosts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_participants ep 
            WHERE ep.event_id = event_cohosts.event_id AND ep.user_id = auth.uid()
        )
    );

CREATE POLICY "Event creators can manage co-hosts" ON event_cohosts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events e 
            WHERE e.id = event_cohosts.event_id AND e.created_by = auth.uid()
        )
    );

-- 7. Ajouter des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_event_costs_position ON event_costs(position);
CREATE INDEX IF NOT EXISTS idx_event_costs_is_required ON event_costs(is_required);
CREATE INDEX IF NOT EXISTS idx_event_cohosts_event_id ON event_cohosts(event_id);
CREATE INDEX IF NOT EXISTS idx_event_cohosts_user_id ON event_cohosts(user_id);

-- 8. Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON event_cohosts TO authenticated;