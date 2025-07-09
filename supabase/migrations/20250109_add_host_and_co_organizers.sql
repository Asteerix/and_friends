-- Add host column to events table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'host'
    ) THEN
        ALTER TABLE events ADD COLUMN host UUID REFERENCES auth.users(id);
        
        -- Set default host to created_by for existing events
        UPDATE events SET host = created_by WHERE host IS NULL;
    END IF;
END $$;

-- Add co_organizers column to events table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'co_organizers'
    ) THEN
        ALTER TABLE events ADD COLUMN co_organizers JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Ensure description column exists (it should already exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE events ADD COLUMN description TEXT;
    END IF;
END $$;

-- Create index on host column for better performance
CREATE INDEX IF NOT EXISTS idx_events_host ON events(host);