-- Fix event_participants table to ensure status column exists
-- This migration is safe to run multiple times

-- Add status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'event_participants' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.event_participants 
        ADD COLUMN status text DEFAULT 'going' 
        CHECK (status IN ('going', 'maybe', 'not_going'));
        
        -- Update any existing rows to have 'going' status
        UPDATE public.event_participants 
        SET status = 'going' 
        WHERE status IS NULL;
    END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- Create or replace the policy for viewing event participants
DROP POLICY IF EXISTS "Users can view event participants" ON public.event_participants;
CREATE POLICY "Users can view event participants" ON public.event_participants
    FOR SELECT USING (true);

-- Create or replace the policy for joining events
DROP POLICY IF EXISTS "Users can join events" ON public.event_participants;
CREATE POLICY "Users can join events" ON public.event_participants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create or replace the policy for updating participation
DROP POLICY IF EXISTS "Users can update their participation" ON public.event_participants;
CREATE POLICY "Users can update their participation" ON public.event_participants
    FOR UPDATE USING (auth.uid() = user_id);

-- Create or replace the policy for leaving events
DROP POLICY IF EXISTS "Users can leave events" ON public.event_participants;
CREATE POLICY "Users can leave events" ON public.event_participants
    FOR DELETE USING (auth.uid() = user_id);