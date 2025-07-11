import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userCache } from '@/shared/utils/cache/cacheManager';
import { CacheKeys } from '@/shared/utils/cache/cacheKeys';
import { supabase } from '@/shared/lib/supabase/client';
import { UserProfile } from '@/hooks/useProfile';

export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: ['user', 'profile', userId],
    queryFn: async () => {
      const cacheKey = CacheKeys.USER_PROFILE(userId);
      
      // Try to get from cache first
      const cached = userCache.get<UserProfile>(cacheKey);
      if (cached) {
        return cached;
      }

      // Fetch from API
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      // Cache the result
      await userCache.set(cacheKey, data, { ttl: 24 * 60 * 60 * 1000 }); // 24 hours
      
      return data as UserProfile;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

export function useUserFriends(userId: string) {
  return useQuery({
    queryKey: ['user', 'friends', userId],
    queryFn: async () => {
      const cacheKey = CacheKeys.USER_FRIENDS(userId);
      
      // Try cache first
      const cached = userCache.get<any[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Fetch from API
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          *,
          friend:profiles!friendships_friend_id_fkey(*)
        `)
        .eq('user_id', userId)
        .eq('status', 'accepted');

      if (error) throw error;

      // Cache the result
      await userCache.set(cacheKey, data, { ttl: 60 * 60 * 1000 }); // 1 hour
      
      return data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

export function useInvalidateUserCache() {
  const queryClient = useQueryClient();
  
  return {
    invalidateProfile: (userId: string) => {
      userCache.delete(CacheKeys.USER_PROFILE(userId));
      queryClient.invalidateQueries({ queryKey: ['user', 'profile', userId] });
    },
    invalidateFriends: (userId: string) => {
      userCache.delete(CacheKeys.USER_FRIENDS(userId));
      queryClient.invalidateQueries({ queryKey: ['user', 'friends', userId] });
    },
    invalidateAll: (userId: string) => {
      // Clear all user-related cache
      const keysToDelete = [
        CacheKeys.USER_PROFILE(userId),
        CacheKeys.USER_FRIENDS(userId),
        CacheKeys.USER_FRIEND_REQUESTS(userId),
      ];
      keysToDelete.forEach(key => userCache.delete(key));
      
      // Invalidate React Query cache
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  };
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<UserProfile> }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, { userId }) => {
      // Update cache
      const cacheKey = CacheKeys.USER_PROFILE(userId);
      userCache.set(cacheKey, data, { ttl: 24 * 60 * 60 * 1000 });
      
      // Update React Query cache
      queryClient.setQueryData(['user', 'profile', userId], data);
      queryClient.invalidateQueries({ queryKey: ['user', 'profile', userId] });
    },
  });
}

export function usePrefetchUsers(userIds: string[]) {
  const queryClient = useQueryClient();
  
  return () => {
    userIds.forEach(userId => {
      queryClient.prefetchQuery({
        queryKey: ['user', 'profile', userId],
        queryFn: async () => {
          const cacheKey = CacheKeys.USER_PROFILE(userId);
          const cached = userCache.get<UserProfile>(cacheKey);
          if (cached) return cached;

          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (error) throw error;
          
          await userCache.set(cacheKey, data, { ttl: 24 * 60 * 60 * 1000 });
          return data as UserProfile;
        },
        staleTime: 5 * 60 * 1000,
      });
    });
  };
}