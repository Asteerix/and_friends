# Documentation du Système de Paramètres

## Vue d'ensemble

Le système de paramètres de l'application And Friends permet aux utilisateurs de personnaliser leurs préférences de notifications et de confidentialité. Il utilise une architecture hybride avec stockage local (AsyncStorage) et distant (Supabase) pour assurer une expérience optimale.

## Architecture

### 1. Stockage des données

Les paramètres sont stockés à deux endroits :

- **AsyncStorage** : Stockage local pour un accès rapide et hors ligne
- **Supabase** : Base de données pour la synchronisation entre appareils

Structure des paramètres :
```json
{
  "notifications": {
    "event_invites": true,      // Notifications pour les invitations aux événements
    "friend_requests": true,    // Notifications pour les demandes d'amis
    "event_reminders": true     // Rappels d'événements
  },
  "privacy": {
    "who_can_invite": "Public", // Qui peut inviter ("Public", "Friends", "No One")
    "hide_from_search": false   // Masquer le profil dans les recherches
  }
}
```

### 2. Flux de données

#### Chargement des paramètres
1. Vérification d'abord dans AsyncStorage (rapide)
2. Si absent, chargement depuis Supabase
3. Mise en cache dans AsyncStorage
4. Application des paramètres dans l'interface

#### Sauvegarde des paramètres
1. Sauvegarde immédiate dans AsyncStorage
2. Sauvegarde asynchrone dans Supabase
3. Mise à jour du profil local via `updateProfile`
4. Confirmation visuelle à l'utilisateur

### 3. Synchronisation temps réel

Le système utilise les channels Supabase pour synchroniser les changements :
- Écoute des modifications sur la table `profiles`
- Mise à jour automatique de l'interface
- Synchronisation entre plusieurs appareils

## Composants principaux

### SettingsScreen (`src/features/settings/screens/SettingsScreen.tsx`)

Écran principal des paramètres avec :
- Toggles pour les notifications
- Sélecteurs pour la confidentialité
- Boutons de sauvegarde/annulation
- Gestion des erreurs

### useProfile Hook (`src/hooks/useProfile.ts`)

Hook React pour gérer le profil utilisateur :
- Chargement du profil avec les paramètres
- Mise à jour des paramètres
- Synchronisation temps réel
- Cache local

### Fonctions SQL

#### `should_send_notification(user_id, notification_type)`
Vérifie si une notification doit être envoyée selon les préférences de l'utilisateur.

#### `can_invite_to_event(inviter_id, invitee_id)`
Vérifie si un utilisateur peut en inviter un autre selon les paramètres de confidentialité.

#### `is_profile_hidden_from_search(user_id)`
Détermine si un profil doit être masqué dans les résultats de recherche.

## Utilisation

### Pour les développeurs

#### Lire les paramètres
```typescript
const { profile } = useProfile();
const settings = profile?.settings;

// Vérifier une préférence
if (settings?.notifications?.event_invites) {
  // L'utilisateur accepte les invitations
}
```

#### Modifier les paramètres
```typescript
const { updateProfile } = useProfile();

await updateProfile({
  settings: {
    notifications: {
      ...profile.settings.notifications,
      event_invites: false
    },
    privacy: profile.settings.privacy
  }
});
```

#### Vérifier les permissions avant une action
```typescript
// Avant d'envoyer une invitation
const { data: canInvite } = await supabase
  .rpc('can_invite_to_event', {
    p_inviter_id: currentUserId,
    p_invitee_id: targetUserId
  });

if (!canInvite) {
  Alert.alert('Impossible d\'inviter cet utilisateur');
  return;
}
```

### Pour les utilisateurs

1. **Accéder aux paramètres** : Profil > Icône paramètres
2. **Notifications** : Activer/désactiver chaque type
3. **Confidentialité** : Choisir qui peut vous inviter
4. **Sauvegarder** : Appuyer sur "Save Changes"
5. **Annuler** : Appuyer sur "Discard Changes"

## Tests

### Script de test complet
```bash
node scripts/test-settings-system.js
```

Ce script teste :
- Création et valeurs par défaut
- Sauvegarde locale et distante
- Synchronisation temps réel
- Fonctions SQL
- Gestion des erreurs
- Performance

### Script de vérification
```bash
node scripts/verify-settings-integration.js
```

Vérifie que tous les composants sont correctement intégrés.

## Cas d'usage

### 1. Désactiver toutes les notifications
```typescript
const disableAllNotifications = async () => {
  await updateProfile({
    settings: {
      notifications: {
        event_invites: false,
        friend_requests: false,
        event_reminders: false
      },
      privacy: profile.settings.privacy
    }
  });
};
```

### 2. Mode "Ne pas déranger"
```typescript
const enablePrivacyMode = async () => {
  await updateProfile({
    settings: {
      notifications: profile.settings.notifications,
      privacy: {
        who_can_invite: 'No One',
        hide_from_search: true
      }
    }
  });
};
```

### 3. Réinitialiser aux valeurs par défaut
```typescript
const resetToDefaults = async () => {
  await updateProfile({
    settings: {
      notifications: {
        event_invites: true,
        friend_requests: true,
        event_reminders: true
      },
      privacy: {
        who_can_invite: 'Public',
        hide_from_search: false
      }
    }
  });
};
```

## Gestion des erreurs

Le système gère plusieurs types d'erreurs :

1. **Erreur réseau** : Utilisation du cache local
2. **Erreur de sauvegarde** : Retry automatique
3. **Données corrompues** : Valeurs par défaut
4. **Synchronisation échouée** : Queue de synchronisation

## Performance

- **Temps de chargement** : < 50ms (depuis AsyncStorage)
- **Temps de sauvegarde** : < 100ms (local), < 500ms (Supabase)
- **Synchronisation** : Temps réel via WebSocket
- **Cache** : Invalidation automatique après mise à jour

## Sécurité

- **RLS (Row Level Security)** : Chaque utilisateur ne peut modifier que ses propres paramètres
- **Validation** : Types JSONB avec structure définie
- **Permissions** : Vérification côté serveur des actions sensibles

## Migration future

Pour ajouter de nouveaux paramètres :

1. Mettre à jour le type TypeScript
2. Ajouter les valeurs par défaut dans la migration SQL
3. Mettre à jour SettingsScreen
4. Documenter le nouveau paramètre

## Troubleshooting

### Les paramètres ne se sauvegardent pas
1. Vérifier la connexion internet
2. Vérifier les logs de la console
3. Tester avec le script `test-settings-system.js`

### Les paramètres ne se synchronisent pas
1. Vérifier la souscription temps réel
2. Redémarrer l'application
3. Vérifier les permissions Supabase

### Valeurs par défaut incorrectes
1. Exécuter la migration SQL
2. Vider AsyncStorage
3. Recharger le profil

## Conclusion

Le système de paramètres est conçu pour être :
- **Rapide** : Cache local pour performance optimale
- **Fiable** : Synchronisation avec fallback
- **Extensible** : Facile d'ajouter de nouveaux paramètres
- **Sécurisé** : RLS et validation des données