# Bloc D – Plan de test rapide

## Objectif
Valider que la logique de gating de l'onboarding fonctionne comme prévu :
1. Un nouvel utilisateur est forcé de passer par tous les écrans d'onboarding (01 à 10).
2. Un nouvel utilisateur ne peut pas accéder à `HomeScreen` avant d'avoir complété l'onboarding.
3. Après avoir complété l'onboarding (après l'écran 10 et `LoadingScreen`), l'utilisateur est redirigé vers `HomeScreen`.
4. Un utilisateur ayant complété l'onboarding est directement redirigé vers `HomeScreen` lors des connexions suivantes (ne revoit pas les écrans d'onboarding).
5. La fonction `complete_onboarding` met correctement à jour le statut dans la base de données.

## Prérequis
- Avoir appliqué les migrations SQL (Bloc A).
- Avoir intégré les modifications TypeScript (Bloc B).
- Avoir un environnement Supabase distant configuré.

## Scénarios de test

### 1. Nouvel utilisateur - Flux d'onboarding complet
   a. **Action** : S'inscrire en tant que nouvel utilisateur (vider la table `auth.users` et `public.profiles` ou utiliser un nouvel email).
   b. **Attendu** :
      i. L'utilisateur est guidé à travers les écrans `01_PhoneVerificationScreen` jusqu'à `10_HobbyPickerScreen`.
      ii. L'utilisateur voit ensuite `11_LoadingScreen`.
      iii. Après `11_LoadingScreen`, l'utilisateur est redirigé vers `HomeScreen`.
      iv. Dans la table `public.profiles`, la colonne `onboarding_complete` pour cet utilisateur est `TRUE`.
   c. **Vérification** :
      - Navigation fluide à travers les écrans.
      - Redirection finale vers `HomeScreen`.
      - Vérifier la base de données.

### 2. Nouvel utilisateur - Tentative d'accès direct à HomeScreen
   a. **Action** : S'inscrire en tant que nouvel utilisateur. Être sur un écran d'onboarding (ex: `03_NameInputScreen`). Tenter de forcer la navigation vers `HomeScreen` (si possible via un outil de développement ou en modifiant temporairement le code de navigation initial).
   b. **Attendu** : L'utilisateur est redirigé vers l'écran d'onboarding actuel ou le début du flux d'onboarding, et ne peut pas accéder à `HomeScreen`.
   c. **Vérification** : La protection de route fonctionne.

### 3. Utilisateur existant (onboarding complété) - Reconnexion
   a. **Action** :
      i. Compléter l'onboarding avec un utilisateur (scénario 1).
      ii. Se déconnecter.
      iii. Se reconnecter avec le même utilisateur.
   b. **Attendu** : L'utilisateur est directement redirigé vers `HomeScreen` après la connexion, sans passer par les écrans d'onboarding.
   c. **Vérification** : Redirection directe vers `HomeScreen`.

### 4. Utilisateur existant (onboarding NON complété) - Reconnexion
   a. **Action** :
      i. Commencer l'onboarding avec un utilisateur, s'arrêter à un écran intermédiaire (ex: `05_ContactsPermissionScreen`).
      ii. Fermer et rouvrir l'application (ou simuler une déconnexion/reconnexion si l'état de session persiste).
   b. **Attendu** : L'utilisateur est redirigé vers l'écran où il s'était arrêté dans le flux d'onboarding (ou au début du flux si la reprise d'étape exacte n'est pas gérée par `11_LoadingScreen` mais par `App.tsx` et `useOnboardingStatus`). Avec la logique actuelle dans `App.tsx` utilisant `useOnboardingStatus`, il devrait être redirigé vers `AuthNavigator` qui commencera à `Splash` puis `PhoneVerification`.
   c. **Vérification** : L'utilisateur ne va pas à `HomeScreen` et retourne au flux d'onboarding.

### 5. Vérification de la fonction RPC `complete_onboarding`
   a. **Action** :
      i. Isoler l'appel à `supabase.rpc('complete_onboarding')` (par exemple, via un script de test ou en le déclenchant manuellement après l'écran 10).
   b. **Attendu** : La colonne `onboarding_complete` dans `public.profiles` pour l'utilisateur authentifié passe à `TRUE`. Aucun message d'erreur de la RPC.
   c. **Vérification** : Consulter la base de données et les logs de la fonction.

## Tests Unitaires / E2E (Idées pour Detox si applicable)

- **`useOnboardingStatus` Hook**:
    - Tester le hook avec un utilisateur mocké ayant `onboarding_complete = true`. Attendu: `isOnboardingComplete` est `true`.
    - Tester avec `onboarding_complete = false`. Attendu: `isOnboardingComplete` est `false`.
    - Tester avec une erreur de Supabase. Attendu: `error` est setté, `isOnboardingComplete` est `false`.
- **Navigation Root (`App.tsx`)**:
    - Simuler un utilisateur loggué avec `onboarding_complete = true`. Attendu: `AppNavigator` est rendu.
    - Simuler un utilisateur loggué avec `onboarding_complete = false`. Attendu: `AuthNavigator` est rendu.
    - Simuler un utilisateur non loggué. Attendu: `AuthNavigator` est rendu.
- **`11_LoadingScreen.tsx`**:
    - Simuler l'arrivée sur cet écran. Attendu: `complete_onboarding` RPC est appelée.
    - Simuler une erreur de la RPC. Attendu: Une alerte est affichée, redirection vers `HomeScreen` (ou un fallback).
    - Simuler un succès de la RPC. Attendu: Redirection vers `HomeScreen`.

*(Detox nécessiterait une configuration spécifique et des tests d'interface utilisateur plus poussés, simulant les interactions réelles.)*