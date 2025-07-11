// Cache hooks exports
export { useCache, useCachedData, useClearCache, usePrefetch, useBatchCache } from '../useCache';
export { useUserProfile, useUserFriends, useInvalidateUserCache, useUpdateProfile, usePrefetchUsers } from '../useUserCache';
export { 
  useEventDetails, 
  useEventsList, 
  useNearbyEvents, 
  useEventParticipants,
  useInvalidateEventCache,
  useCreateEvent,
  useUpdateEvent,
  usePrefetchEvents 
} from '../useEventCache';
export { useOfflineQueue } from '../useOfflineQueue';
export { useOfflineSync } from '../useOfflineSync';

// Re-export components
export { CachedImage, usePreloadImages, useImageCache } from '@/shared/components/CachedImage';

// Re-export cache utilities
export * from '@/shared/utils/cache';