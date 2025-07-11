import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { eventCache } from '@/shared/utils/cache/cacheManager';
import { CacheKeys } from '@/shared/utils/cache/cacheKeys';
import { supabase } from '@/shared/lib/supabase/client';
import { Event } from '@/entities/event/types';

export function useEventDetails(eventId: string) {
  return useQuery({
    queryKey: ['event', 'details', eventId],
    queryFn: async () => {
      const cacheKey = CacheKeys.EVENT_DETAILS(eventId);
      
      // Try cache first
      const cached = eventCache.get<Event>(cacheKey);
      if (cached) {
        return cached;
      }

      // Fetch from API
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          creator:profiles!events_creator_id_fkey(*),
          participants:event_participants(
            user_id,
            status,
            profile:profiles(*)
          )
        `)
        .eq('id', eventId)
        .single();

      if (error) throw error;

      // Cache the result
      await eventCache.set(cacheKey, data, { ttl: 30 * 60 * 1000 }); // 30 minutes
      
      return data as Event;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useEventsList(filters?: {
  category?: string;
  startDate?: string;
  endDate?: string;
  creatorId?: string;
}) {
  const filterKey = JSON.stringify(filters || {});
  
  return useInfiniteQuery({
    queryKey: ['events', 'list', filterKey],
    queryFn: async ({ pageParam = 0 }) => {
      const cacheKey = CacheKeys.EVENTS_LIST(`${filterKey}-${pageParam}`);
      
      // Try cache first
      const cached = eventCache.get<any>(cacheKey);
      if (cached) {
        return cached;
      }

      let query = supabase
        .from('events')
        .select(`
          *,
          creator:profiles!events_creator_id_fkey(*),
          _count:event_participants(count)
        `)
        .order('date', { ascending: false })
        .range(pageParam * 20, (pageParam + 1) * 20 - 1);

      // Apply filters
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.creatorId) {
        query = query.eq('creator_id', filters.creatorId);
      }
      if (filters?.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('date', filters.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      const result = {
        events: data,
        nextPage: data.length === 20 ? pageParam + 1 : undefined,
      };

      // Cache the result
      await eventCache.set(cacheKey, result, { ttl: 10 * 60 * 1000 }); // 10 minutes
      
      return result;
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useNearbyEvents(lat: number, lng: number, radiusKm: number = 10) {
  return useQuery({
    queryKey: ['events', 'nearby', lat, lng, radiusKm],
    queryFn: async () => {
      const cacheKey = CacheKeys.EVENTS_NEARBY(lat, lng, radiusKm);
      
      // Try cache first
      const cached = eventCache.get<Event[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Fetch nearby events using PostGIS
      const { data, error } = await supabase.rpc('get_nearby_events', {
        user_lat: lat,
        user_lng: lng,
        radius_km: radiusKm,
      });

      if (error) throw error;

      // Cache the result
      await eventCache.set(cacheKey, data, { ttl: 10 * 60 * 1000 }); // 10 minutes
      
      return data as Event[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useEventParticipants(eventId: string) {
  return useQuery({
    queryKey: ['event', 'participants', eventId],
    queryFn: async () => {
      const cacheKey = CacheKeys.EVENT_PARTICIPANTS(eventId);
      
      // Try cache first
      const cached = eventCache.get<any[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const { data, error } = await supabase
        .from('event_participants')
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq('event_id', eventId)
        .eq('status', 'going');

      if (error) throw error;

      // Cache the result
      await eventCache.set(cacheKey, data, { ttl: 10 * 60 * 1000 }); // 10 minutes
      
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useInvalidateEventCache() {
  const queryClient = useQueryClient();
  
  return {
    invalidateEvent: (eventId: string) => {
      eventCache.delete(CacheKeys.EVENT_DETAILS(eventId));
      eventCache.delete(CacheKeys.EVENT_PARTICIPANTS(eventId));
      queryClient.invalidateQueries({ queryKey: ['event', 'details', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event', 'participants', eventId] });
    },
    invalidateEventsList: () => {
      // Clear all event list caches
      const keys = eventCache.getAllKeys();
      keys.forEach(key => {
        if (key.startsWith('events:list:')) {
          eventCache.delete(key);
        }
      });
      queryClient.invalidateQueries({ queryKey: ['events', 'list'] });
    },
    invalidateNearbyEvents: () => {
      // Clear all nearby event caches
      const keys = eventCache.getAllKeys();
      keys.forEach(key => {
        if (key.startsWith('events:nearby:')) {
          eventCache.delete(key);
        }
      });
      queryClient.invalidateQueries({ queryKey: ['events', 'nearby'] });
    },
    invalidateAll: () => {
      eventCache.clear();
      queryClient.invalidateQueries({ queryKey: ['event'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  };
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  const { invalidateEventsList, invalidateNearbyEvents } = useInvalidateEventCache();
  
  return useMutation({
    mutationFn: async (eventData: Partial<Event>) => {
      const { data, error } = await supabase
        .from('events')
        .insert(eventData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate lists to show the new event
      invalidateEventsList();
      invalidateNearbyEvents();
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ eventId, updates }: { eventId: string; updates: Partial<Event> }) => {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, { eventId }) => {
      // Update cache
      const cacheKey = CacheKeys.EVENT_DETAILS(eventId);
      eventCache.set(cacheKey, data, { ttl: 30 * 60 * 1000 });
      
      // Update React Query cache
      queryClient.setQueryData(['event', 'details', eventId], data);
      queryClient.invalidateQueries({ queryKey: ['events', 'list'] });
    },
  });
}

export function usePrefetchEvents(eventIds: string[]) {
  const queryClient = useQueryClient();
  
  return () => {
    eventIds.forEach(eventId => {
      queryClient.prefetchQuery({
        queryKey: ['event', 'details', eventId],
        queryFn: async () => {
          const cacheKey = CacheKeys.EVENT_DETAILS(eventId);
          const cached = eventCache.get<Event>(cacheKey);
          if (cached) return cached;

          const { data, error } = await supabase
            .from('events')
            .select(`
              *,
              creator:profiles!events_creator_id_fkey(*),
              participants:event_participants(
                user_id,
                status,
                profile:profiles(*)
              )
            `)
            .eq('id', eventId)
            .single();

          if (error) throw error;
          
          await eventCache.set(cacheKey, data, { ttl: 30 * 60 * 1000 });
          return data as Event;
        },
        staleTime: 5 * 60 * 1000,
      });
    });
  };
}