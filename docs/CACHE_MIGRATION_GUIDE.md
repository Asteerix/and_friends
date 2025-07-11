# Guide de Migration vers le Système de Cache

## Remplacement des Images

### Avant (Image native)
```tsx
import { Image } from 'react-native';

<Image
  source={{ uri: profile.avatar_url }}
  style={styles.avatar}
/>
```

### Après (CachedImage)
```tsx
import { CachedImage } from '@/shared/components/CachedImage';

<CachedImage
  uri={profile.avatar_url}
  style={styles.avatar}
  placeholder={require('@/assets/images/default-avatar.png')}
  fallback={require('@/assets/images/error-avatar.png')}
/>
```

## Exemples de Migration par Composant

### ProfileScreen.tsx
```tsx
// Remplacer l'import
- import { Image } from 'react-native';
+ import { CachedImage } from '@/shared/components/CachedImage';

// Header image
- <Image
-   source={
-     profile && isValidAvatar(profile.cover_url)
-       ? { uri: profile.cover_url }
-       : profile && isValidAvatar(profile.avatar_url)
-         ? { uri: profile.avatar_url }
-         : DEFAULT_AVATAR
-   }
-   style={styles.headerImage}
- />
+ <CachedImage
+   uri={profile?.cover_url || profile?.avatar_url}
+   style={styles.headerImage}
+   fallback={DEFAULT_AVATAR}
+ />

// Friend avatars
- <Image
-   source={
-     friend.avatar_url
-       ? { uri: friend.avatar_url }
-       : DEFAULT_AVATAR
-   }
-   style={styles.friendAvatar}
- />
+ <CachedImage
+   uri={friend.avatar_url}
+   style={styles.friendAvatar}
+   placeholder={DEFAULT_AVATAR}
+ />
```

### EventDetailsScreen.tsx
```tsx
// Gallery images (critique pour les performances)
- {photos.map((photo, index) => (
-   <Image
-     key={index}
-     source={{ uri: photo.url }}
-     style={styles.galleryImage}
-   />
- ))}
+ {photos.map((photo, index) => (
+   <CachedImage
+     key={index}
+     uri={photo.url}
+     style={styles.galleryImage}
+     priority="high"
+   />
+ ))}

// Précharger les images de la galerie
+ import { usePreloadImages } from '@/shared/components/CachedImage';
+ 
+ // Dans le composant
+ usePreloadImages(photos.map(p => p.url));
```

### MapScreen.tsx
```tsx
// Marker custom views
- <Image
-   source={{ uri: event.image_url }}
-   style={styles.markerImage}
- />
+ <CachedImage
+   uri={event.image_url}
+   style={styles.markerImage}
+   priority="low" // Les markers peuvent charger plus lentement
+ />
```

## Utilisation des Hooks de Cache

### Remplacer les appels API directs
```tsx
// Avant
const fetchUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  return data;
};

// Après
import { useUserProfile } from '@/shared/hooks/cache';

const { data: profile, isLoading, error } = useUserProfile(userId);
```

### Cache des événements avec pagination
```tsx
import { useEventsList } from '@/shared/hooks/cache';

const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = useEventsList({
  category: 'party',
  startDate: new Date().toISOString(),
});

// Afficher les événements
const allEvents = data?.pages.flatMap(page => page.events) ?? [];
```

## Actions Offline

### RSVP à un événement
```tsx
import { useOfflineQueue } from '@/shared/hooks/cache';

const { enqueue } = useOfflineQueue();

const handleRSVP = async () => {
  // L'action sera mise en queue si offline
  await enqueue('event.rsvp', {
    eventId: event.id,
    status: 'going',
  });
  
  // Mettre à jour l'UI immédiatement
  setIsAttending(true);
};
```

### Mise à jour du profil
```tsx
import { offlineOperations } from '@/shared/utils/cache/offlineSync';

const updateBio = async (newBio: string) => {
  // Cache mis à jour immédiatement, sync automatique
  await offlineOperations.updateProfile(userId, {
    bio: newBio,
  });
};
```

## Gestion du Cache

### Dans les Settings
```tsx
import { CacheDebugPanel } from '@/shared/components/CacheDebugPanel';

// Ajouter dans les paramètres développeur
{__DEV__ && <CacheDebugPanel />}
```

### Clear cache programmatiquement
```tsx
import { useClearCache } from '@/shared/hooks/cache';

const { clearAll, getCacheInfo } = useClearCache();

// Afficher la taille du cache
const info = getCacheInfo();
console.log(`Cache size: ${info.totalSize} bytes`);

// Nettoyer tout
await clearAll();
```

## Checklist de Migration

- [ ] Remplacer tous les `Image` avec des URLs distantes par `CachedImage`
- [ ] Identifier les API calls qui peuvent utiliser les hooks de cache
- [ ] Ajouter la précharge d'images pour les galeries
- [ ] Implémenter les actions offline pour les mutations critiques
- [ ] Tester le mode offline
- [ ] Vérifier les performances avec le cache activé
- [ ] Configurer les TTL selon vos besoins
- [ ] Ajouter le panel de debug en mode dev

## Points d'Attention

1. **Ne pas cacher les images locales** - Utilisez `Image` normal pour les assets
2. **Priorité des images** - Utilisez `priority="high"` pour les images critiques
3. **Invalidation après mutations** - Toujours invalider le cache après une modification
4. **Taille du cache** - Surveiller régulièrement la taille totale
5. **Test offline** - Tester toutes les fonctionnalités en mode avion