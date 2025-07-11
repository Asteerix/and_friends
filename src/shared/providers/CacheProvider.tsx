import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/shared/utils/cache/queryClient';
import { useOfflineQueue } from '@/shared/hooks/useOfflineQueue';
import { supabase } from '@/shared/lib/supabase/client';
import { generalCache, userCache, eventCache } from '@/shared/utils/cache/cacheManager';

interface CacheContextValue {
  clearAllCaches: () => Promise<void>;
  warmUpCache: (userId: string) => Promise<void>;
}

const CacheContext = createContext<CacheContextValue | undefined>(undefined);

export const useCacheContext = () => {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCacheContext must be used within CacheProvider');
  }
  return context;
};

interface CacheProviderProps {
  children: ReactNode;
}

export const CacheProvider: React.FC<CacheProviderProps> = ({ children }) => {
  const { registerHandler } = useOfflineQueue();

  useEffect(() => {
    // Register offline queue handlers
    registerHandler('event.rsvp', async (action) => {
      const { eventId, status } = action.payload;
      const { error } = await supabase
        .from('event_participants')
        .upsert({
          event_id: eventId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          status,
        });
      
      if (error) throw error;
    });

    registerHandler('profile.update', async (action) => {
      const { userId, updates } = action.payload;
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);
      
      if (error) throw error;
    });

    registerHandler('event.create', async (action) => {
      const { error } = await supabase
        .from('events')
        .insert(action.payload);
      
      if (error) throw error;
    });

    registerHandler('message.send', async (action) => {
      const { error } = await supabase
        .from('messages')
        .insert(action.payload);
      
      if (error) throw error;
    });

    // Clear expired cache periodically
    const clearExpiredInterval = setInterval(() => {
      generalCache.clearExpired();
      userCache.clearExpired();
      eventCache.clearExpired();
    }, 60 * 60 * 1000); // Every hour

    return () => {
      clearInterval(clearExpiredInterval);
    };
  }, [registerHandler]);

  const clearAllCaches = async () => {
    // Clear MMKV caches
    generalCache.clear();
    userCache.clear();
    eventCache.clear();
    
    // Clear React Query cache
    queryClient.clear();
    
    // Clear image cache
    const { imageCacheManager } = await import('@/shared/utils/cache/imageCache');
    await imageCacheManager.clearCache();
  };

  const warmUpCache = async (userId: string) => {
    try {
      // Prefetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profile) {
        await userCache.set(
          `user:profile:${userId}`,
          profile,
          { ttl: 24 * 60 * 60 * 1000 }
        );
      }

      // Prefetch user's events
      const { data: events } = await supabase
        .from('events')
        .select('*')
        .or(`creator_id.eq.${userId},participants.cs.{${userId}}`)
        .order('date', { ascending: false })
        .limit(20);
      
      if (events) {
        await eventCache.set(
          `events:user:${userId}`,
          events,
          { ttl: 30 * 60 * 1000 }
        );
      }

      // Prefetch friends
      const { data: friends } = await supabase
        .from('friendships')
        .select(`
          *,
          friend:profiles!friendships_friend_id_fkey(*)
        `)
        .eq('user_id', userId)
        .eq('status', 'accepted');
      
      if (friends) {
        await userCache.set(
          `user:friends:${userId}`,
          friends,
          { ttl: 60 * 60 * 1000 }
        );
      }
    } catch (error) {
      console.error('Failed to warm up cache:', error);
    }
  };

  const value: CacheContextValue = {
    clearAllCaches,
    warmUpCache,
  };

  return (
    <CacheContext.Provider value={value}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </CacheContext.Provider>
  );
};