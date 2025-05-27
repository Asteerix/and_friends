-- Migration: Rename nickname to username and add unique constraint (robuste)

-- 1. Add the new column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='profiles' AND column_name='username'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN username TEXT;
  END IF;
END$$;

-- 2. Migrate data from nickname to username only if nickname exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='profiles' AND column_name='nickname'
  ) THEN
    EXECUTE 'UPDATE public.profiles SET username = nickname WHERE username IS NULL AND nickname IS NOT NULL';
  END IF;
END$$;

-- 3. Drop the old nickname column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='profiles' AND column_name='nickname'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN nickname;
  END IF;
END$$;

-- 4. Add a unique constraint on username if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name='profiles' AND constraint_type='UNIQUE' AND constraint_name='profiles_username_key'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
  END IF;
END$$; 