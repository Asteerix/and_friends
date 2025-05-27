# 🚀 Guide de Déploiement - & Friends

## Prérequis

- Node.js 18+ installé
- React Native CLI ou Expo CLI
- Compte Supabase (gratuit)
- Xcode (pour iOS) ou Android Studio (pour Android)

## 1. Configuration Supabase

### Étape 1.1 : Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Créez un compte ou connectez-vous
3. Cliquez sur "New Project"
4. Choisissez votre organisation
5. Nommez votre projet (ex: "and-friends")
6. Choisissez une région proche de vos utilisateurs
7. Créez un mot de passe fort pour la base de données
8. Cliquez sur "Create new project"

### Étape 1.2 : Récupérer les clés d'API

1. Dans votre projet Supabase, allez dans **Settings > General**
2. Copiez l'**URL du projet** (format: `https://xxxxx.supabase.co`)
3. Allez dans **Settings > API**
4. Copiez la clé **anon public** (commence par `eyJhbGciOiJIUzI1NiI...`)

### Étape 1.3 : Configurer l'environnement

1. Copiez le fichier `.env.example` vers `.env`
2. Remplacez les valeurs par vos vraies clés :

```bash
EXPO_PUBLIC_SUPABASE_URL=https://votre-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Étape 1.4 : Appliquer les migrations

1. Installez Supabase CLI :
```bash
npm install -g supabase
```

2. Connectez-vous à votre projet :
```bash
supabase login
supabase link --project-ref votre-project-id
```

3. Appliquez les migrations :
```bash
supabase db push
```

**OU** copiez-collez le contenu de `supabase/migrations/20250601000100_create_core_tables.sql` dans l'éditeur SQL de Supabase.

### Étape 1.5 : Configurer l'authentification

1. Dans Supabase, allez dans **Authentication > Settings**
2. Activez l'authentification par téléphone
3. Configurez un provider SMS (Twilio recommandé)
4. Dans **Authentication > URL Configuration**, ajoutez vos domaines autorisés

### Étape 1.6 : Configurer le Storage (optionnel)

1. Allez dans **Storage**
2. Créez un bucket nommé `avatars`
3. Configurez les politiques pour permettre l'upload d'avatars

## 2. Installation du projet

### Étape 2.1 : Installer les dépendances

```bash
npm install
# ou
yarn install
```

### Étape 2.2 : Configuration iOS (si applicable)

```bash
cd ios && pod install
```

### Étape 2.3 : Configuration Android

Assurez-vous que votre `android/app/build.gradle` a les bonnes configurations pour React Native.

## 3. Lancement en développement

### Metro Bundler
```bash
npm start
# ou
yarn start
```

### iOS Simulator
```bash
npm run ios
# ou
yarn ios
```

### Android Emulator
```bash
npm run android
# ou
yarn android
```

## 4. Test des fonctionnalités

### 4.1 : Test de l'authentification
1. Lancez l'app
2. Entrez un vrai numéro de téléphone
3. Vérifiez que vous recevez l'OTP
4. Complétez le processus d'onboarding

### 4.2 : Test des événements
1. Créez un nouvel événement
2. Vérifiez qu'il apparaît dans la liste
3. Testez la participation à l'événement
4. Vérifiez le calendrier

### 4.3 : Test du chat
1. Rejoignez un événement
2. Ouvrez le chat de l'événement
3. Envoyez des messages
4. Vérifiez la réception en temps réel

## 5. Configuration de production

### Étape 5.1 : Variables d'environnement

Pour la production, configurez vos variables d'environnement dans :
- **Expo** : `app.config.js` ou Expo Application Services
- **React Native CLI** : Fastlane ou scripts de build

### Étape 5.2 : Build iOS

```bash
# Expo
expo build:ios

# React Native CLI
cd ios
xcodebuild -workspace AndFriends.xcworkspace -scheme AndFriends archive
```

### Étape 5.3 : Build Android

```bash
# Expo
expo build:android

# React Native CLI
cd android
./gradlew assembleRelease
```

## 6. Vérifications finales

### ✅ Checklist de déploiement

- [ ] Base de données Supabase créée et migrée
- [ ] Authentification par téléphone configurée
- [ ] Variables d'environnement configurées
- [ ] Application lance sans erreurs
- [ ] Authentification fonctionne
- [ ] Création d'événements fonctionne
- [ ] Chat temps réel fonctionne
- [ ] Profil utilisateur se charge
- [ ] Calendrier affiche les événements
- [ ] Navigation fonctionne entre tous les écrans

## 7. Monitoring et maintenance

### 7.1 : Supabase Dashboard
- Surveillez l'utilisation de la base de données
- Vérifiez les logs d'erreurs
- Surveillez les performances des requêtes

### 7.2 : Logs applicatifs
- Activez Flipper en développement
- Utilisez React Native Debugger
- Configurez Sentry pour la production

## 8. Dépannage

### Problèmes courants

**Erreur "Invalid API Key"**
- Vérifiez que vos clés Supabase sont correctes
- Assurez-vous que les variables d'environnement sont bien préfixées `EXPO_PUBLIC_`

**Authentification ne fonctionne pas**
- Vérifiez la configuration SMS dans Supabase
- Testez avec un numéro de téléphone valide
- Vérifiez les logs dans Authentication > Logs

**Messages ne s'affichent pas**
- Vérifiez que les politiques RLS sont correctes
- Testez les subscriptions temps réel
- Vérifiez les logs de la console

**Événements ne se créent pas**
- Vérifiez les permissions de la table `events`
- Testez avec des données simples d'abord
- Vérifiez les contraintes de base de données

## Support

Pour toute question :
1. Vérifiez les logs de Supabase Dashboard
2. Consultez la documentation Supabase
3. Vérifiez les erreurs de console dans l'app
4. Testez les requêtes SQL directement dans Supabase

---

🎉 **Votre application & Friends est maintenant prête pour la production !**