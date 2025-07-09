-- Migration complète pour assurer que la table events a TOUTES les colonnes nécessaires
-- Cette migration unifie toutes les structures et corrige les incohérences

-- 1. D'abord, ajouter toutes les colonnes manquantes à la table events
ALTER TABLE events 
  -- Colonnes de base manquantes
  ADD COLUMN IF NOT EXISTS subtitle TEXT,
  ADD COLUMN IF NOT EXISTS cover_data JSONB,
  ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS recurrence_rule TEXT,
  ADD COLUMN IF NOT EXISTS venue_name TEXT,
  ADD COLUMN IF NOT EXISTS venue_id TEXT,
  ADD COLUMN IF NOT EXISTS indoor_map_url TEXT,
  ADD COLUMN IF NOT EXISTS organizer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS co_organizers UUID[],
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'social',
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS privacy TEXT DEFAULT 'public' CHECK (privacy IN ('public', 'friends', 'invite-only', 'secret')),
  ADD COLUMN IF NOT EXISTS max_attendees INT,
  ADD COLUMN IF NOT EXISTS current_attendees INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS waitlist_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS age_restriction INT,
  ADD COLUMN IF NOT EXISTS dress_code TEXT,
  ADD COLUMN IF NOT EXISTS what_to_bring TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS payment_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS refund_policy TEXT,
  ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sponsored BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'ongoing', 'ended', 'cancelled')),
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS share_count INT DEFAULT 0,
  
  -- Colonnes ajoutées par les migrations
  ADD COLUMN IF NOT EXISTS cover_bg_color TEXT,
  ADD COLUMN IF NOT EXISTS cover_font TEXT,
  ADD COLUMN IF NOT EXISTS cover_image TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  
  -- Colonnes pour les extras
  ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS location_details JSONB,
  ADD COLUMN IF NOT EXISTS rsvp_deadline TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rsvp_reminder_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rsvp_reminder_timing TEXT DEFAULT '24h';

-- 2. Mettre à jour les colonnes existantes si nécessaire
-- Migrer created_by vers organizer_id si nécessaire
DO $$
BEGIN
  -- Si created_by existe et pas organizer_id, copier les données
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'created_by')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'organizer_id') THEN
    EXECUTE 'UPDATE events SET organizer_id = created_by WHERE organizer_id IS NULL';
  END IF;
END $$;

-- 3. Ajouter des index pour les performances
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_privacy ON events(privacy);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

-- 4. Créer un trigger pour mettre à jour current_attendees automatiquement
CREATE OR REPLACE FUNCTION update_event_attendees_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE events 
    SET current_attendees = (
      SELECT COUNT(*) 
      FROM event_attendees 
      WHERE event_id = NEW.event_id AND status = 'going'
    )
    WHERE id = NEW.event_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE events 
    SET current_attendees = (
      SELECT COUNT(*) 
      FROM event_attendees 
      WHERE event_id = NEW.event_id AND status = 'going'
    )
    WHERE id = NEW.event_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE events 
    SET current_attendees = (
      SELECT COUNT(*) 
      FROM event_attendees 
      WHERE event_id = OLD.event_id AND status = 'going'
    )
    WHERE id = OLD.event_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger si il n'existe pas
DROP TRIGGER IF EXISTS update_event_attendees_count_trigger ON event_attendees;
CREATE TRIGGER update_event_attendees_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON event_attendees
FOR EACH ROW EXECUTE FUNCTION update_event_attendees_count();

-- 5. Mettre à jour les politiques RLS pour utiliser organizer_id
-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Public events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Users can create events" ON events;
DROP POLICY IF EXISTS "Users can update their own events" ON events;
DROP POLICY IF EXISTS "Users can delete their own events" ON events;

