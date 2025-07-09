-- Add extra fields to events table
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
ADD COLUMN IF NOT EXISTS cancellation_policy TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_event_category ON events(event_category);
CREATE INDEX IF NOT EXISTS idx_events_capacity_limit ON events(capacity_limit);
CREATE INDEX IF NOT EXISTS idx_events_allow_plus_ones ON events(allow_plus_ones);
CREATE INDEX IF NOT EXISTS idx_events_event_tags ON events USING GIN(event_tags);

-- Add comments for documentation
COMMENT ON COLUMN events.dress_code IS 'Dress code for the event (e.g., "Casual", "Formal", "Cocktail")';
COMMENT ON COLUMN events.event_theme IS 'Theme of the event (e.g., "80s Night", "Masquerade Ball")';
COMMENT ON COLUMN events.age_restriction IS 'Age restriction for the event (e.g., "18+", "21+", "All ages")';
COMMENT ON COLUMN events.capacity_limit IS 'Maximum number of attendees allowed';
COMMENT ON COLUMN events.parking_info IS 'Information about parking availability and instructions';
COMMENT ON COLUMN events.event_category IS 'Category of the event (e.g., "nightlife", "outdoor", "cultural")';
COMMENT ON COLUMN events.accessibility_info IS 'Accessibility information for the venue';
COMMENT ON COLUMN events.event_website IS 'External website URL for the event';
COMMENT ON COLUMN events.contact_info IS 'Contact information for event inquiries';
COMMENT ON COLUMN events.allow_plus_ones IS 'Whether guests can bring plus ones';
COMMENT ON COLUMN events.max_plus_ones IS 'Maximum number of plus ones per guest';
COMMENT ON COLUMN events.event_tags IS 'Array of tags/keywords for the event';
COMMENT ON COLUMN events.cancellation_policy IS 'Cancellation and refund policy for the event';