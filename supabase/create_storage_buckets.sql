-- Script pour créer les buckets de stockage nécessaires
-- NOTE: Ce script doit être exécuté via l'API Supabase ou le dashboard
-- Les buckets ne peuvent pas être créés directement via SQL

-- Documentation des buckets nécessaires:

-- 1. Bucket 'events' - Pour toutes les images liées aux événements
-- Politique: Public pour la lecture, authentifié pour l'écriture
-- Structure suggérée:
--   - /covers/ - Images de couverture des événements
--   - /{user_id}/covers/ - Couvertures uploadées par utilisateur
--   - /{user_id}/events/{event_id}/ - Photos d'événements par utilisateur

-- Pour créer le bucket via l'API Supabase JavaScript:
/*
const { data, error } = await supabase.storage.createBucket('events', {
  public: true,
  fileSizeLimit: 10485760, // 10MB
  allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
});
*/

-- Politiques de stockage recommandées pour le bucket 'events':

-- 1. Lecture publique pour tous les fichiers
/*
CREATE POLICY "Public Access" ON storage.objects 
FOR SELECT USING (bucket_id = 'events');
*/

-- 2. Upload authentifié uniquement
/*
CREATE POLICY "Authenticated users can upload" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'events' 
  AND auth.uid() IS NOT NULL
);
*/

-- 3. Les utilisateurs peuvent modifier/supprimer leurs propres fichiers
/*
CREATE POLICY "Users can update own files" ON storage.objects 
FOR UPDATE USING (
  bucket_id = 'events' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own files" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'events' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
*/

-- Instructions pour créer le bucket manuellement:
-- 1. Aller sur https://app.supabase.com/project/[PROJECT_ID]/storage/buckets
-- 2. Cliquer sur "New bucket"
-- 3. Nom: "events"
-- 4. Public: Oui (cocher la case)
-- 5. File size limit: 10MB
-- 6. Allowed MIME types: image/jpeg, image/jpg, image/png, image/gif, image/webp
-- 7. Cliquer sur "Create bucket"

-- Vérifier si le bucket existe:
-- SELECT * FROM storage.buckets WHERE id = 'events';