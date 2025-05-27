-- Supprimer les anciennes structures si elles existent (pour idempotence et propreté)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.complete_onboarding();
DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles; -- Ancien nom potentiel
DROP TRIGGER IF EXISTS on_profile_updated_trigger ON public.profiles; -- Nouveau nom
DROP FUNCTION IF EXISTS public.handle_updated_at(); -- Ancien nom potentiel
DROP FUNCTION IF EXISTS public.handle_profile_updated_at(); -- Nouveau nom
DROP TABLE IF EXISTS public.profiles;

-- 1. Création de la table des profils utilisateurs
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Champs pour le suivi de l'onboarding
  current_registration_step TEXT, -- ex: 'name_input', 'avatar_pick', etc.
  is_profile_complete BOOLEAN DEFAULT FALSE NOT NULL,
  
  -- Champs collectés durant l'onboarding
  full_name TEXT,
  avatar_url TEXT, -- Pourrait être une URL vers un bucket Supabase Storage
  birth_date DATE,
  jam_preference TEXT, 
  restaurant_preference TEXT,
  hobbies TEXT[], -- Tableau de chaînes de caractères pour les hobbies

  -- Contraintes (exemples, à adapter si besoin)
  CONSTRAINT check_full_name_length CHECK (full_name IS NULL OR char_length(full_name) > 0),
  CONSTRAINT check_current_registration_step CHECK (current_registration_step IS NULL OR char_length(current_registration_step) > 0)
);

-- Commentaires
COMMENT ON TABLE public.profiles IS 'Stocke les informations de profil utilisateur et l''état de l''onboarding.';
COMMENT ON COLUMN public.profiles.id IS 'Référence à auth.users.id, clé primaire.';
COMMENT ON COLUMN public.profiles.current_registration_step IS 'Étape actuelle de l''utilisateur dans le flux d''inscription/onboarding.';
COMMENT ON COLUMN public.profiles.is_profile_complete IS 'Indique si l''utilisateur a complété toutes les étapes d''onboarding.';
COMMENT ON COLUMN public.profiles.full_name IS 'Nom complet de l''utilisateur.';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL de l''avatar de l''utilisateur.';
COMMENT ON COLUMN public.profiles.birth_date IS 'Date de naissance de l''utilisateur.';
COMMENT ON COLUMN public.profiles.jam_preference IS 'Préférence de confiture de l''utilisateur.';
COMMENT ON COLUMN public.profiles.restaurant_preference IS 'Préférence de restaurant de l''utilisateur.';
COMMENT ON COLUMN public.profiles.hobbies IS 'Liste des hobbies de l''utilisateur.';

-- 2. Fonction pour mettre à jour automatiquement `updated_at`
CREATE OR REPLACE FUNCTION public.handle_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour `updated_at` sur la table `profiles`
CREATE TRIGGER on_profile_updated_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profile_updated_at();

-- 3. Activer Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Politiques RLS
CREATE POLICY "Allow individual select access"
ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Allow individual insert access"
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow individual update access"
ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
    
CREATE POLICY "Disallow delete access"
ON public.profiles FOR DELETE USING (FALSE);

-- 5. Index pour les requêtes fréquentes
CREATE INDEX idx_profiles_is_profile_complete ON public.profiles(is_profile_complete);
CREATE INDEX idx_profiles_current_registration_step ON public.profiles(current_registration_step); -- Peut être utile

-- 6. Donner les permissions de base au rôle 'authenticated'
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;

GRANT ALL ON TABLE public.profiles TO service_role;
