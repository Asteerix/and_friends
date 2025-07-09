# 🔧 Guide pour corriger les erreurs de tables d'événements

## Problème identifié

Plusieurs tables et colonnes sont manquantes dans votre base de données Supabase, ce qui cause des erreurs lors de la création d'événements.

## Solution rapide

### 1. Connectez-vous à votre dashboard Supabase
- Allez sur https://app.supabase.com
- Sélectionnez votre projet

### 2. Appliquez la migration
1. Cliquez sur **SQL Editor** dans le menu latéral
2. Cliquez sur **New query**
3. Copiez et collez le contenu du fichier suivant :
   ```
   supabase/migrations/20250709000001_fix_all_event_tables.sql
   ```
4. Cliquez sur **Run** (ou Cmd/Ctrl + Enter)

### 3. Vérifiez que tout fonctionne
- La migration devrait s'exécuter sans erreur
- Les messages devraient indiquer la création des tables manquantes

## Ce que fait cette migration

✅ **Corrige la table event_items**
- Ajoute la colonne `item_name` manquante
- Migre les données existantes si nécessaire

✅ **Corrige la table event_playlists**
- Ajoute la colonne `apple_music_link` manquante
- Crée la table si elle n'existe pas

✅ **Crée les tables manquantes**
- `event_questionnaire` (pour les questions)
- `event_cover_stickers` (pour les stickers)
- `event_costs` (pour les coûts)

✅ **Configure la sécurité RLS**
- Active Row Level Security sur toutes les tables
- Ajoute les politiques appropriées

## Test après migration

1. Essayez de créer un nouvel événement avec tous les extras
2. Vérifiez que les erreurs ont disparu dans la console

## En cas de problème

Si vous avez toujours des erreurs après avoir appliqué la migration :

1. Vérifiez dans **Table Editor** que les tables suivantes existent :
   - `event_items` (avec colonne `item_name`)
   - `event_playlists` (avec colonne `apple_music_link`)
   - `event_questionnaire`
   - `event_cover_stickers`
   - `event_costs`

2. Si certaines tables manquent encore, réexécutez la migration

3. Contactez le support si le problème persiste

## Note importante

Cette migration est **idempotente** - elle peut être exécutée plusieurs fois sans problème. Elle vérifie l'existence des tables et colonnes avant de les créer.