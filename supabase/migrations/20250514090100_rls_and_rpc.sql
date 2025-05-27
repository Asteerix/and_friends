-- supabase/migrations/YYYYMMDDHHMMSS_rls_and_rpc.sql

-- 1. Activer Row Level Security (RLS) sur la table `profiles`
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent (pour idempotence)
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leur propre profil." ON public.profiles;
DROP POLICY IF EXISTS "Les utilisateurs peuvent mettre à jour leur propre profil." ON public.profiles;

-- 2. Politique RLS : Les utilisateurs peuvent voir leur propre profil.
CREATE POLICY "Les utilisateurs peuvent voir leur propre profil."
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- 3. Politique RLS : Les utilisateurs peuvent mettre à jour leur propre profil.
CREATE POLICY "Les utilisateurs peuvent mettre à jour leur propre profil."
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Fonction RPC `complete_onboarding`
CREATE OR REPLACE FUNCTION public.complete_onboarding()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Important pour pouvoir mettre à jour le profil de l'utilisateur appelant
AS $$
DECLARE
  user_id UUID := auth.uid();
  profile_data RECORD;
  all_fields_present BOOLEAN;
BEGIN
  -- Vérifier si l'utilisateur est authentifié
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
    RETURN FALSE; -- Ne devrait pas arriver si appelé depuis le client authentifié
  END IF;

  -- Récupérer les données du profil de l'utilisateur actuel
  SELECT
    full_name,
    avatar_url,
    birth_date,
    jam_preference,
    restaurant_preference,
    hobbies
  INTO profile_data
  FROM public.profiles
  WHERE id = user_id;

  -- Vérifier si le profil existe
  IF NOT FOUND THEN
    -- Cela ne devrait pas arriver si le trigger handle_new_user fonctionne correctement
    RAISE WARNING 'Profil non trouvé pour l''utilisateur % lors de la tentative de complétion de l''onboarding.', user_id;
    RETURN FALSE;
  END IF;

  -- Vérifier que tous les champs requis sont non nuls et que hobbies n'est pas vide
  all_fields_present := (
    profile_data.full_name IS NOT NULL AND
    profile_data.avatar_url IS NOT NULL AND
    profile_data.birth_date IS NOT NULL AND
    profile_data.jam_preference IS NOT NULL AND
    profile_data.restaurant_preference IS NOT NULL AND
    profile_data.hobbies IS NOT NULL AND
    array_length(profile_data.hobbies, 1) >= 1 -- Vérifie que le tableau hobbies contient au moins un élément
  );

  IF all_fields_present THEN
    -- Mettre à jour onboarding_complete à true
    UPDATE public.profiles
    SET onboarding_complete = TRUE
    WHERE id = user_id;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur inattendue, logger et retourner false
    RAISE WARNING 'Erreur inattendue dans complete_onboarding pour l''utilisateur %: %', user_id, SQLERRM;
    RETURN FALSE;
END;
$$;

-- Donner les permissions d'exécution sur la fonction aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.complete_onboarding() TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_onboarding() TO service_role;

COMMENT ON FUNCTION public.complete_onboarding() IS 'Vérifie si tous les champs d''onboarding requis sont remplis pour l''utilisateur courant. Si oui, marque l''onboarding comme complet et retourne TRUE, sinon retourne FALSE.';