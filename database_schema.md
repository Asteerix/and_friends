# Base de données Supabase - Documentation

## Vue d'ensemble

Cette documentation décrit la structure complète de la base de données Supabase pour l'application $Friends. La base de données contient 44 tables principales dans le schéma `public`.

## Tables principales

### 1. **profiles**
Table centrale contenant les informations des utilisateurs.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| id | uuid | NO | - | Identifiant unique de l'utilisateur |
| created_at | timestamp with time zone | NO | now() | Date de création du profil |
| updated_at | timestamp with time zone | NO | now() | Date de dernière modification |
| full_name | text | YES | - | Nom complet |
| username | text | YES | - | Nom d'utilisateur unique |
| display_name | text | YES | - | Nom d'affichage |
| email | text | YES | - | Adresse email |
| avatar_url | text | YES | - | URL de l'avatar |
| cover_url | text | YES | - | URL de la photo de couverture |
| bio | text | YES | - | Biographie |
| birth_date | date | YES | - | Date de naissance |
| location | text | YES | - | Localisation |
| hobbies | text[] | YES | - | Liste des hobbies |
| interests | text[] | YES | - | Liste des centres d'intérêt |
| settings | jsonb | YES | {} | Paramètres utilisateur |
| is_profile_complete | boolean | NO | false | Profil complété ou non |

### 2. **events**
Table contenant tous les événements créés.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Identifiant unique |
| title | text | NO | - | Titre de l'événement |
| description | text | YES | - | Description |
| start_time | timestamp with time zone | YES | - | Heure de début |
| end_time | timestamp with time zone | YES | - | Heure de fin |
| timezone | text | YES | 'Europe/Paris' | Fuseau horaire |
| venue_name | text | YES | - | Nom du lieu |
| address | text | YES | - | Adresse |
| city | text | YES | - | Ville |
| postal_code | text | YES | - | Code postal |
| country | text | YES | - | Pays |
| coordinates | jsonb | YES | - | Coordonnées GPS |
| created_by | uuid | YES | - | Créateur (FK → profiles.id) |
| category | text | YES | 'social' | Catégorie |
| privacy | text | YES | 'public' | Niveau de confidentialité |
| status | text | YES | 'published' | Statut |
| max_attendees | integer | YES | - | Nombre max de participants |
| current_attendees | integer | YES | 0 | Nombre actuel de participants |
| price | numeric | YES | - | Prix |
| currency | text | YES | 'EUR' | Devise |
| cover_data | jsonb | YES | {} | Données de couverture |
| tags | text[] | YES | {} | Tags |
| has_capacity_enabled | boolean | YES | false | Gestion de capacité activée |
| has_costs_enabled | boolean | YES | false | Gestion des coûts activée |
| has_items_enabled | boolean | YES | false | Gestion des items activée |
| has_photos_enabled | boolean | YES | false | Photos activées |
| has_playlist_enabled | boolean | YES | false | Playlist activée |
| has_questionnaire_enabled | boolean | YES | false | Questionnaire activé |
| has_cohosts_enabled | boolean | YES | false | Co-hôtes activés |

### 3. **event_participants**
Table de liaison entre les événements et les participants.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| event_id | uuid | NO | - | ID de l'événement (FK → events.id) |
| user_id | uuid | NO | - | ID de l'utilisateur (FK → profiles.id) |
| joined_at | timestamp with time zone | YES | now() | Date d'inscription |
| status | text | YES | 'going' | Statut de participation |
| event_created_by | uuid | YES | - | Créateur de l'événement (FK → profiles.id) |

**Clé primaire composite**: (event_id, user_id)

### 4. **event_attendees**
Gestion des invitations et réponses aux événements.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| event_id | uuid | NO | - | ID de l'événement (FK → events.id) |
| user_id | uuid | NO | - | ID de l'utilisateur (FK → profiles.id) |
| status | text | YES | 'going' | Statut (going/maybe/not_going) |
| responded_at | timestamp with time zone | YES | now() | Date de réponse |
| invited_by | uuid | YES | - | Invité par (FK → profiles.id) |
| created_at | timestamp with time zone | YES | now() | Date de création |

### 5. **event_cohosts**
Gestion des co-organisateurs d'événements.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Identifiant unique |
| event_id | uuid | YES | - | ID de l'événement (FK → events.id) |
| user_id | uuid | YES | - | ID du co-hôte (FK → profiles.id) |
| status | text | YES | 'pending' | Statut (pending/accepted/declined) |
| permissions | text[] | YES | ['view_guests', 'invite_guests'] | Permissions |
| invited_by | uuid | YES | - | Invité par (FK → profiles.id) |
| added_at | timestamp with time zone | YES | now() | Date d'ajout |

### 6. **chats**
Table des conversations.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Identifiant unique |
| name | text | YES | - | Nom du chat (pour les groupes) |
| is_group | boolean | YES | false | Chat de groupe ou non |
| event_id | uuid | YES | - | Événement associé (FK → events.id) |
| created_by | uuid | YES | - | Créateur (FK → profiles.id) |
| created_at | timestamp with time zone | YES | now() | Date de création |

