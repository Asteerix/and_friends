# Guide Complet - Création d'Événements avec Supabase

## 🎉 Vue d'ensemble

Ce guide documente la mise en place complète du système de création d'événements avec TOUS les extras dans l'application $Friends.

## 📊 Structure de la Base de Données

### Table Principale : `events`

La table `events` contient maintenant toutes les colonnes nécessaires :

#### Colonnes de Base
- `id` (UUID) - Identifiant unique
- `title` (TEXT) - Titre de l'événement
- `subtitle` (TEXT) - Sous-titre
- `description` (TEXT) - Description complète
- `date` (TIMESTAMPTZ) - Date/heure de l'événement
- `location` (TEXT) - Localisation textuelle
- `image_url` (TEXT) - URL de l'image principale
- `tags` (TEXT[]) - Tags de l'événement
- `is_private` (BOOLEAN) - Événement privé ou public
- `created_by` (UUID) - Créateur de l'événement
- `created_at` (TIMESTAMPTZ) - Date de création
- `updated_at` (TIMESTAMPTZ) - Date de mise à jour

#### Colonnes de Couverture
- `cover_bg_color` (TEXT) - Couleur de fond
- `cover_font` (TEXT) - Police du titre
- `cover_image` (TEXT) - Image de couverture
- `cover_stickers` (JSONB) - Stickers placés
- `cover_data` (JSONB) - Données complètes de couverture

#### Colonnes d'Organisation
- `organizer_id` (UUID) - Organisateur principal
- `co_organizers` (UUID[]) - Co-organisateurs
- `category` (TEXT) - Catégorie de l'événement

#### Colonnes de Localisation
- `venue_name` (TEXT) - Nom du lieu
- `address` (TEXT) - Adresse
- `city` (TEXT) - Ville
- `postal_code` (TEXT) - Code postal
- `country` (TEXT) - Pays
- `coordinates` (JSONB) - Coordonnées GPS

#### Colonnes de Timing
- `start_time` (TIMESTAMPTZ) - Heure de début
- `end_time` (TIMESTAMPTZ) - Heure de fin
- `timezone` (TEXT) - Fuseau horaire

#### Colonnes de Participation
- `max_attendees` (INTEGER) - Nombre max de participants
- `current_attendees` (INTEGER) - Participants actuels
- `privacy` (TEXT) - Niveau de confidentialité
- `status` (TEXT) - Statut de l'événement

#### Colonnes de Prix et RSVP
- `price` (DECIMAL) - Prix d'entrée
- `currency` (TEXT) - Devise
- `payment_required` (BOOLEAN) - Paiement requis
- `rsvp_deadline` (TIMESTAMPTZ) - Date limite RSVP
- `rsvp_reminder_enabled` (BOOLEAN) - Rappel activé
- `rsvp_reminder_timing` (TEXT) - Timing du rappel

#### Colonnes Supplémentaires
- `what_to_bring` (TEXT[]) - Items à apporter
- `view_count` (INTEGER) - Nombre de vues
- `share_count` (INTEGER) - Nombre de partages
- `extra_data` (JSONB) - Données supplémentaires

### Tables d'Extras

1. **`event_participants`** - Participants aux événements
2. **`event_attendees`** - Alternative aux participants (nouvelle table)
3. **`event_costs`** - Coûts par personne
4. **`event_photos`** - Photos de l'événement
5. **`event_questionnaire`** - Questions personnalisées
6. **`event_items`** - Items à apporter
7. **`event_playlists`** - Playlists musicales
8. **`event_cover_stickers`** - Stickers de couverture

## 🔧 Services Créés

### EventServiceComplete (`eventServiceComplete.ts`)

Service principal qui gère :
- ✅ Authentification utilisateur
- ✅ Upload d'images de couverture
- ✅ Création de l'événement principal
- ✅ Ajout du créateur comme participant
- ✅ Gestion de TOUS les extras :
  - Co-hosts
  - Coûts
  - Photos
  - Questionnaires
  - Stickers
  - Playlists
  - Items à apporter

## 📱 Interface Utilisateur

### CreateEventScreen.tsx

