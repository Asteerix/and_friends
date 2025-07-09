# 🐛 Guide de Debug pour la Création d'Événements

## État Actuel du Système

### ✅ Ce qui est fait:

1. **Structure de la base de données analysée**
   - Tables principales identifiées
   - Tables d'extras documentées
   - Incohérences détectées (noms de tables, colonnes manquantes)

2. **Code Frontend et Services**
   - `CreateEventScreen.tsx` utilise tous les extras
   - `EventServiceComplete` est le service le plus robuste
   - Logs détaillés ajoutés pour le debugging
   - Tous les états et callbacks des modals sont correctement connectés

3. **Fichiers créés**
   - `/supabase/fix_event_tables.sql` - Script pour créer toutes les tables nécessaires
   - Service amélioré avec gestion d'erreurs gracieuse

## 🔧 Pour faire fonctionner la création d'événements:

### 1. Exécuter le script SQL pour préparer la base de données

```bash
# Se connecter à Supabase et exécuter le script
supabase db push < supabase/fix_event_tables.sql
```

### 2. Vérifier l'état actuel de votre base de données

```sql
-- Copier et exécuter dans Supabase SQL Editor:

-- Vérifier les colonnes de la table events
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'events' 
ORDER BY ordinal_position;

-- Vérifier les tables d'extras
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'event_%'
ORDER BY table_name;

-- Vérifier les buckets de stockage
SELECT id, name, public 
FROM storage.buckets 
WHERE id IN ('events', 'event-images');
```

### 3. Debugging en temps réel

Quand vous créez un événement, observez la console pour:

1. **🚀 DÉBUT DE LA PUBLICATION** - Affiche toutes les données collectées
2. **📤 DONNÉES PRÉPARÉES POUR L'ENVOI** - JSON complet envoyé au service
3. **🚀 [EventServiceComplete]** - Logs détaillés du service:
   - 🔐 Authentification
   - 🖼️ Upload d'image
   - 💾 Insertion dans Supabase
   - 👤 Ajout du participant
   - 🎯 Traitement des extras
   - 📊 Résultats finaux

### 4. Erreurs courantes et solutions

#### Erreur: "column X does not exist"
```sql
-- Solution: Le script fix_event_tables.sql ajoute toutes les colonnes manquantes
-- Si l'erreur persiste, vérifier la colonne spécifique et l'ajouter:
ALTER TABLE events ADD COLUMN IF NOT EXISTS nom_colonne TYPE;
```

#### Erreur: "relation event_X does not exist"
```sql
-- Solution: La table n'existe pas, le script la créera
-- Si l'erreur persiste après le script, créer manuellement la table manquante
```

#### Erreur: "bucket not found"
```sql
-- Solution: Créer le bucket dans Supabase Storage
-- Dashboard > Storage > New Bucket > Name: "events", Public: true
```

### 5. Test complet de création

Pour tester TOUS les extras:

1. **Titre et Sous-titre**: Dans Edit Cover
2. **Background/Image**: Dans Edit Cover > Style
3. **Stickers**: Dans Edit Cover > Decorate
4. **Co-hosts**: Add Co-Hosts
5. **Coûts**: Cost per person (ajouter au moins 1)
6. **Photos**: Photo Album (ajouter au moins 1)
7. **Items à apporter**: To Bring (ajouter au moins 1)
8. **RSVP**: RSVP deadline
9. **Questionnaire**: Guest questionnaire (ajouter au moins 1 question)
10. **Playlist**: Playlist (ajouter au moins 1 chanson)

### 6. Vérification après création

```sql
-- Vérifier l'événement créé
SELECT * FROM events WHERE created_by = auth.uid() ORDER BY created_at DESC LIMIT 1;

-- Vérifier les extras (remplacer EVENT_ID)
SELECT * FROM event_co_hosts WHERE event_id = 'EVENT_ID';
SELECT * FROM event_costs WHERE event_id = 'EVENT_ID';
SELECT * FROM event_photos WHERE event_id = 'EVENT_ID';
SELECT * FROM event_questionnaire WHERE event_id = 'EVENT_ID';
SELECT * FROM event_items WHERE event_id = 'EVENT_ID';
SELECT * FROM event_playlists WHERE event_id = 'EVENT_ID';
SELECT * FROM event_cover_stickers WHERE event_id = 'EVENT_ID';
```

## 📋 Checklist avant de créer un événement

- [ ] Script SQL `fix_event_tables.sql` exécuté
- [ ] Bucket de stockage 'events' existe et est public
- [ ] Console du navigateur ouverte pour voir les logs
- [ ] Au moins un titre d'événement défini
- [ ] Date et heure sélectionnées

## 🚨 Si ça ne fonctionne toujours pas

1. Partager les logs complets de la console
2. Partager le résultat des requêtes SQL de vérification
3. Vérifier que vous utilisez bien `EventServiceComplete` dans `CreateEventScreen.tsx`
4. S'assurer que l'import du service est correct: `@/lib/supabase`

## 💡 Amélioration continue

Le service `EventServiceComplete` est conçu pour:
- Continuer même si certaines tables n'existent pas
- Stocker toutes les données dans `extra_data` comme backup
- Fournir des logs détaillés pour chaque étape
- Gérer les différents formats de données gracieusement

Si vous rencontrez de nouvelles erreurs, les logs vous indiqueront exactement où et pourquoi.