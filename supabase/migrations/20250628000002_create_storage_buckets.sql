-- Create storage buckets if they don't exist
DO $$
BEGIN
    -- Create events bucket
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'events'
    ) THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'events', 
            'events', 
            true, 
            5242880, -- 5MB
            ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        );
    END IF;

    -- Create profiles bucket
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'profiles'
    ) THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'profiles', 
            'profiles', 
            true, 
            5242880, -- 5MB
            ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        );
    END IF;

    -- Create stories bucket
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'stories'
    ) THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'stories', 
            'stories', 
            true, 
            10485760, -- 10MB
            ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime']
        );
    END IF;

    -- Create messages bucket
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'messages'
    ) THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'messages', 
            'messages', 
            true, 
            10485760, -- 10MB
            ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'audio/mpeg', 'audio/mp4']
        );
    END IF;
END $$;

-- Set up RLS policies for events bucket
CREATE POLICY "Public read access" ON storage.objects 
    FOR SELECT USING (bucket_id = 'events');

CREATE POLICY "Authenticated users can upload" ON storage.objects 
    FOR INSERT WITH CHECK (bucket_id = 'events' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own uploads" ON storage.objects 
    FOR UPDATE USING (bucket_id = 'events' AND auth.uid() = owner);

CREATE POLICY "Users can delete own uploads" ON storage.objects 
    FOR DELETE USING (bucket_id = 'events' AND auth.uid() = owner);

-- Set up RLS policies for profiles bucket
CREATE POLICY "Public read access profiles" ON storage.objects 
    FOR SELECT USING (bucket_id = 'profiles');

CREATE POLICY "Users can upload own profile" ON storage.objects 
    FOR INSERT WITH CHECK (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own profile" ON storage.objects 
    FOR UPDATE USING (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own profile" ON storage.objects 
    FOR DELETE USING (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Set up RLS policies for stories bucket
CREATE POLICY "Public read access stories" ON storage.objects 
    FOR SELECT USING (bucket_id = 'stories');

CREATE POLICY "Authenticated users can upload stories" ON storage.objects 
    FOR INSERT WITH CHECK (bucket_id = 'stories' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own stories" ON storage.objects 
    FOR UPDATE USING (bucket_id = 'stories' AND auth.uid() = owner);

CREATE POLICY "Users can delete own stories" ON storage.objects 
    FOR DELETE USING (bucket_id = 'stories' AND auth.uid() = owner);

-- Set up RLS policies for messages bucket
CREATE POLICY "Authenticated read access messages" ON storage.objects 
    FOR SELECT USING (bucket_id = 'messages' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload messages" ON storage.objects 
    FOR INSERT WITH CHECK (bucket_id = 'messages' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own messages" ON storage.objects 
    FOR UPDATE USING (bucket_id = 'messages' AND auth.uid() = owner);

CREATE POLICY "Users can delete own messages" ON storage.objects 
    FOR DELETE USING (bucket_id = 'messages' AND auth.uid() = owner);