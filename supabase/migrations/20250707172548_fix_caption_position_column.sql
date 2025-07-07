-- Add caption_position column to stories table
ALTER TABLE stories ADD COLUMN IF NOT EXISTS caption_position float DEFAULT NULL;