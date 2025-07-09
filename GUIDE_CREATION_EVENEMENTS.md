# 🎉 Guide Complet - Création d'Événements avec Supabase

## 📋 Vue d'ensemble

La création d'événements dans l'application utilise Supabase avec une architecture complexe de tables et de règles de sécurité (RLS). Ce guide documente tout le processus et les solutions aux problèmes courants.

## 🏗️ Architecture des Tables

### Table principale : `events`
```sql
- id (UUID)
- title (TEXT)
- subtitle (TEXT)
- description (TEXT)
- date (TIMESTAMPTZ)
- location (TEXT)
- location_details (JSONB)
- is_private (BOOLEAN)
- created_by (UUID)
- cover_bg_color (TEXT)
- cover_font (TEXT)
- cover_image (TEXT)
- image_url (TEXT)
- extra_data (JSONB) -- IMPORTANT: Stocke TOUTES les données supplémentaires
- rsvp_deadline (TIMESTAMPTZ)
- rsvp_reminder_enabled (BOOLEAN)
- rsvp_reminder_timing (TEXT)
```

### Tables d'extras
1. **event_participants** - Participants aux événements
2. **event_co_hosts** - Co-organisateurs
3. **event_costs** - Coûts par personne
4. **event_photos** - Photos d'événements
5. **event_questionnaires** - Questions pour les participants
6. **event_questionnaire_responses** - Réponses aux questions
7. **event_items_to_bring** - Items à apporter
8. **event_playlists** - Playlists musicales
9. **event_cover_stickers** - Autocollants sur la couverture

## 🔐 Règles de Sécurité (RLS)

Toutes les tables ont RLS activé avec ces règles générales :
- **SELECT** : Événements publics visibles par tous, privés par participants/organisateurs
- **INSERT** : Utilisateurs authentifiés peuvent créer
- **UPDATE** : Organisateurs et co-organisateurs peuvent modifier
- **DELETE** : Seul l'organisateur principal peut supprimer

## 🚀 Service de Création : EventServiceComplete

Le service `EventServiceComplete` gère toute la création avec :
1. **Logs détaillés** pour chaque étape
2. **Gestion d'erreurs robuste** avec réessais
3. **Support des colonnes manquantes** (fallback sur extra_data)
4. **Création parallèle des extras**

### Flux de création :
```javascript
1. Vérification authentification
2. Upload image de couverture (si présente)
3. Préparation des données
4. Insertion dans la table events
5. Ajout du créateur comme participant
6. Traitement des extras en parallèle
7. Retour avec l'ID de l'événement
```

## 🛠️ Configuration Supabase Requise

### 1. Migrations à exécuter
```bash
# Dans le terminal
supabase db push

# Ou dans le dashboard Supabase > SQL Editor
# Exécuter les fichiers de migration dans l'ordre
```

### 2. Buckets Storage à créer
Dans le dashboard Supabase > Storage :
- `events` (public)
- `event-images` (public)

### 3. Vérification avec la page Debug
Accéder à `/debug-events` pour :
- Vérifier l'état des tables
- Tester la création d'événements
- Voir les logs détaillés

## 📝 Utilisation dans CreateEventScreen

```javascript
import { EventServiceComplete } from '../services/eventServiceComplete';

const handlePublish = async () => {
  const eventData = {
    title: coverData.eventTitle || 'Nouvel événement',
    subtitle: coverData.eventSubtitle,
    description: description,
    date: eventDate,
    location: location,
    locationDetails: locationDetails,
    isPrivate: isPrivate,
    coverData: coverData,
    coHosts: coHosts,
    costs: costs,
    eventPhotos: eventPhotos,
    rsvpDeadline: rsvpDeadline,
    rsvpReminderEnabled: rsvpReminderEnabled,
    rsvpReminderTiming: rsvpReminderTiming,
    questionnaire: questionnaire,
    itemsToBring: itemsToBring,
    playlist: playlist,
    spotifyLink: spotifyLink
  };
  
  const result = await EventServiceComplete.createEvent(eventData);
  
  if (result.success) {
    // Navigation vers l'événement créé
    router.replace(`/event/${result.event.id}`);
  }
};
```

## 🐛 Problèmes Courants et Solutions

### 1. Erreur "column does not exist" (42703)
**Solution** : Le service réessaie automatiquement avec les colonnes minimales et stocke le reste dans `extra_data`

### 2. Erreur "relation does not exist" (42P01)
**Solution** : La table d'extras n'existe pas. Exécuter les migrations ou le service ignorera cette table

### 3. Erreur bucket storage (404)
**Solution** : Le service essaie d'abord `events` puis `event-images` automatiquement

### 4. Erreur RLS "new row violates row-level security policy"
**Solution** : Vérifier que l'utilisateur est authentifié et que les politiques RLS sont correctes

## 📊 Structure de extra_data

Toutes les données qui ne peuvent pas être stockées directement sont mises dans `extra_data` :
```json
{
  "start_time": "2024-01-01T20:00:00Z",
  "end_time": "2024-01-01T23:00:00Z",
  "timezone": "Europe/Paris",
  "location_details": { ... },
  "coverData": { ... },
  "coHosts": [ ... ],
  "costs": [ ... ],
  "eventPhotos": [ ... ],
  "questionnaire": [ ... ],
  "itemsToBring": [ ... ],
  "playlist": { ... },
  "createdWithService": "EventServiceComplete",
  "createdAt": "2024-01-01T10:00:00Z"
}
```

## ✅ Checklist de Déploiement

- [ ] Toutes les migrations SQL exécutées
- [ ] Buckets storage créés
- [ ] Variables d'environnement Supabase configurées
- [ ] Test de création d'événement réussi
- [ ] Vérification des logs dans la console

## 🔍 Debug et Logs

Pour activer les logs détaillés :
1. Ouvrir la console du navigateur
2. Créer un événement
3. Observer les logs avec préfixes :
   - 🚀 Début de processus
   - 📋 Préparation des données
   - 💾 Opérations base de données
   - ✅ Succès
   - ❌ Erreurs
   - 🎉 Fin de processus

## 📱 Extras Supportés

1. **Co-hosts** : Autres organisateurs de l'événement
2. **Coûts** : Prix par personne avec devise et description
3. **Photos** : Album photo de l'événement
4. **Questionnaire** : Questions aux participants
5. **Items à apporter** : Liste d'objets à apporter
6. **Playlist** : Liens vers playlists musicales
7. **Stickers** : Autocollants décoratifs sur la couverture
8. **RSVP** : Date limite et rappels automatiques

## 🎯 Bonnes Pratiques

1. **Toujours utiliser EventServiceComplete** pour la création
2. **Consulter les logs** en cas de problème
3. **Tester avec la page debug** avant la production
4. **Vérifier extra_data** pour les données manquantes
5. **Gérer les erreurs** avec des messages clairs pour l'utilisateur

## 🆘 Support

En cas de problème :
1. Vérifier la page `/debug-events`
2. Consulter les logs de la console
3. Vérifier le dashboard Supabase
4. S'assurer que toutes les migrations sont appliquées
5. Vérifier les permissions RLS