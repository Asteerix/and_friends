-- Migration complète pour corriger la table events et toutes les tables associées
-- Cette migration ajoute toutes les colonnes manquantes identifiées dans EventServiceV3

-- ============================================
-- 1. AJOUTER LES COLONNES MANQUANTES À EVENTS
-- ============================================

-- Colonnes de base manquantes
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- Colonnes d'organisation
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS organizer_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS co_organizers UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'social',
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Colonnes de participation
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS max_attendees INTEGER,
ADD COLUMN IF NOT EXISTS current_attendees INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS waitlist_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approval_required BOOLEAN DEFAULT false;

-- Colonnes de prix
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS payment_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS refund_policy TEXT;

-- Colonnes RSVP
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS rsvp_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rsvp_reminder_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rsvp_reminder_timing TEXT DEFAULT '24h';

-- Colonnes supplémentaires
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS recurrence_rule TEXT,
ADD COLUMN IF NOT EXISTS indoor_map_url TEXT,
ADD COLUMN IF NOT EXISTS age_restriction INTEGER,
ADD COLUMN IF NOT EXISTS dress_code TEXT,
ADD COLUMN IF NOT EXISTS what_to_bring TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sponsored BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cover_data JSONB DEFAULT '{}';

-- Vérifier et ajouter les contraintes de check si elles n'existent pas
DO $$ 
BEGIN
    -- Check constraint pour privacy
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'events_privacy_check' 
        AND conrelid = 'public.events'::regclass
    ) THEN
        ALTER TABLE public.events 
        ADD CONSTRAINT events_privacy_check 
        CHECK (privacy IN ('public', 'friends', 'invite-only', 'secret'));
    END IF;

    -- Check constraint pour status
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'events_status_check' 
        AND conrelid = 'public.events'::regclass
    ) THEN
        ALTER TABLE public.events 
        ADD CONSTRAINT events_status_check 
        CHECK (status IN ('draft', 'published', 'ongoing', 'ended', 'cancelled'));
    END IF;
END $$;

-- ============================================
-- 2. CRÉER LA TABLE EVENT_ATTENDEES (au lieu de event_participants)
-- ============================================

CREATE TABLE IF NOT EXISTS public.event_attendees (
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going')),
    responded_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    invited_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (event_id, user_id)
);

-- Indexes pour event_attendees
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON public.event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id ON public.event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_status ON public.event_attendees(status);

-- ============================================
-- 3. VÉRIFIER ET CRÉER LES TABLES D'EXTRAS SI MANQUANTES
-- ============================================

-- Table event_questionnaire (noter le singulier)
CREATE TABLE IF NOT EXISTS public.event_questionnaire (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    question_type TEXT DEFAULT 'text' CHECK (question_type IN ('text', 'number', 'choice', 'multiple_choice', 'yes_no')),
    options JSONB,
    is_required BOOLEAN DEFAULT false,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Index pour event_questionnaire
CREATE INDEX IF NOT EXISTS idx_event_questionnaire_event_id ON public.event_questionnaire(event_id);

-- ============================================
-- 4. ACTIVER RLS SUR LES NOUVELLES TABLES
-- ============================================

ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_questionnaire ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. CRÉER LES POLITIQUES RLS POUR EVENT_ATTENDEES
-- ============================================

-- Politique pour voir les participants
CREATE POLICY "Users can view event attendees" ON public.event_attendees
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = event_attendees.event_id
            AND (
                e.privacy = 'public' 
                OR e.organizer_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.event_attendees ea
                    WHERE ea.event_id = e.id 
                    AND ea.user_id = auth.uid()
                )
            )
        )
    );

-- Politique pour s'inscrire à un événement
CREATE POLICY "Users can join events" ON public.event_attendees
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid() 
        OR invited_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = event_attendees.event_id
            AND e.organizer_id = auth.uid()
        )
    );

-- Politique pour mettre à jour sa participation
CREATE POLICY "Users can update their attendance" ON public.event_attendees
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Politique pour se désinscrire
CREATE POLICY "Users can leave events" ON public.event_attendees
    FOR DELETE
    USING (user_id = auth.uid());

-- ============================================
-- 6. CRÉER LES POLITIQUES RLS POUR EVENT_QUESTIONNAIRE
-- ============================================

-- Politique pour voir les questionnaires
CREATE POLICY "Users can view questionnaires for events they can see" ON public.event_questionnaire
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = event_questionnaire.event_id
            AND (
                e.privacy = 'public' 
                OR e.organizer_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.event_attendees ea
                    WHERE ea.event_id = e.id 
                    AND ea.user_id = auth.uid()
                )
            )
        )
    );

-- Politique pour créer des questionnaires (organisateurs seulement)
CREATE POLICY "Event organizers can create questionnaires" ON public.event_questionnaire
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = event_questionnaire.event_id
            AND (e.organizer_id = auth.uid() OR auth.uid() = ANY(e.co_organizers))
        )
    );

-- Politique pour modifier des questionnaires
CREATE POLICY "Event organizers can update questionnaires" ON public.event_questionnaire
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = event_questionnaire.event_id
            AND (e.organizer_id = auth.uid() OR auth.uid() = ANY(e.co_organizers))
        )
    );

-- Politique pour supprimer des questionnaires
CREATE POLICY "Event organizers can delete questionnaires" ON public.event_questionnaire
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = event_questionnaire.event_id
            AND (e.organizer_id = auth.uid() OR auth.uid() = ANY(e.co_organizers))
        )
    );

-- ============================================
-- 7. MIGRER LES DONNÉES EXISTANTES SI NÉCESSAIRE
-- ============================================

-- Migrer created_by vers organizer_id si nécessaire
UPDATE public.events 
SET organizer_id = created_by 
WHERE organizer_id IS NULL AND created_by IS NOT NULL;

-- Migrer les participants existants vers event_attendees
INSERT INTO public.event_attendees (event_id, user_id, status, responded_at)
SELECT 
    ep.event_id,
    ep.user_id,
    ep.status,
    ep.joined_at
FROM public.event_participants ep
WHERE NOT EXISTS (
    SELECT 1 FROM public.event_attendees ea 
    WHERE ea.event_id = ep.event_id AND ea.user_id = ep.user_id
)
ON CONFLICT (event_id, user_id) DO NOTHING;

-- ============================================
-- 8. CRÉER LES FONCTIONS UTILITAIRES
-- ============================================

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour updated_at sur events
DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at 
    BEFORE UPDATE ON public.events 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. VÉRIFICATIONS FINALES
-- ============================================

-- Ajouter des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON public.events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON public.events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_privacy ON public.events(privacy);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at);

-- Commenter les tables pour la documentation
COMMENT ON TABLE public.events IS 'Table principale des événements avec toutes les métadonnées';
COMMENT ON TABLE public.event_attendees IS 'Participants aux événements avec leur statut RSVP';
COMMENT ON TABLE public.event_questionnaire IS 'Questions personnalisées pour les événements';

-- Log de la migration
INSERT INTO public.migration_log (migration_name, executed_at)
VALUES ('20250108100000_fix_events_table_complete', now())
ON CONFLICT DO NOTHING;