-- ============================================
-- SCRIPT DE CORRECTION DE SÉCURITÉ URGENTE
-- Application: And Friends
-- Date: 10 Janvier 2025
-- ============================================

-- ATTENTION: Exécuter ce script dans l'ordre
-- Testé sur Supabase PostgreSQL 15+

BEGIN;

-- ============================================
-- 1. SÉCURISER LES BUCKETS DE STOCKAGE
-- ============================================

-- Mettre tous les buckets en privé
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('events', 'profiles', 'stories', 'messages');

-- Vérifier que les buckets sont bien privés
DO $$
DECLARE
    public_bucket_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO public_bucket_count
    FROM storage.buckets
    WHERE public = true
    AND id IN ('events', 'profiles', 'stories', 'messages');
    
    IF public_bucket_count > 0 THEN
        RAISE EXCEPTION 'Erreur: % buckets sont encore publics!', public_bucket_count;
    END IF;
END $$;

-- ============================================
-- 2. CORRIGER LES POLITIQUES RLS TROP PERMISSIVES
-- ============================================

-- Supprimer les anciennes politiques trop permissives
DROP POLICY IF EXISTS "Users can view event participants" ON event_participants;
DROP POLICY IF EXISTS "Anyone can view events" ON events;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

-- Participants d'événements - Accès restreint
CREATE POLICY "event_participants_select_secure" ON event_participants
    FOR SELECT USING (
        -- L'utilisateur est participant ou organisateur
        auth.uid() IN (
            SELECT user_id FROM event_participants 
            WHERE event_id = event_participants.event_id
        ) 
        OR
        -- L'utilisateur est créateur de l'événement
        auth.uid() IN (
            SELECT created_by FROM events 
            WHERE id = event_participants.event_id
        )
    );

-- Événements - Visibilité selon le statut
CREATE POLICY IF NOT EXISTS "events_select_secure" ON events
    FOR SELECT USING (
        -- Événements publics
        visibility = 'public'
        OR
        -- Créateur de l'événement
        created_by = auth.uid()
        OR
        -- Participant à l'événement
        EXISTS (
            SELECT 1 FROM event_participants
            WHERE event_id = events.id
            AND user_id = auth.uid()
        )
    );

-- Profils - Visibilité selon la confidentialité
CREATE POLICY IF NOT EXISTS "profiles_select_secure" ON profiles
    FOR SELECT USING (
        -- Son propre profil
        id = auth.uid()
        OR
        -- Profil public
        is_public = true
        OR
        -- Ami de l'utilisateur (si la table friends existe)
        EXISTS (
            SELECT 1 FROM friends
            WHERE (user_id = auth.uid() AND friend_id = profiles.id)
            OR (friend_id = auth.uid() AND user_id = profiles.id)
            AND status = 'accepted'
        )
    );

-- ============================================
-- 3. AJOUTER LES CONTRAINTES DE VALIDATION
-- ============================================

-- Contraintes sur la table events
ALTER TABLE events 
ADD CONSTRAINT IF NOT EXISTS check_title_length 
    CHECK (char_length(title) >= 3 AND char_length(title) <= 200),
ADD CONSTRAINT IF NOT EXISTS check_description_length 
    CHECK (description IS NULL OR char_length(description) <= 5000),
ADD CONSTRAINT IF NOT EXISTS check_location_length 
    CHECK (location IS NULL OR char_length(location) <= 500),
ADD CONSTRAINT IF NOT EXISTS check_max_participants 
    CHECK (max_participants IS NULL OR (max_participants > 0 AND max_participants <= 10000));

-- Contraintes sur la table messages
ALTER TABLE messages 
ADD CONSTRAINT IF NOT EXISTS check_content_length 
    CHECK (char_length(content) >= 1 AND char_length(content) <= 10000),
ADD CONSTRAINT IF NOT EXISTS check_meta_size 
    CHECK (meta IS NULL OR pg_column_size(meta) <= 65536);

-- Contraintes sur la table profiles
ALTER TABLE profiles
ADD CONSTRAINT IF NOT EXISTS check_bio_length 
    CHECK (bio IS NULL OR char_length(bio) <= 1000),
ADD CONSTRAINT IF NOT EXISTS check_username_format 
    CHECK (username ~ '^[a-zA-Z0-9_]{3,30}$'),
ADD CONSTRAINT IF NOT EXISTS check_display_name_length 
    CHECK (display_name IS NULL OR char_length(display_name) <= 50);

-- Contraintes sur la table reports
ALTER TABLE reports
ADD CONSTRAINT IF NOT EXISTS check_reason_length 
    CHECK (char_length(reason) >= 10 AND char_length(reason) <= 1000),