-- Créer de nouvelles politiques avec organizer_id
CREATE POLICY "Public events are viewable by everyone, private events by participants" ON events
    FOR SELECT USING (
        privacy = 'public' 
        OR organizer_id = auth.uid()
        OR co_organizers @> ARRAY[auth.uid()]
        OR EXISTS (
            SELECT 1 FROM event_attendees 
            WHERE event_id = events.id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can create events" ON events
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL 
        AND auth.uid() = organizer_id
    );

CREATE POLICY "Organizers can update their events" ON events
    FOR UPDATE USING (
        auth.uid() = organizer_id 
        OR co_organizers @> ARRAY[auth.uid()]
    );

CREATE POLICY "Organizers can delete their events" ON events
    FOR DELETE USING (auth.uid() = organizer_id);

-- 6. Fonction helper pour obtenir les détails complets d'un événement
CREATE OR REPLACE FUNCTION get_event_details(event_id UUID)
RETURNS TABLE (
    event JSONB,
    attendees_count INT,
    costs_count INT,
    photos_count INT,
    questions_count INT,
    items_count INT,
    has_playlist BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        to_jsonb(e.*) as event,
        (SELECT COUNT(*) FROM event_attendees WHERE event_attendees.event_id = e.id)::INT as attendees_count,
        (SELECT COUNT(*) FROM event_costs WHERE event_costs.event_id = e.id)::INT as costs_count,
        (SELECT COUNT(*) FROM event_photos WHERE event_photos.event_id = e.id)::INT as photos_count,
        (SELECT COUNT(*) FROM event_questionnaire WHERE event_questionnaire.event_id = e.id)::INT as questions_count,
        (SELECT COUNT(*) FROM event_items_to_bring WHERE event_items_to_bring.event_id = e.id)::INT as items_count,
        EXISTS(SELECT 1 FROM event_playlists WHERE event_playlists.event_id = e.id) as has_playlist
    FROM events e
    WHERE e.id = $1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_event_details(UUID) TO authenticated;

-- 7. Vue pour debug et monitoring
CREATE OR REPLACE VIEW event_complete_view AS
SELECT 
    e.*,
    u.full_name as organizer_name,
    u.avatar_url as organizer_avatar,
    (SELECT COUNT(*) FROM event_attendees WHERE event_id = e.id AND status = 'going') as confirmed_attendees,
    (SELECT COUNT(*) FROM event_attendees WHERE event_id = e.id AND status = 'maybe') as maybe_attendees,
    (SELECT COUNT(*) FROM event_costs WHERE event_id = e.id) as costs_count,
    (SELECT COUNT(*) FROM event_photos WHERE event_id = e.id) as photos_count,
    (SELECT COUNT(*) FROM event_questionnaire WHERE event_id = e.id) as questions_count,
    (SELECT COUNT(*) FROM event_items_to_bring WHERE event_id = e.id) as items_count,
    EXISTS(SELECT 1 FROM event_playlists WHERE event_id = e.id) as has_playlist,
    (SELECT COUNT(*) FROM event_cover_stickers WHERE event_id = e.id) as stickers_count
FROM events e
LEFT JOIN users u ON e.organizer_id = u.id;

-- Grant permission sur la vue
GRANT SELECT ON event_complete_view TO authenticated;

-- 8. Commentaires de documentation
COMMENT ON COLUMN events.cover_data IS 'Données complètes de la couverture (titre, fonts, background, stickers, etc.)';
COMMENT ON COLUMN events.extra_data IS 'Données supplémentaires stockées en JSON (métadonnées des extras)';
COMMENT ON COLUMN events.location_details IS 'Détails de localisation (nom, adresse, coordonnées GPS)';
COMMENT ON COLUMN events.co_organizers IS 'Array des UUIDs des co-organisateurs';
COMMENT ON COLUMN events.what_to_bring IS 'Array des items à apporter';

-- 9. Fonction pour nettoyer les colonnes obsolètes (optionnel)
-- À exécuter manuellement après vérification
-- ALTER TABLE events DROP COLUMN IF EXISTS created_by;
-- ALTER TABLE events DROP COLUMN IF EXISTS date;
-- ALTER TABLE events DROP COLUMN IF EXISTS location;
-- ALTER TABLE events DROP COLUMN IF EXISTS image_url;

-- Fin de la migration
-- Cette migration assure que la table events a TOUTES les colonnes nécessaires
-- et que les politiques RLS sont correctement configurées