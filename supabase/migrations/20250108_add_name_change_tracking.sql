-- Add columns to track when name and username were last changed
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_name_change TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_username_change TIMESTAMP WITH TIME ZONE;

-- Add comments to explain the columns
COMMENT ON COLUMN profiles.last_name_change IS 'Timestamp of last name change to enforce change frequency limits';
COMMENT ON COLUMN profiles.last_username_change IS 'Timestamp of last username change to enforce change frequency limits';