### 7. **messages**
Messages dans les chats.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Identifiant unique |
| chat_id | uuid | YES | - | ID du chat (FK → chats.id) |
| user_id | uuid | YES | - | Auteur (FK → profiles.id) |
| content | text | YES | - | Contenu du message |
| message_type | text | YES | 'text' | Type (text/image/video/etc) |
| metadata | jsonb | YES | - | Métadonnées additionnelles |
| created_at | timestamp with time zone | YES | now() | Date de création |

### 8. **friendships**
Relations d'amitié entre utilisateurs.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Identifiant unique |
| user_id | uuid | NO | - | Utilisateur (FK → profiles.id) |
| friend_id | uuid | NO | - | Ami (FK → profiles.id) |
| status | text | NO | 'pending' | Statut (pending/accepted/blocked) |
| requested_at | timestamp with time zone | YES | now() | Date de demande |
| responded_at | timestamp with time zone | YES | - | Date de réponse |

### 9. **stories**
Stories des utilisateurs (type Instagram).

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | Identifiant unique |
| user_id | uuid | NO | - | Auteur (FK → profiles.id) |
| event_id | uuid | YES | - | Événement associé (FK → events.id) |
| type | story_type | NO | 'photo' | Type (photo/video) |
| media_url | text | NO | - | URL du média |
| caption | text | YES | - | Légende |
| expires_at | timestamp with time zone | YES | now() + 24h | Date d'expiration |
| views_count | integer | YES | 0 | Nombre de vues |
| likes_count | integer | YES | 0 | Nombre de likes |

### 10. **notifications**
Système de notifications.

| Colonne | Type | Nullable | Default | Description |
|---------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Identifiant unique |
| user_id | uuid | NO | - | Destinataire (FK → profiles.id) |
| type | text | NO | - | Type de notification |
| title | text | NO | - | Titre |
| body | text | NO | - | Corps du message |
| data | jsonb | YES | {} | Données additionnelles |
| read | boolean | YES | false | Lu ou non |
| related_user_id | uuid | YES | - | Utilisateur concerné (FK → profiles.id) |
| created_at | timestamp with time zone | YES | now() | Date de création |

## Relations principales

### Relations User-centric
- **profiles** ← **friendships** (user_id, friend_id)
- **profiles** ← **events** (created_by)
- **profiles** ← **event_participants** (user_id)
- **profiles** ← **event_attendees** (user_id, invited_by)
- **profiles** ← **event_cohosts** (user_id, invited_by)
- **profiles** ← **messages** (user_id)
- **profiles** ← **stories** (user_id)
- **profiles** ← **notifications** (user_id, related_user_id)

### Relations Event-centric
- **events** ← **event_participants** (event_id)
- **events** ← **event_attendees** (event_id)
- **events** ← **event_cohosts** (event_id)
- **events** ← **event_photos** (event_id)
- **events** ← **event_items** (event_id)
- **events** ← **event_costs** (event_id)
- **events** ← **event_memories** (event_id)
- **events** ← **event_comments** (event_id)
- **events** ← **event_likes** (event_id)
- **events** ← **chats** (event_id)
- **events** ← **stories** (event_id)

### Relations Chat-centric
- **chats** ← **chat_participants** (chat_id)
- **chats** ← **messages** (chat_id)

## Tables additionnelles

### Tables de support événements
- **event_photos**: Photos d'événements
- **event_items**: Items à apporter
- **event_costs**: Coûts/dépenses
- **event_memories**: Souvenirs (photos/vidéos)
- **event_comments**: Commentaires
- **event_likes**: Likes d'événements
- **event_playlists**: Playlists musicales
- **event_questionnaires**: Questionnaires
- **event_questionnaire_responses**: Réponses aux questionnaires
- **event_rsvp_settings**: Paramètres RSVP
- **event_templates**: Modèles d'événements
- **event_cover_stickers**: Stickers de couverture

### Tables de support stories
- **story_views**: Vues des stories
- **story_likes**: Likes des stories
- **story_comments**: Commentaires
- **story_replies**: Réponses
- **story_saves**: Sauvegardes
- **story_highlights**: Stories mises en avant
- **story_reports**: Signalements

### Tables système
- **activities**: Journal d'activités
- **push_tokens**: Tokens de notification push
- **phone_contacts**: Contacts téléphoniques
- **user_blocks**: Utilisateurs bloqués
- **reports**: Signalements généraux
- **search_history**: Historique de recherche
- **polls**: Sondages
- **poll_votes**: Votes de sondages

## Index et contraintes

### Contraintes d'unicité principales
- profiles.username (unique)
- profiles.email (unique)
- (event_id, user_id) sur event_participants
- (event_id, user_id) sur event_attendees
- (user_id, friend_id) sur friendships

### Clés étrangères principales
Toutes les relations sont protégées par des contraintes de clés étrangères avec CASCADE sur DELETE pour maintenir l'intégrité référentielle.

## Notes importantes

1. **UUID**: Toutes les clés primaires utilisent le type UUID pour garantir l'unicité globale
2. **Timestamps**: Utilisation systématique de `timestamp with time zone` pour une gestion correcte des fuseaux horaires
3. **JSONB**: Utilisation de JSONB pour les données structurées flexibles (settings, metadata, etc.)
4. **Arrays**: Utilisation d'arrays PostgreSQL pour les listes (tags, permissions, etc.)
5. **Soft delete**: Certaines tables utilisent des flags (is_deleted) plutôt que des suppressions physiques