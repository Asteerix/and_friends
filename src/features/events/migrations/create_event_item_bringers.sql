-- Create event_item_bringers table to track who's bringing what
CREATE TABLE IF NOT EXISTS public.event_item_bringers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_item_id UUID NOT NULL REFERENCES public.event_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Ensure a user can only claim an item once
  UNIQUE(event_item_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_event_item_bringers_item_id ON public.event_item_bringers(event_item_id);
CREATE INDEX idx_event_item_bringers_user_id ON public.event_item_bringers(user_id);

-- Enable RLS
ALTER TABLE public.event_item_bringers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view who's bringing items for public events
CREATE POLICY "View bringers for public events" ON public.event_item_bringers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.event_items ei
      JOIN public.events e ON ei.event_id = e.id
      WHERE ei.id = event_item_id
      AND e.is_private = false
    )
  );

-- Authenticated users can view bringers for private events they're invited to
CREATE POLICY "View bringers for private events" ON public.event_item_bringers
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.event_items ei
      JOIN public.events e ON ei.event_id = e.id
      WHERE ei.id = event_item_id
      AND e.is_private = true
      AND (
        e.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.event_invitations inv
          WHERE inv.event_id = e.id
          AND inv.user_id = auth.uid()
        )
      )
    )
  );

-- Users can add themselves as bringers
CREATE POLICY "Users can claim items" ON public.event_item_bringers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove themselves as bringers
CREATE POLICY "Users can unclaim items" ON public.event_item_bringers
  FOR DELETE
  USING (auth.uid() = user_id);

-- Event hosts can manage all bringers
CREATE POLICY "Hosts can manage bringers" ON public.event_item_bringers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.event_items ei
      JOIN public.events e ON ei.event_id = e.id
      WHERE ei.id = event_item_id
      AND e.created_by = auth.uid()
    )
  );

-- Add a view to get items with their bringers
CREATE OR REPLACE VIEW event_items_with_bringers AS
SELECT 
  ei.*,
  COALESCE(
    json_agg(
      json_build_object(
        'user_id', eib.user_id,
        'profile', json_build_object(
          'id', p.id,
          'full_name', p.full_name,
          'username', p.username,
          'avatar_url', p.avatar_url
        ),
        'created_at', eib.created_at
      )
    ) FILTER (WHERE eib.id IS NOT NULL),
    '[]'::json
  ) as bringers
FROM event_items ei
LEFT JOIN event_item_bringers eib ON ei.id = eib.event_item_id
LEFT JOIN profiles p ON eib.user_id = p.id
GROUP BY ei.id;