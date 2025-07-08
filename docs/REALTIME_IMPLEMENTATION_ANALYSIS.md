# Analyse de l'implémentation du temps réel

## Vue d'ensemble

L'application utilise Supabase Realtime pour synchroniser les données en temps réel. Voici une analyse complète de l'implémentation actuelle.

## 1. Tables avec Realtime activé ✅

Les tables suivantes ont le realtime activé dans la publication Supabase :

- **Chat & Messages**
  - `messages`
  - `chats`
  - `chat_participants`

- **Stories & Interactions**
  - `stories`
  - `story_replies`
  - `story_saves`
  - `story_views`
  - `reply_likes`

- **Events**
  - `events`
  - `event_participants`
  - `event_comments`
  - `event_likes`
  - `event_memories`

- **Social**
  - `friendships`
  - `notifications`
  - `activities`

- **Polls**
  - `polls`
  - `poll_votes`

- **Memories**
  - `memory_comments`
  - `memory_likes`

## 2. Hooks et Providers utilisant des subscriptions

### Hook générique
- **`useRealtimeSubscription`** : Hook réutilisable pour créer des subscriptions
  - ✅ Utilise `removeChannel` pour nettoyer
  - ✅ Gère les événements INSERT, UPDATE, DELETE
  - ✅ Support des filtres

### Providers principaux

#### `MemoriesProvider`
- **Subscriptions** : 
  - Stories individuelles (table: stories, story_replies, story_likes, story_saves)
  - Toutes les stories
- **Nettoyage** : ✅ Stocke les channels dans un état et les nettoie tous au unmount
- **Pattern** : Excellent - gestion centralisée des channels

#### `NotificationProvider`
- **Subscription** : notifications filtrées par user_id
- **Nettoyage** : ✅ `unsubscribe()` dans useEffect cleanup
- **Pattern** : Standard, fonctionne bien

### Hooks spécifiques

#### `useMessages`
- **Subscriptions** : INSERT, UPDATE, DELETE sur messages
- **Nettoyage** : ✅ `subscription.unsubscribe()`
- **Particularité** : Évite les doublons en vérifiant l'user_id

#### `useChats`
- **Subscriptions** : 
  - chats (tous les événements)
  - chat_participants (tous les événements)
- **Nettoyage** : ✅ Deux `unsubscribe()` séparés

#### `useStories`
- **Subscription** : stories (tous les événements)
- **Nettoyage** : ✅ `subscription.unsubscribe()`
- **Extra** : Timer pour nettoyer les stories expirées

## 3. Problèmes identifiés

### 🔴 Problèmes critiques
1. **Pas de gestion d'erreur sur les subscriptions**
   - Les erreurs de connexion ne sont pas gérées
   - Pas de retry automatique

2. **Dépendances useEffect potentiellement instables**
   - Certains hooks ont des callbacks dans les dépendances qui peuvent causer des re-subscriptions

### 🟡 Problèmes modérés
1. **Performance**
   - Beaucoup de subscriptions simultanées peuvent impacter les performances
   - Pas de debouncing sur les mises à jour fréquentes

2. **Mémoire**
   - Les vieux messages/stories ne sont pas purgés de la mémoire
   - Accumulation potentielle sur les sessions longues

## 4. Recommandations d'optimisation

### 1. Créer un gestionnaire centralisé de subscriptions

```typescript
// shared/providers/RealtimeProvider.tsx
export const RealtimeProvider = ({ children }) => {
  const channelManager = useRef(new Map());
  
  const subscribe = useCallback((key, channel) => {
    channelManager.current.set(key, channel);
    return () => {
      const ch = channelManager.current.get(key);
      if (ch) {
        supabase.removeChannel(ch);
        channelManager.current.delete(key);
      }
    };
  }, []);
  
  // Cleanup all on unmount
  useEffect(() => {
    return () => {
      channelManager.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, []);
  
  return (
    <RealtimeContext.Provider value={{ subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
};
```

### 2. Ajouter la gestion d'erreur et reconnexion

```typescript
const useRealtimeWithRetry = (options) => {
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  
  useEffect(() => {
    let channel;
    let retryTimeout;
    
    const connect = () => {
      channel = supabase
        .channel(options.channel)
        .on('postgres_changes', options.config, options.callback)
        .on('system', { event: 'error' }, (error) => {
          console.error('Realtime error:', error);
          if (retryCount < maxRetries) {
            retryTimeout = setTimeout(() => {
              setRetryCount(r => r + 1);
            }, 1000 * Math.pow(2, retryCount));
          }
        })
        .subscribe();
    };
    
    connect();
    
    return () => {
      clearTimeout(retryTimeout);
      if (channel) supabase.removeChannel(channel);
    };
  }, [options, retryCount]);
};
```

### 3. Implémenter la pagination et le nettoyage

```typescript
// Dans useMessages
const MAX_MESSAGES = 100;

useEffect(() => {
  // Nettoyer les vieux messages
  if (messages.length > MAX_MESSAGES) {
    setMessages(prev => prev.slice(-MAX_MESSAGES));
  }
}, [messages.length]);
```

### 4. Utiliser des subscriptions sélectives

```typescript
// Au lieu de s'abonner à toutes les stories
// S'abonner uniquement aux stories des amis
const subscription = supabase
  .channel('friend-stories')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'stories',
    filter: `user_id=in.(${friendIds.join(',')})`
  }, callback)
  .subscribe();
```

### 5. Monitorer les performances

```typescript
// Ajouter des métriques
const trackSubscription = (name: string) => {
  console.log(`[Realtime] Subscription created: ${name}`);
  
  return () => {
    console.log(`[Realtime] Subscription removed: ${name}`);
  };
};
```

## 5. État actuel : Bon mais perfectible

### Points forts ✅
- Toutes les subscriptions sont correctement nettoyées
- Les tables critiques ont le realtime activé
- Pattern cohérent dans l'application

### À améliorer 🔧
- Ajouter gestion d'erreur et reconnexion
- Centraliser la gestion des subscriptions
- Optimiser pour la performance (pagination, debouncing)
- Monitorer l'utilisation mémoire

## Conclusion

L'implémentation actuelle est fonctionnelle et ne présente pas de fuites mémoire majeures. Les améliorations suggérées permettraient de rendre le système plus robuste et performant, surtout pour les utilisateurs avec des connexions instables ou des sessions longues.