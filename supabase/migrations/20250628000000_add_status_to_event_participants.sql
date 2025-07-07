-- Add status column to event_participants if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'event_participants' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE event_participants 
        ADD COLUMN status text DEFAULT 'going' 
        CHECK (status IN ('going', 'maybe', 'not_going'));
    END IF;
END $$;