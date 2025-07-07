-- Add columns to track last name and username changes
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_name_change timestamptz,
ADD COLUMN IF NOT EXISTS last_username_change timestamptz;

-- Comment the columns
COMMENT ON COLUMN profiles.last_name_change IS 'Tracks when the user last changed their name (14 days cooldown)';
COMMENT ON COLUMN profiles.last_username_change IS 'Tracks when the user last changed their username (14 days cooldown)';