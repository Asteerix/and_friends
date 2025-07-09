-- Migration pour synchroniser automatiquement les données des événements
-- entre extra_data et les colonnes principales de la table events

-- Fonction pour synchroniser les données d'un événement
CREATE OR REPLACE FUNCTION sync_event_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Synchroniser les données de couverture
  IF NEW.extra_data->'coverData' IS NOT NULL THEN
    NEW.cover_data = NEW.extra_data->'coverData';
    NEW.cover_template_id = COALESCE(NEW.extra_data->'coverData'->'selectedTemplate'->>'id', NEW.cover_template_id);
    NEW.cover_font = COALESCE(
      CASE 
        WHEN NEW.extra_data->'coverData'->>'selectedTitleFont' IS NOT NULL 
        THEN 'font-' || (NEW.extra_data->'coverData'->>'selectedTitleFont')
        ELSE NEW.cover_font
      END,
      'font-1'
    );
    NEW.cover_stickers = COALESCE(NEW.extra_data->'coverData'->'placedStickers', '[]'::jsonb);
    NEW.subtitle = COALESCE(NEW.extra_data->'coverData'->>'eventSubtitle', NEW.subtitle);
  END IF;

  -- Synchroniser la localisation
  IF NEW.extra_data->'location_details' IS NOT NULL THEN
    NEW.location_details = NEW.extra_data->'location_details';
    NEW.address = COALESCE(NEW.extra_data->'location_details'->>'address', NEW.address);
    NEW.city = COALESCE(NEW.extra_data->'location_details'->>'city', NEW.city);
    NEW.country = COALESCE(NEW.extra_data->'location_details'->>'country', NEW.country);
    NEW.postal_code = COALESCE(NEW.extra_data->'location_details'->>'postalCode', NEW.postal_code);
    NEW.venue_name = COALESCE(NEW.extra_data->'location_details'->>'name', NEW.venue_name);
    
    -- Synchroniser les coordonnées
    IF NEW.extra_data->'location_details'->'coordinates' IS NOT NULL THEN
      NEW.coordinates = jsonb_build_object(
        'lat', (NEW.extra_data->'location_details'->'coordinates'->>'latitude')::float,
        'lng', (NEW.extra_data->'location_details'->'coordinates'->>'longitude')::float
      );
    END IF;
  END IF;

  -- Synchroniser la catégorie
  IF NEW.extra_data->>'event_category' IS NOT NULL THEN
    NEW.category = CASE 
      WHEN NEW.extra_data->>'event_category' ILIKE '%nightlife%' THEN 'nightlife'
      WHEN NEW.extra_data->>'event_category' ILIKE '%club%' THEN 'nightlife'
      WHEN NEW.extra_data->>'event_category' ILIKE '%activit%' THEN 'activities'
      WHEN NEW.extra_data->>'event_category' ILIKE '%sport%' THEN 'sports'
      WHEN NEW.extra_data->>'event_category' ILIKE '%art%' THEN 'arts'
      WHEN NEW.extra_data->>'event_category' ILIKE '%music%' THEN 'music'
      WHEN NEW.extra_data->>'event_category' ILIKE '%food%' THEN 'food'
      ELSE 'social'
    END;
  END IF;

  -- Synchroniser les prix et paiement
  IF NEW.extra_data->'costs' IS NOT NULL AND jsonb_array_length(NEW.extra_data->'costs') > 0 THEN
    NEW.price = (NEW.extra_data->'costs'->0->>'amount')::numeric;
    NEW.currency = COALESCE(NEW.extra_data->'costs'->0->>'currency', 'EUR');
    NEW.payment_required = true;
  END IF;

  -- Synchroniser la capacité
  IF NEW.extra_data->>'capacity_limit' IS NOT NULL THEN
    NEW.max_attendees = (NEW.extra_data->>'capacity_limit')::integer;
  END IF;

  -- Synchroniser les dates et heures
  IF NEW.extra_data->>'start_time' IS NOT NULL THEN
    NEW.start_time = to_timestamp(NEW.extra_data->>'start_time', 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"');
  END IF;
  
  IF NEW.extra_data->>'end_time' IS NOT NULL THEN
    NEW.end_time = to_timestamp(NEW.extra_data->>'end_time', 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"');
  END IF;

  -- Synchroniser RSVP deadline
  IF NEW.extra_data->>'rsvp_deadline' IS NOT NULL THEN
    NEW.rsvp_deadline = to_timestamp(NEW.extra_data->>'rsvp_deadline', 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"');
  END IF;

  -- Synchroniser les items à apporter
  IF NEW.extra_data->'itemsToBring' IS NOT NULL AND jsonb_array_length(NEW.extra_data->'itemsToBring') > 0 THEN
    NEW.what_to_bring = ARRAY(
      SELECT jsonb_array_elements_text(
        jsonb_agg(item->>'name')
      )
      FROM jsonb_array_elements(NEW.extra_data->'itemsToBring') AS item
    );
  END IF;

  -- Synchroniser les tags avec le thème
  IF NEW.extra_data->>'event_theme' IS NOT NULL THEN
    NEW.tags = ARRAY[NEW.extra_data->>'event_theme'];
  END IF;

  -- Synchroniser l'organizer
  IF NEW.created_by IS NOT NULL AND NEW.organizer_id IS NULL THEN
    NEW.organizer_id = NEW.created_by;
  END IF;

  -- Synchroniser les co-organisateurs
  IF NEW.extra_data->'co_organizers' IS NOT NULL THEN
    NEW.co_organizers = ARRAY(
      SELECT jsonb_array_elements_text(NEW.extra_data->'co_organizers')
    );
  END IF;

  -- S'assurer que location est toujours synchronisé avec coordinates
  IF NEW.coordinates IS NOT NULL THEN
    NEW.location = (NEW.coordinates->>'lat')::text || ',' || (NEW.coordinates->>'lng')::text;
  END IF;

  -- Définir des valeurs par défaut si nécessaires
  NEW.cover_bg_color = COALESCE(NEW.cover_bg_color, '#1a1a1a');
  NEW.is_private = COALESCE(NEW.is_private, false);
  NEW.privacy = COALESCE(NEW.privacy, 'public');
  NEW.status = COALESCE(NEW.status, 'published');
  NEW.currency = COALESCE(NEW.currency, 'EUR');
  NEW.timezone = COALESCE(NEW.timezone, 'Europe/Paris');
  NEW.rsvp_reminder_enabled = COALESCE(NEW.rsvp_reminder_enabled, false);
  NEW.rsvp_reminder_timing = COALESCE(NEW.rsvp_reminder_timing, '24h');
  NEW.memories_count = COALESCE(NEW.memories_count, 0);
  NEW.view_count = COALESCE(NEW.view_count, 0);
  NEW.share_count = COALESCE(NEW.share_count, 0);
  NEW.current_attendees = COALESCE(NEW.current_attendees, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS sync_event_data_trigger ON events;

-- Créer le trigger pour synchroniser automatiquement les données
CREATE TRIGGER sync_event_data_trigger
BEFORE INSERT OR UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION sync_event_data();

-- Fonction pour nettoyer et synchroniser un événement existant
CREATE OR REPLACE FUNCTION clean_event_data(event_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE events
  SET 
    -- Forcer la resynchronisation en mettant à jour updated_at
    updated_at = NOW()
  WHERE id = event_id;
END;
$$ LANGUAGE plpgsql;

-- Appliquer la synchronisation à tous les événements existants
DO $$
DECLARE
  event_record RECORD;
BEGIN
  FOR event_record IN SELECT id FROM events
  LOOP
    PERFORM clean_event_data(event_record.id);
  END LOOP;
END $$;

-- Ajouter des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_events_extra_data_cover ON events USING gin ((extra_data->'coverData'));
CREATE INDEX IF NOT EXISTS idx_events_extra_data_location ON events USING gin ((extra_data->'location_details'));
CREATE INDEX IF NOT EXISTS idx_events_coordinates ON events USING gin (coordinates);
CREATE INDEX IF NOT EXISTS idx_events_category ON events (category);
CREATE INDEX IF NOT EXISTS idx_events_date ON events (date);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events (start_time);

-- Commentaire sur la fonction
COMMENT ON FUNCTION sync_event_data() IS 'Synchronise automatiquement les données entre extra_data et les colonnes principales de la table events';