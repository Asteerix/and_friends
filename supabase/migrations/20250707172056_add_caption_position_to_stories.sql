-- Add caption_position column to stories table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'stories' 
        AND column_name = 'caption_position'
    ) THEN
        ALTER TABLE stories ADD COLUMN caption_position float DEFAULT NULL;
    END IF;
END $$;