L'écran de création gère maintenant :
- ✅ Titre et sous-titre personnalisés
- ✅ Couverture avec fond, image ou template
- ✅ Stickers repositionnables
- ✅ Date et heure avec picker
- ✅ Localisation avec recherche
- ✅ Description détaillée
- ✅ Tous les extras via modales :
  - `CostPerPersonModal` - Gestion des coûts
  - `PhotoAlbumModal` - Album photos
  - `ItemsToBringModal` - Items à apporter
  - `RSVPDeadlineModal` - Date limite RSVP
  - `GuestQuestionnaireModal` - Questions personnalisées
  - `PlaylistModal` - Playlist musicale
  - `ManageCoHostsModal` - Co-organisateurs

## 🚀 Comment Utiliser

### 1. Créer un Événement

```typescript
const eventData: CreateEventData = {
  // Données de base
  title: "Mon Super Événement",
  subtitle: "Une soirée inoubliable",
  description: "Description complète...",
  date: new Date(),
  location: "Paris, France",
  isPrivate: false,
  
  // Couverture
  coverData: {
    eventTitle: "Mon Super Événement",
    eventSubtitle: "Une soirée inoubliable",
    selectedTitleFont: "1",
    selectedSubtitleFont: "1",
    selectedBackground: "gradient1",
    coverImage: "",
    uploadedImage: "",
    placedStickers: [],
    selectedTemplate: null
  },
  
  // Extras (optionnels)
  coHosts: [],
  costs: [],
  eventPhotos: [],
  questionnaire: [],
  itemsToBring: [],
  playlist: []
};

const result = await EventServiceComplete.createEvent(eventData);
```

### 2. Vérifier la Création

Le service retourne :
```typescript
{
  success: true,
  event: { /* données de l'événement créé */ },
  extrasResults: {
    coHosts: { success: true, count: 2 },
    costs: { success: true, count: 1 },
    photos: { success: true, count: 3 },
    // etc...
  }
}
```

## 🐛 Debugging

### Logs Détaillés

Le service produit des logs très détaillés :
```
🚀🚀🚀 [EventServiceComplete] DÉBUT CRÉATION ÉVÉNEMENT COMPLÈTE
🔐 [Complete] AUTHENTIFICATION
📸 [Complete] UPLOAD IMAGE COUVERTURE
📝 [Complete] CRÉATION ÉVÉNEMENT PRINCIPAL
👤 [Complete] AJOUT DU CRÉATEUR
🎯 [Complete] TRAITEMENT DES EXTRAS
🎉🎉🎉 [Complete] CRÉATION TERMINÉE AVEC SUCCÈS!
```

### Points de Vérification

1. **Authentification** : L'utilisateur doit être connecté
2. **Images** : Les images locales (file://) sont automatiquement uploadées
3. **Participants** : Le créateur est automatiquement ajouté comme participant
4. **Extras** : Chaque extra est traité individuellement (échecs non bloquants)
5. **Compatibilité** : Le service gère les différentes versions de tables

## 🔒 Sécurité

### Row Level Security (RLS)

- ✅ Les utilisateurs ne peuvent voir que les événements publics ou auxquels ils participent
- ✅ Seuls les organisateurs peuvent modifier leurs événements
- ✅ Les participants peuvent s'inscrire/se désinscrire eux-mêmes
- ✅ Les extras sont protégés par les mêmes règles

## 📈 Améliorations Futures

1. **Récurrence** : Ajouter le support des événements récurrents
2. **Notifications** : Système de notifications pour les rappels RSVP
3. **Paiements** : Intégration avec Stripe pour les événements payants
4. **Analytics** : Tableau de bord pour les organisateurs
5. **Templates** : Sauvegarder des templates d'événements réutilisables

## 🎯 Résumé

Le système de création d'événements est maintenant **100% fonctionnel** avec :
- ✅ Interface utilisateur complète
- ✅ Service robuste avec gestion d'erreurs
- ✅ Base de données bien structurée
- ✅ Support de TOUS les extras
- ✅ Logs détaillés pour le debugging
- ✅ Compatibilité avec différentes versions de schéma

**La création d'événements fonctionne maintenant avec ABSOLUMENT TOUT ! 🎉**