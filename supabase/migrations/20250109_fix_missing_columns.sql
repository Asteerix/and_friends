-- Fix missing columns in events table
-- This migration ensures all columns referenced in the code exist

-- Add missing columns if they don't exist
ALTER TABLE events
ADD COLUMN IF NOT EXISTS dress_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS event_theme VARCHAR(200),
ADD COLUMN IF NOT EXISTS age_restriction VARCHAR(50),
ADD COLUMN IF NOT EXISTS capacity_limit INTEGER,
ADD COLUMN IF NOT EXISTS parking_info TEXT,
ADD COLUMN IF NOT EXISTS event_category VARCHAR(100),
ADD COLUMN IF NOT EXISTS accessibility_info TEXT,
ADD COLUMN IF NOT EXISTS event_website VARCHAR(500),
ADD COLUMN IF NOT EXISTS contact_info TEXT,
ADD COLUMN IF NOT EXISTS allow_plus_ones BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS max_plus_ones INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS event_tags TEXT[],
ADD COLUMN IF NOT EXISTS location_details JSONB,
ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT '{}';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_event_category ON events(event_category);
CREATE INDEX IF NOT EXISTS idx_events_capacity_limit ON events(capacity_limit);
CREATE INDEX IF NOT EXISTS idx_events_location_details ON events USING GIN(location_details);
CREATE INDEX IF NOT EXISTS idx_events_extra_data ON events USING GIN(extra_data);

-- Add comments for documentation
COMMENT ON COLUMN events.dress_code IS 'Dress code for the event';
COMMENT ON COLUMN events.event_theme IS 'Theme of the event';
COMMENT ON COLUMN events.age_restriction IS 'Age restriction for the event';
COMMENT ON COLUMN events.capacity_limit IS 'Maximum number of attendees';
COMMENT ON COLUMN events.parking_info IS 'Parking information';
COMMENT ON COLUMN events.event_category IS 'Category of the event';
COMMENT ON COLUMN events.accessibility_info IS 'Accessibility information';
COMMENT ON COLUMN events.event_website IS 'Event website URL';
COMMENT ON COLUMN events.contact_info IS 'Contact information';
COMMENT ON COLUMN events.allow_plus_ones IS 'Whether guests can bring plus ones';
COMMENT ON COLUMN events.max_plus_ones IS 'Maximum number of plus ones per guest';
COMMENT ON COLUMN events.event_tags IS 'Tags for the event';
COMMENT ON COLUMN events.location_details IS 'Detailed location information including coordinates';
COMMENT ON COLUMN events.extra_data IS 'Additional event data in JSON format';