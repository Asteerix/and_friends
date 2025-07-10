-- Script pour vérifier l'état actuel du système de ratings

-- 1. Vérifier si la table ratings existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'ratings'
) as ratings_table_exists;

-- 2. Lister toutes les fonctions liées aux ratings
SELECT 
    p.proname as function_name,
    pg_catalog.pg_get_function_arguments(p.oid) as arguments,
    pg_catalog.pg_get_function_result(p.oid) as return_type
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.proname LIKE '%rating%'
ORDER BY p.proname;

-- 3. Vérifier la structure de la table ratings si elle existe
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'ratings'
ORDER BY ordinal_position;

-- 4. Lister toutes les politiques RLS sur la table ratings
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'ratings';

-- 5. Vérifier spécifiquement certaines fonctions
SELECT 
    'get_user_rating_stats' as function_name,
    EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'get_user_rating_stats'
    ) as exists
UNION ALL
SELECT 
    'get_user_given_ratings',
    EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'get_user_given_ratings'
    )
UNION ALL
SELECT 
    'get_user_received_ratings',
    EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'get_user_received_ratings'
    )
UNION ALL
SELECT 
    'upsert_rating',
    EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'upsert_rating'
    );

-- Si vous exécutez ceci dans Supabase, vous devriez voir :
-- 1. Si la table ratings existe
-- 2. Toutes les fonctions avec "rating" dans le nom
-- 3. La structure de la table ratings
-- 4. Les politiques RLS
-- 5. L'existence de chaque fonction spécifique