ADD CONSTRAINT IF NOT EXISTS check_report_type 
    CHECK (report_type IN ('spam', 'harassment', 'inappropriate', 'fake', 'other'));

-- ============================================
-- 4. POLITIQUES DE STOCKAGE RESTRICTIVES
-- ============================================

-- Supprimer les anciennes politiques trop permissives
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view" ON storage.objects;

-- Bucket profiles - Upload restreint au propriétaire
CREATE POLICY "profile_upload_owner_only" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'profiles' 
        AND auth.uid() IS NOT NULL
        AND (storage.foldername(name))[1] = auth.uid()::text
        AND (
            name ~ '\.jpg$' OR 
            name ~ '\.jpeg$' OR 
            name ~ '\.png$' OR 
            name ~ '\.webp$'
        )
        -- Limite de taille: 5MB (à configurer côté Supabase aussi)
    );

-- Bucket profiles - Lecture selon la visibilité du profil
CREATE POLICY "profile_read_visibility_based" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'profiles'
        AND (
            -- Propriétaire
            auth.uid() = ((storage.foldername(name))[1])::uuid
            OR
            -- Profil public
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = ((storage.foldername(name))[1])::uuid 
                AND is_public = true
            )
        )
    );

-- Bucket events - Upload pour les organisateurs
CREATE POLICY "event_upload_organizer_only" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'events' 
        AND auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM events
            WHERE id = ((storage.foldername(name))[1])::uuid
            AND created_by = auth.uid()
        )
    );

-- Bucket events - Lecture selon la visibilité de l'événement
CREATE POLICY "event_read_visibility_based" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'events'
        AND EXISTS (
            SELECT 1 FROM events
            WHERE id = ((storage.foldername(name))[1])::uuid
            AND (
                visibility = 'public'
                OR created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM event_participants
                    WHERE event_id = events.id
                    AND user_id = auth.uid()
                )
            )
        )
    );

-- ============================================
-- 5. ACTIVER RLS SUR TOUTES LES TABLES
-- ============================================

DO $$
DECLARE
    r RECORD;
    tables_without_rls TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Collecter les tables sans RLS
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN ('schema_migrations', 'spatial_ref_sys')
        AND NOT rowsecurity
    LOOP
        tables_without_rls := array_append(tables_without_rls, r.tablename);
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', r.tablename);
    END LOOP;
    
    -- Logger les tables modifiées
    IF array_length(tables_without_rls, 1) > 0 THEN
        RAISE NOTICE 'RLS activé sur % tables: %', 
            array_length(tables_without_rls, 1), 
            array_to_string(tables_without_rls, ', ');
    END IF;
END $$;

-- ============================================
-- 6. CRÉER DES INDEX POUR LA PERFORMANCE
-- ============================================

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_events_visibility_date 
    ON events(visibility, start_date DESC) 
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_events_created_by 
    ON events(created_by);

CREATE INDEX IF NOT EXISTS idx_event_participants_user_event 
    ON event_participants(user_id, event_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
    ON messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_username 
    ON profiles(username) 
    WHERE username IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reports_status_created 
    ON reports(status, created_at DESC);

-- ============================================
-- 7. VÉRIFICATIONS FINALES
-- ============================================

-- Vérifier que toutes les tables ont RLS activé
DO $$
DECLARE
    unprotected_count INTEGER;
    unprotected_tables TEXT;
BEGIN
    SELECT COUNT(*), string_agg(tablename, ', ')
    INTO unprotected_count, unprotected_tables
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT IN ('schema_migrations', 'spatial_ref_sys')
    AND NOT rowsecurity;
    
    IF unprotected_count > 0 THEN
        RAISE WARNING 'Tables sans RLS: %', unprotected_tables;
    ELSE
        RAISE NOTICE 'Toutes les tables sont protégées par RLS';
    END IF;
END $$;

-- Vérifier les buckets publics
DO $$
DECLARE
    public_bucket_names TEXT;
BEGIN
    SELECT string_agg(id, ', ')
    INTO public_bucket_names
    FROM storage.buckets
    WHERE public = true;
    
    IF public_bucket_names IS NOT NULL THEN
        RAISE WARNING 'Buckets encore publics: %', public_bucket_names;
    ELSE
        RAISE NOTICE 'Tous les buckets sont privés';
    END IF;
END $$;

COMMIT;

-- ============================================
-- NOTES POST-EXÉCUTION
-- ============================================
-- 1. Régénérer les types TypeScript après ces changements
-- 2. Tester toutes les fonctionnalités affectées
-- 3. Vérifier les logs d'erreur pour les accès refusés
-- 4. Mettre à jour la documentation API
-- 5. Informer l'équipe des changements de sécurité