-- Migration: Configuration des RLS pour profiles et création de la fonction RPC complete_onboarding

-- 1. Politiques RLS (Row Level Security) pour la table `profiles`
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent pour éviter les conflits
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow full access to service_role" ON public.profiles;

-- Les utilisateurs peuvent lire leur propre profil
CREATE POLICY "Users can read their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Les utilisateurs peuvent mettre à jour leur propre profil
-- On restreint ici les colonnes que l'utilisateur peut mettre à jour directement
-- via `update` si nécessaire, bien que la plupart des mises à jour passeront par des RPC dédiées
-- ou seront gérées par des `SECURITY DEFINER` functions.
-- Pour l'instant, on autorise la mise à jour de toutes les colonnes collectées pendant l'onboarding.
CREATE POLICY "Users can update their own profile data"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Le rôle service_role a un accès complet (utile pour les opérations backend)
CREATE POLICY "Allow full access to service_role"
  ON public.profiles FOR ALL
  USING (current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role')
  WITH CHECK (current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role');


-- 2. Fonction RPC pour marquer l'onboarding comme complété (et vérifier la complétude)
DROP FUNCTION IF EXISTS public.complete_onboarding(); -- Supprime l'ancienne version si elle existe

CREATE OR REPLACE FUNCTION public.complete_onboarding()
RETURNS BOOLEAN AS $$
DECLARE
  profile_record public.profiles%ROWTYPE;
  is_profile_complete BOOLEAN := FALSE;
  current_user_id UUID := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  SELECT * INTO profile_record
  FROM public.profiles
  WHERE id = current_user_id;

  IF NOT FOUND THEN
    RAISE WARNING 'Profile not found for user % during complete_onboarding. Cannot complete onboarding.', current_user_id;
    RETURN FALSE;
  END IF;

  -- Vérifier que tous les champs requis sont remplis
  -- Adaptez ces conditions précisément aux champs que vous rendez obligatoires.
  -- Le nickname est initialisé par le trigger handle_new_user, donc il devrait exister.
  IF profile_record.full_name IS NOT NULL AND
     profile_record.nickname IS NOT NULL AND
     profile_record.avatar_url IS NOT NULL AND
     profile_record.birth_date IS NOT NULL AND
     -- contacts_permission_granted et location_permission_granted sont considérés optionnels pour la complétion de base.
     profile_record.jam_preference IS NOT NULL AND
     profile_record.restaurant_preference IS NOT NULL AND
     profile_record.hobbies IS NOT NULL AND array_length(profile_record.hobbies, 1) > 0
  THEN
    is_profile_complete := TRUE;
  ELSE
    -- Log pour débogage côté serveur si des champs manquent
    RAISE LOG 'Onboarding check failed for user %: full_name=%, nickname=%, avatar_url=%, birth_date=%, jam=%, restaurant=%, hobbies=%',
                current_user_id,
                profile_record.full_name,
                profile_record.nickname,
                profile_record.avatar_url,
                profile_record.birth_date,
                profile_record.jam_preference,
                profile_record.restaurant_preference,
                profile_record.hobbies;
  END IF;

  IF is_profile_complete THEN
    UPDATE public.profiles
    SET onboarding_complete = TRUE, updated_at = NOW()
    WHERE id = current_user_id;
    RETURN TRUE;
  ELSE
    RAISE WARNING 'Onboarding cannot be marked as complete for user %. Required profile information is missing.', current_user_id;
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER VOLATILE;

COMMENT ON FUNCTION public.complete_onboarding() IS 'Checks if all required profile information is present and, if so, marks the calling user''s onboarding process as complete. Returns true if completed, false otherwise.';

-- Accorder l'exécution de la fonction
GRANT EXECUTE ON FUNCTION public.complete_onboarding() TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_onboarding() TO service_role;