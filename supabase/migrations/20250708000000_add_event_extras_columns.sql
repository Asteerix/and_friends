-- Add missing columns to events table for complete event creation

-- Add extra data column to store additional event information
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT '{}';

-- Add columns for event timing
ALTER TABLE events
ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- Add columns for event details
ALTER TABLE events
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS max_attendees INTEGER,
ADD COLUMN IF NOT EXISTS current_attendees INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('draft', 'published', 'ongoing', 'ended', 'cancelled')) DEFAULT 'published';

-- Add columns for location details
ALTER TABLE events
ADD COLUMN IF NOT EXISTS venue_name TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS coordinates JSONB;

-- Add columns for features
ALTER TABLE events
ADD COLUMN IF NOT EXISTS rsvp_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approval_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS waitlist_enabled BOOLEAN DEFAULT false;

-- Create table for event costs
CREATE TABLE IF NOT EXISTS event_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for event photos
CREATE TABLE IF NOT EXISTS event_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    caption TEXT,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for event questionnaire
CREATE TABLE IF NOT EXISTS event_questionnaire (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    question_type TEXT CHECK (question_type IN ('text', 'choice', 'multiple')) DEFAULT 'text',
    options JSONB,
    required BOOLEAN DEFAULT false,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for items to bring
CREATE TABLE IF NOT EXISTS event_items_to_bring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    quantity INTEGER,
    assigned_to UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for event playlists
CREATE TABLE IF NOT EXISTS event_playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    playlist_name TEXT,
    spotify_link TEXT,
    apple_music_link TEXT,
    songs JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for new tables
ALTER TABLE event_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_questionnaire ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_items_to_bring ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_playlists ENABLE ROW LEVEL SECURITY;

-- Policies for event_costs
CREATE POLICY "Users can view costs for accessible events" ON event_costs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_costs.event_id 
            AND (
                NOT is_private 
                OR created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM event_participants 
                    WHERE event_id = events.id AND user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Event creators can manage costs" ON event_costs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_costs.event_id AND created_by = auth.uid()
        )
    );

-- Policies for event_photos
CREATE POLICY "Users can view photos for accessible events" ON event_photos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_photos.event_id 
            AND (
                NOT is_private 
                OR created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM event_participants 
                    WHERE event_id = events.id AND user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Event creators can manage photos" ON event_photos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_photos.event_id AND created_by = auth.uid()
        )
    );

-- Policies for event_questionnaire
CREATE POLICY "Users can view questionnaire for accessible events" ON event_questionnaire
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_questionnaire.event_id 
            AND (
                NOT is_private 
                OR created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM event_participants 
                    WHERE event_id = events.id AND user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Event creators can manage questionnaire" ON event_questionnaire
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_questionnaire.event_id AND created_by = auth.uid()
        )
    );

-- Policies for event_items_to_bring
CREATE POLICY "Users can view items for accessible events" ON event_items_to_bring
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_items_to_bring.event_id 
            AND (
                NOT is_private 
                OR created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM event_participants 
                    WHERE event_id = events.id AND user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Event participants can manage items" ON event_items_to_bring
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_items_to_bring.event_id 
            AND (
                created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM event_participants 
                    WHERE event_id = events.id AND user_id = auth.uid()
                )
            )
        )
    );

-- Policies for event_playlists
CREATE POLICY "Users can view playlists for accessible events" ON event_playlists
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_playlists.event_id 
            AND (
                NOT is_private 
                OR created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM event_participants 
                    WHERE event_id = events.id AND user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Event creators can manage playlists" ON event_playlists
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_playlists.event_id AND created_by = auth.uid()
        )
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON event_costs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_photos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_questionnaire TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_items_to_bring TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_playlists TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_costs_event_id ON event_costs(event_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON event_photos(event_id);
CREATE INDEX IF NOT EXISTS idx_event_questionnaire_event_id ON event_questionnaire(event_id);
CREATE INDEX IF NOT EXISTS idx_event_items_event_id ON event_items_to_bring(event_id);
CREATE INDEX IF NOT EXISTS idx_event_playlists_event_id ON event_playlists(event_id);

-- Update the event_participants table to support co-hosts
ALTER TABLE event_participants
ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('participant', 'co-host', 'organizer')) DEFAULT 'participant';

-- Add a column to track who created the event participant entry
ALTER TABLE event_participants
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES profiles(id);

-- Log the migration
INSERT INTO public.migration_log (name, executed_at) 
VALUES ('20250708000000_add_event_extras_columns.sql', NOW())
ON CONFLICT DO NOTHING;