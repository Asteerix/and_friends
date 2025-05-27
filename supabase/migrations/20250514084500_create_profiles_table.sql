-- Migration: Création de la table profiles et des triggers associés

-- 1. Création de la table `profiles`
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  onboarding_complete BOOLEAN DEFAULT FALSE NOT NULL,
  full_name TEXT,
  nickname TEXT, -- Ajouté car présent dans NameInputScreen
  avatar_url TEXT,
  birth_date DATE,
  contacts_permission_granted BOOLEAN,
  location_permission_granted BOOLEAN,
  jam_preference TEXT,
  restaurant_preference TEXT,
  hobbies TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.profiles IS 'Stores public profile information for users, including onboarding status and collected data.';
COMMENT ON COLUMN public.profiles.id IS 'References the user in auth.users.';
COMMENT ON COLUMN public.profiles.onboarding_complete IS 'True if the user has completed the onboarding flow and all required data is present.';
COMMENT ON COLUMN public.profiles.full_name IS 'Full name of the user.';
COMMENT ON COLUMN public.profiles.nickname IS 'Nickname of the user.';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL or identifier for the user''s chosen avatar.';
COMMENT ON COLUMN public.profiles.birth_date IS 'User''s birth date.';
COMMENT ON COLUMN public.profiles.contacts_permission_granted IS 'Status of contacts permission.';
COMMENT ON COLUMN public.profiles.location_permission_granted IS 'Status of location permission.';
COMMENT ON COLUMN public.profiles.jam_preference IS 'User''s music jam preference.';
COMMENT ON COLUMN public.profiles.restaurant_preference IS 'User''s restaurant type preference.';
COMMENT ON COLUMN public.profiles.hobbies IS 'List of user''s hobbies.';
COMMENT ON COLUMN public.profiles.created_at IS 'Timestamp of profile creation.';
COMMENT ON COLUMN public.profiles.updated_at IS 'Timestamp of last profile update.';

-- 2. Trigger pour mettre à jour `updated_at`
CREATE OR REPLACE FUNCTION public.handle_profile_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_profile_update_timestamp();

-- 3. Trigger pour créer un profil à l'inscription d'un nouvel utilisateur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname) -- On initialise le nickname avec l'email part pour l'exemple
  VALUES (NEW.id, split_part(NEW.email, '@', 1));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();