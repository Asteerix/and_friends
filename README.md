# & Friends - Application React Native avec Supabase

## Vue d'ensemble

& Friends est une application React Native complète qui permet aux utilisateurs de créer et participer à des événements, de discuter en temps réel, et de gérer leur profil social. L'application utilise Supabase comme backend pour l'authentification, la base de données et les fonctionnalités temps réel.

## Fonctionnalités

### 🔐 Authentification
- Authentification par téléphone avec OTP
- Processus d'onboarding complet (nom, avatar, permissions, préférences)
- Gestion de session avec Supabase Auth

### 📅 Gestion d'événements
- Création d'événements avec détails complets
- Participation aux événements (J'y vais / Peut-être / Non)
- Vue calendrier avec événements personnels
- Détails d'événement avec participants

### 💬 Chat en temps réel
- Chats de groupe pour les événements
- Messages en temps réel avec Supabase Realtime
- Support des messages texte et autres types de contenu

### 👤 Profil utilisateur
- Profil personnalisable avec préférences
- Paramètres de confidentialité
- Gestion des informations personnelles

### 📱 Interface utilisateur
- Design moderne avec animations fluides
- Navigation intuitive avec onglets
- Écrans de souvenirs et de calendrier
- Notifications en temps réel

## Architecture technique

### Structure du projet

```
src/
├── components/           # Composants réutilisables
├── hooks/               # Hooks personnalisés (useEvents, useMessages, etc.)
├── lib/                 # Configuration et contextes
├── locales/             # Internationalisation
├── navigation/          # Configuration de navigation
└── screens/             # Écrans de l'application
    ├── auth/           # Écrans d'authentification
    └── ...             # Autres écrans

supabase/
└── migrations/         # Migrations de base de données
```

### Technologies utilisées

- **React Native** - Framework mobile
- **Supabase** - Backend as a Service
  - PostgreSQL Database
  - Real-time subscriptions
  - Authentication
- **React Navigation** - Navigation
- **TypeScript** - Typage statique

### Base de données

#### Tables principales

1. **profiles** - Profils utilisateurs
2. **events** - Événements
3. **event_participants** - Participation aux événements
4. **chats** - Salles de discussion
5. **chat_participants** - Participants aux chats
6. **messages** - Messages
7. **notifications** - Notifications
8. **friendships** - Relations d'amitié

#### Sécurité RLS (Row Level Security)

Toutes les tables utilisent les politiques RLS de Supabase pour garantir que :
- Les utilisateurs ne peuvent voir que leurs propres données
- Les participants peuvent accéder aux chats auxquels ils appartiennent
- Les événements privés sont protégés

## Configuration

### 1. Configuration Supabase

1. Créez un projet sur [Supabase](https://supabase.com)
2. Copiez les clés d'API dans `lib/supabase.ts`
3. Exécutez les migrations depuis le dossier `supabase/migrations/`

### 2. Installation des dépendances

```bash
npm install
# ou
yarn install
```

### 3. Configuration iOS (si applicable)

```bash
cd ios && pod install
```

### 4. Lancement de l'application

```bash
# Développement
npm start
# ou
yarn start

# iOS
npm run ios
# ou
yarn ios

# Android
npm run android
# ou
yarn android
```

## Fonctionnalités implémentées

### ✅ Complètement fonctionnel
- [x] Authentification par téléphone
- [x] Processus d'onboarding complet
- [x] Création et gestion d'événements
- [x] Participation aux événements
- [x] Chat en temps réel
- [x] Gestion de profil
- [x] Notifications
- [x] Vue calendrier
- [x] Écran souvenirs
- [x] Navigation complète

### 🚧 Hooks et services

#### useEvents
- Gestion complète des événements
- Création, récupération, mise à jour
- Intégration avec Supabase

#### useMessages
- Messages en temps réel
- Envoi et réception de messages
- Subscriptions Supabase Realtime

#### useSession
- Gestion de l'état d'authentification
- Context React pour l'état global
- Synchronisation avec Supabase Auth

## Écrans principaux

### Écrans d'authentification
1. **PhoneVerificationScreen** - Saisie du numéro de téléphone
2. **CodeVerificationScreen** - Vérification OTP
3. **NameInputScreen** - Saisie du nom
4. **AvatarPickScreen** - Sélection d'avatar
5. **ContactsPermissionScreen** - Permission contacts
6. **LocationPermissionScreen** - Permission localisation
7. **AgeInputScreen** - Saisie de l'âge
8. **PathInputScreen** - Parcours professionnel
9. **JamPickerScreen** - Préférences culinaires
10. **RestaurantPickerScreen** - Restaurants préférés
11. **HobbyPickerScreen** - Centres d'intérêt
12. **LoadingScreen** - Finalisation du profil

### Écrans principaux
- **HomeScreen** - Écran d'accueil avec événements
- **CreateEventScreen** - Création d'événement
- **EventDetailsScreen** - Détails d'un événement
- **ConversationScreen** - Chat en temps réel
- **CalendarScreen** - Vue calendrier
- **MemoriesScreen** - Souvenirs et stories
- **ProfileScreen** - Profil utilisateur
- **NotificationsFullScreen** - Notifications

## Sécurité et bonnes pratiques

### Authentification
- Utilisation de Supabase Auth pour la sécurité
- Vérification OTP pour l'authentification téléphone
- Gestion des sessions sécurisée

### Base de données
- Row Level Security (RLS) activé sur toutes les tables
- Politiques de sécurité strictes
- Validation côté serveur avec PostgreSQL

### Performance
- Subscriptions temps réel optimisées
- Lazy loading des composants
- Gestion de l'état efficace avec React hooks

## Déploiement

### Prérequis
1. Compte Supabase configuré
2. Base de données avec migrations appliquées
3. Clés d'API configurées

### Étapes
1. Build de l'application : `npm run build`
2. Test sur dispositifs physiques
3. Publication sur stores (App Store / Google Play)

## Contribution

### Structure du code
- Suivre les conventions TypeScript
- Utiliser les hooks personnalisés pour la logique métier
- Maintenir la séparation des responsabilités

### Tests
- Tests unitaires pour les hooks
- Tests d'intégration pour les flux utilisateur
- Tests de performance pour les subscriptions temps réel

## Support

Pour toute question ou problème :
1. Vérifiez la documentation Supabase
2. Consultez les logs de l'application
3. Testez les migrations de base de données

---

Cette application démontre une implémentation complète d'une application sociale mobile avec React Native et Supabase, incluant l'authentification, les données temps réel, et une interface utilisateur moderne.
