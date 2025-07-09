-- Add start_time and end_time columns to events table if they don't exist
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;

-- Update existing events to have start_time and end_time based on date column
UPDATE events 
SET start_time = date,
    end_time = date + INTERVAL '3 hours'
WHERE start_time IS NULL;

-- Add comment to columns
COMMENT ON COLUMN events.start_time IS 'Event start date and time';
COMMENT ON COLUMN events.end_time IS 'Event end date and time';