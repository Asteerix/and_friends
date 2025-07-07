# Analyse des Politiques de Sécurité - Bucket "stories"

## Vue d'ensemble

Le bucket "stories" est configuré pour stocker les médias (images et vidéos) des stories utilisateurs dans l'application and_friends.

### Configuration du Bucket

**Fichier:** `supabase/migrations/20250628000002_create_storage_buckets.sql`

```sql
-- Création du bucket stories
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'stories', 
    'stories', 
    true,                    -- Bucket public
    10485760,               -- 10MB max par fichier
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime']
);
```

### Politiques RLS Actuelles

Les politiques Row Level Security (RLS) suivantes sont appliquées au bucket "stories":

#### 1. Lecture Publique
```sql
CREATE POLICY "Public read access stories" ON storage.objects 
    FOR SELECT USING (bucket_id = 'stories');
```
- **Effet:** Tout le monde peut lire les fichiers du bucket stories
- **Condition:** Aucune restriction sur la lecture
- **Risque:** ✅ Faible - Les stories sont destinées à être publiques

#### 2. Création par Utilisateurs Authentifiés
```sql
CREATE POLICY "Authenticated users can upload stories" ON storage.objects 
    FOR INSERT WITH CHECK (bucket_id = 'stories' AND auth.uid() IS NOT NULL);
```
- **Effet:** Seuls les utilisateurs authentifiés peuvent uploader
- **Condition:** L'utilisateur doit être connecté (auth.uid() non null)
- **Risque:** ✅ Faible - Protection adéquate contre les uploads anonymes

#### 3. Modification par le Propriétaire
```sql
CREATE POLICY "Users can update own stories" ON storage.objects 
    FOR UPDATE USING (bucket_id = 'stories' AND auth.uid() = owner);
```
- **Effet:** Les utilisateurs peuvent modifier uniquement leurs propres fichiers
- **Condition:** auth.uid() doit correspondre au propriétaire du fichier
- **Risque:** ✅ Faible - Protection appropriée

#### 4. Suppression par le Propriétaire
```sql
CREATE POLICY "Users can delete own stories" ON storage.objects 
    FOR DELETE USING (bucket_id = 'stories' AND auth.uid() = owner);
```
- **Effet:** Les utilisateurs peuvent supprimer uniquement leurs propres fichiers
- **Condition:** auth.uid() doit correspondre au propriétaire du fichier
- **Risque:** ✅ Faible - Protection appropriée

## Structure de la Table Stories

**Fichier:** `temp_migrations/001_initial_schema.sql`

```sql
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('image', 'video')) NOT NULL,
  caption TEXT,
  music_data JSONB,
  stickers JSONB[],
  mentions UUID[],
  location GEOGRAPHY(POINT),
  views UUID[] DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours',
  highlight_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Analyse de Sécurité

### Points Positifs
1. ✅ **Authentification requise** pour l'upload
2. ✅ **Propriété vérifiée** pour les modifications/suppressions
3. ✅ **Types MIME restreints** aux formats d'image et vidéo sécurisés
4. ✅ **Taille limitée** à 10MB par fichier
5. ✅ **Expiration automatique** des stories après 24h

### Recommandations

1. **Validation du contenu**
   - Implémenter une vérification côté serveur du contenu des fichiers
   - Scanner les uploads pour détecter du contenu malveillant

2. **Rate Limiting**
   - Ajouter des limites sur le nombre d'uploads par utilisateur/heure
   - Implémenter un quota de stockage par utilisateur

3. **Audit Trail**
   - Logger tous les uploads/suppressions pour traçabilité
   - Conserver les métadonnées même après suppression

4. **Nettoyage automatique**
   - Créer une fonction qui supprime automatiquement les fichiers des stories expirées
   - Nettoyer les fichiers orphelins (sans référence dans la table stories)

5. **Organisation des fichiers**
   - Structurer les chemins de fichiers par utilisateur: `{user_id}/{story_id}/{filename}`
   - Facilite la gestion des quotas et la suppression par utilisateur

## Scripts de Vérification

Un script de vérification existe : `scripts/check-storage-policies.js`
- Vérifie la configuration des buckets
- Liste les policies RLS appliquées
- Fournit des recommandations

## Conclusion

Les politiques de sécurité actuelles du bucket "stories" sont **adéquates** pour un usage basique. Les principales protections sont en place :
- Authentification requise pour l'upload
- Isolation des données par utilisateur
- Types de fichiers restreints

Pour une application en production, il est recommandé d'implémenter les améliorations suggérées, notamment le rate limiting et la validation du contenu.