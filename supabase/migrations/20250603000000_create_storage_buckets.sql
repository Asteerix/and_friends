-- Create storage bucket for event covers
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES 
  ('event-covers', 'event-covers', true, false, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Enable RLS for the bucket
CREATE POLICY "Public can view event covers" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'event-covers');

-- Allow authenticated users to upload event covers
CREATE POLICY "Authenticated users can upload event covers" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-covers');

-- Allow users to update their own uploads
CREATE POLICY "Users can update their own event covers" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'event-covers' AND auth.uid()::text = owner);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their own event covers" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'event-covers' AND auth.uid()::text = owner);