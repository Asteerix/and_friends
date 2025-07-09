-- Migration pour ajouter les colonnes manquantes dans les tables d'événements

-- 1. Ajouter les colonnes manquantes à event_costs
ALTER TABLE event_costs 
ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- 2. Ajouter les colonnes manquantes à event_cohosts
ALTER TABLE event_cohosts 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid() PRIMARY KEY;

-- 3. S'assurer que event_questionnaire a les bonnes colonnes
-- D'abord, renommer les colonnes existantes si nécessaire
DO $$ 
BEGIN
    -- Renommer 'question' en 'question_text' si elle existe
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'event_questionnaire' 
               AND column_name = 'question' 
               AND table_schema = 'public') THEN
        ALTER TABLE event_questionnaire RENAME COLUMN question TO question_text;
    END IF;
    
    -- Renommer 'type' en 'question_type' si elle existe
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'event_questionnaire' 
               AND column_name = 'type' 
               AND table_schema = 'public') THEN
        ALTER TABLE event_questionnaire RENAME COLUMN type TO question_type;
    END IF;
    
    -- Renommer 'options' en 'question_options' si elle existe
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'event_questionnaire' 
               AND column_name = 'options' 
               AND table_schema = 'public') THEN
        ALTER TABLE event_questionnaire RENAME COLUMN options TO question_options;
    END IF;
END $$;

-- 4. Ajouter spotify_link à event_playlists comme alias de spotify_url
ALTER TABLE event_playlists 
ADD COLUMN IF NOT EXISTS spotify_link TEXT;

-- Copier les données existantes
UPDATE event_playlists 
SET spotify_link = spotify_url 
WHERE spotify_link IS NULL AND spotify_url IS NOT NULL;

-- 5. Vérifier et corriger la structure de event_cohosts
DO $$ 
BEGIN
    -- Si la table n'a pas de colonne id, l'ajouter
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'event_cohosts' 
                   AND column_name = 'id' 
                   AND table_schema = 'public') THEN
        -- D'abord, supprimer toute contrainte de clé primaire existante
        ALTER TABLE event_cohosts DROP CONSTRAINT IF EXISTS event_cohosts_pkey;
        
        -- Ajouter la colonne id
        ALTER TABLE event_cohosts ADD COLUMN id UUID DEFAULT gen_random_uuid();
        
        -- La rendre PRIMARY KEY
        ALTER TABLE event_cohosts ADD PRIMARY KEY (id);
    END IF;
END $$;

-- 6. Ajouter des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_event_costs_position ON event_costs(position);
CREATE INDEX IF NOT EXISTS idx_event_costs_is_required ON event_costs(is_required);

-- 7. Commentaires sur les nouvelles colonnes
COMMENT ON COLUMN event_costs.is_required IS 'Indique si ce coût est obligatoire pour participer à l''événement';
COMMENT ON COLUMN event_costs.position IS 'Position d''affichage du coût dans la liste';
COMMENT ON COLUMN event_playlists.spotify_link IS 'Alias pour spotify_url pour la compatibilité';