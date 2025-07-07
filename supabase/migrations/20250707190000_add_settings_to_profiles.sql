-- Ajouter la colonne settings à la table profiles si elle n'existe pas déjà
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'settings'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN settings JSONB DEFAULT '{
      "notifications": {
        "event_invites": true,
        "friend_requests": true,
        "event_reminders": true
      },
      "privacy": {
        "who_can_invite": "Public",
        "hide_from_search": false
      }
    }'::jsonb;
    
    -- Ajouter un commentaire pour documenter la colonne
    COMMENT ON COLUMN public.profiles.settings IS 'Paramètres utilisateur pour les notifications et la confidentialité';
    
    -- Créer un index pour améliorer les performances des requêtes sur settings
    CREATE INDEX idx_profiles_settings ON public.profiles USING gin(settings);
  END IF;
END $$;

-- Mettre à jour les profils existants avec les valeurs par défaut si settings est NULL
UPDATE public.profiles 
SET settings = '{
  "notifications": {
    "event_invites": true,
    "friend_requests": true,
    "event_reminders": true
  },
  "privacy": {
    "who_can_invite": "Public",
    "hide_from_search": false
  }
}'::jsonb
WHERE settings IS NULL;