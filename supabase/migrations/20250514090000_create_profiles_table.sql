-- supabase/migrations/YYYYMMDDHHMMSS_create_profiles_table.sql

DROP TABLE IF EXISTS public.profiles;

-- 1. Création de la table des profils utilisateurs
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  birth_date DATE,
  jam_preference TEXT, -- ex: "strawberry", "apricot", "none"
  restaurant_preference TEXT, -- ex: "italian", "mexican", "any"
  hobbies TEXT[], -- ex: ARRAY['reading', 'hiking']
  onboarding_complete BOOLEAN DEFAULT FALSE NOT NULL
);

-- 2. Commentaires sur les colonnes pour la clarté
COMMENT ON COLUMN public.profiles.id IS 'Référence à auth.users.id, clé primaire.';
COMMENT ON COLUMN public.profiles.created_at IS 'Timestamp de création du profil.';
COMMENT ON COLUMN public.profiles.updated_at IS 'Timestamp de la dernière mise à jour du profil.';
COMMENT ON COLUMN public.profiles.full_name IS 'Nom complet de l''utilisateur.';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL de l''avatar choisi par l''utilisateur.';
COMMENT ON COLUMN public.profiles.birth_date IS 'Date de naissance de l''utilisateur.';
COMMENT ON COLUMN public.profiles.jam_preference IS 'Préférence de confiture (exemple).';
COMMENT ON COLUMN public.profiles.restaurant_preference IS 'Préférence de restaurant (exemple).';
COMMENT ON COLUMN public.profiles.hobbies IS 'Liste des hobbies de l''utilisateur.';
COMMENT ON COLUMN public.profiles.onboarding_complete IS 'Indique si l''utilisateur a complété le flux d''onboarding.';

-- 3. Fonction pour mettre à jour automatiquement `updated_at`
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger pour `updated_at` sur la table `profiles`
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 5. Fonction pour créer un profil lors de la création d'un nouvel utilisateur dans `auth.users`
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger pour appeler `handle_new_user` après l'insertion dans `auth.users`
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. (Optionnel) Rendre la table accessible via l'API publique (si ce n'est pas déjà le cas par défaut)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; -- Décommentez si vous utilisez Realtime et que ce n'est pas automatique
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO service_role;
-- Les RLS affineront ces permissions.