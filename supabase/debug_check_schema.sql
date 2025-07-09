-- Script de débogage pour vérifier le schéma actuel de la base de données

-- 1. Vérifier quelles tables existent
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'events',
    'event_participants',
    'event_attendees',
    'event_costs',
    'event_photos',
    'event_questionnaires',
    'event_questionnaire',
    'event_items',
    'event_items_to_bring',
    'event_playlists',
    'event_rsvp_settings',
    'event_memories',
    'profiles',
    'users'
)
ORDER BY table_name;

-- 2. Vérifier les colonnes de la table events
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'events'
ORDER BY ordinal_position;

-- 3. Vérifier les colonnes de la table event_participants
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'event_participants'
ORDER BY ordinal_position;

-- 4. Vérifier les buckets de stockage
SELECT 
    name,
    public,
    created_at
FROM storage.buckets
ORDER BY name;

-- 5. Vérifier les politiques RLS sur events
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'events';

-- 6. Vérifier si PostGIS est installé
SELECT 
    extname,
    extversion
FROM pg_extension
WHERE extname IN ('postgis', 'uuid-ossp', 'pg_trgm');

-- 7. Vérifier les migrations exécutées (si la table existe)
SELECT 
    name,
    executed_at
FROM public.migration_log
ORDER BY executed_at DESC
LIMIT 10;