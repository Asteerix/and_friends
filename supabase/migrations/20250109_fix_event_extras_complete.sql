-- Migration pour corriger toutes les erreurs liées aux tables d'événements extras

-- 1. Créer la table event_questionnaire si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.event_questionnaire (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'text',
    options JSONB,
    is_required BOOLEAN DEFAULT false,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Créer la table event_cover_stickers si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.event_cover_stickers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    sticker_emoji TEXT NOT NULL,
    position_x FLOAT NOT NULL,
    position_y FLOAT NOT NULL,
    scale FLOAT DEFAULT 1.0,
    rotation FLOAT DEFAULT 0.0,
    z_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Ajouter les colonnes manquantes à event_items
ALTER TABLE public.event_items 
ADD COLUMN IF NOT EXISTS item_name TEXT,
ADD COLUMN IF NOT EXISTS quantity_needed INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS quantity_assigned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Migrer les données existantes si nécessaire
UPDATE public.event_items 
SET item_name = name 
WHERE item_name IS NULL AND name IS NOT NULL;

UPDATE public.event_items 
SET quantity_needed = quantity 
WHERE quantity_needed IS NULL AND quantity IS NOT NULL;

-- 4. Ajouter les colonnes manquantes à event_playlists
ALTER TABLE public.event_playlists 
ADD COLUMN IF NOT EXISTS apple_music_link TEXT,
ADD COLUMN IF NOT EXISTS deezer_link TEXT,
ADD COLUMN IF NOT EXISTS playlist_name TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 5. Créer les index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_event_questionnaire_event_id ON public.event_questionnaire(event_id);
CREATE INDEX IF NOT EXISTS idx_event_cover_stickers_event_id ON public.event_cover_stickers(event_id);

-- 6. Ajouter les politiques RLS (Row Level Security)
ALTER TABLE public.event_questionnaire ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_cover_stickers ENABLE ROW LEVEL SECURITY;

-- Politique pour event_questionnaire : accessible si on peut voir l'événement
CREATE POLICY "event_questionnaire_access" ON public.event_questionnaire
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = event_questionnaire.event_id
            AND (
                e.is_private = false 
                OR e.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.event_participants ep
                    WHERE ep.event_id = e.id AND ep.user_id = auth.uid()
                )
            )
        )
    );

-- Politique pour event_cover_stickers : accessible si on peut voir l'événement
CREATE POLICY "event_cover_stickers_access" ON public.event_cover_stickers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = event_cover_stickers.event_id
            AND (
                e.is_private = false 
                OR e.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.event_participants ep
                    WHERE ep.event_id = e.id AND ep.user_id = auth.uid()
                )
            )
        )
    );

-- 7. Créer des fonctions pour faciliter l'ajout des extras
CREATE OR REPLACE FUNCTION add_event_questionnaire(
    p_event_id UUID,
    p_questions JSONB
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.event_questionnaire (event_id, question, type, options, is_required, position)
    SELECT 
        p_event_id,
        (value->>'question')::TEXT,
        COALESCE(value->>'type', 'text'),
        value->'options',
        COALESCE((value->>'is_required')::BOOLEAN, false),
        (ordinality - 1)
    FROM jsonb_array_elements(p_questions) WITH ORDINALITY;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION add_event_stickers(
    p_event_id UUID,
    p_stickers JSONB
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.event_cover_stickers (event_id, sticker_emoji, position_x, position_y, scale, rotation, z_index)
    SELECT 
        p_event_id,
        (value->>'emoji')::TEXT,
        (value->>'x')::FLOAT,
        (value->>'y')::FLOAT,
        COALESCE((value->>'scale')::FLOAT, 1.0),
        COALESCE((value->>'rotation')::FLOAT, 0.0),
        (ordinality - 1)
    FROM jsonb_array_elements(p_stickers) WITH ORDINALITY;
END;
$$ LANGUAGE plpgsql;

-- 8. Nettoyer et normaliser les données existantes
UPDATE public.event_items 
SET quantity_assigned = 0 
WHERE quantity_assigned IS NULL;

UPDATE public.event_items 
SET position = 0 
WHERE position IS NULL;

UPDATE public.event_playlists 
SET playlist_name = 'Event Playlist' 
WHERE playlist_name IS NULL;

-- Afficher un résumé des corrections
DO $$
BEGIN
    RAISE NOTICE 'Migration terminée avec succès!';
    RAISE NOTICE '- Table event_questionnaire créée/vérifiée';
    RAISE NOTICE '- Table event_cover_stickers créée/vérifiée';
    RAISE NOTICE '- Colonnes manquantes ajoutées à event_items';
    RAISE NOTICE '- Colonnes manquantes ajoutées à event_playlists';
    RAISE NOTICE '- Index et politiques RLS créés';
END $$;