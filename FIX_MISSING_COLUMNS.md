# Résolution des erreurs de colonnes manquantes

## Problème

Les erreurs suivantes apparaissent lors de la création d'événements :

```
Error inserting event items: column "item_name" of relation "event_items" does not exist
Error inserting playlist: column "apple_music_link" of relation "event_playlists" does not exist
```

## Cause

Il y a une inconsistance entre les migrations de base de données et le code :

1. **event_items** : Certaines migrations créent la colonne `name`, mais le code utilise `item_name`
2. **event_playlists** : Certaines migrations créent `apple_music_url`, mais le code utilise `apple_music_link`

## Solution

### 1. Appliquer la migration corrective

Une nouvelle migration a été créée pour corriger ces problèmes :
`supabase/migrations/20250709000000_fix_event_items_playlists_columns.sql`

Cette migration :
- Renomme ou ajoute la colonne `item_name` dans `event_items`
- Ajoute la colonne `apple_music_link` dans `event_playlists`
- Nettoie les tables dupliquées (`event_items_to_bring`)
- Configure les politiques RLS nécessaires

### 2. Comment appliquer la migration

#### Option A : Via l'interface Supabase

1. Connectez-vous à votre projet Supabase
2. Allez dans l'éditeur SQL : `https://app.supabase.com/project/[VOTRE-PROJECT-ID]/sql/new`
3. Copiez le contenu de `supabase/migrations/20250709000000_fix_event_items_playlists_columns.sql`
4. Collez et exécutez le SQL
5. Vérifiez qu'il n'y a pas d'erreurs

#### Option B : Via le script

```bash
cd /Users/asteerix/Desktop/bureau-recent/and_friends
./scripts/apply-migrations.sh
```

### 3. Vérifier la correction

Après avoir appliqué la migration, testez la création d'un événement avec :
- Des items à apporter
- Un lien de playlist Spotify

Les erreurs devraient disparaître.

## Prévention

Pour éviter ce type de problème à l'avenir :

1. **Cohérence des noms** : Assurez-vous que les noms de colonnes dans les migrations correspondent exactement à ceux utilisés dans le code
2. **Tests de migration** : Testez toujours les migrations sur un environnement de développement avant la production
3. **Documentation** : Documentez la structure attendue des tables dans le code

## Structure finale des tables

### event_items
```sql
- id (UUID)
- event_id (UUID)
- item_name (TEXT) -- Pas "name"
- quantity (INTEGER)
- assigned_to (UUID)
- is_brought (BOOLEAN)
- created_at (TIMESTAMPTZ)
```

### event_playlists
```sql
- id (UUID)
- event_id (UUID)
- playlist_name (TEXT)
- spotify_link (TEXT)
- apple_music_link (TEXT) -- Pas "apple_music_url"
- deezer_link (TEXT)
- songs (JSONB)
- created_by (UUID)
- created_at (TIMESTAMPTZ)
```