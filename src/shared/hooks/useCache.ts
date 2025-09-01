import { useCallback, useEffect, useState } from 'react';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { generalCache } from '@/shared/utils/cache/cacheManager';

interface UseCacheOptions<T> {
  key: string;
  fetcher: () => Promise<T>;
  ttl?: number;
  staleTime?: number;
  refetchInterval?: number;
  refetchOnReconnect?: boolean;
  fallbackData?: T;
}

export function useCache<T>({
  key,
  fetcher,
  ttl = 3600000, // 1 hour
  staleTime = 300000, // 5 minutes
  refetchInterval,
  refetchOnReconnect = true,
  fallbackData,
}: UseCacheOptions<T>) {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });

    return unsubscribe;
  }, []);

  const queryFn = useCallback(async () => {
    // Try cache first
    const cached = generalCache.get<T>(key);
    if (cached !== null) {
      // If online, fetch in background and update cache
      if (!isOffline) {
        fetcher()
          .then((freshData) => {
            generalCache.set(key, freshData, { ttl });
          })
          .catch((error) => {
            console.error(`Background fetch failed for ${key}:`, error);
          });
      }
      return cached;
    }

    // If offline and no cache, throw error or return fallback
    if (isOffline) {
      if (fallbackData !== undefined) {
        return fallbackData;
      }
      throw new Error('No cached data available offline');
    }

    // Fetch fresh data
    const freshData = await fetcher();
    await generalCache.set(key, freshData, { ttl });
    return freshData;
  }, [key, fetcher, ttl, isOffline, fallbackData]);

  return useQuery({
    queryKey: [key],
    queryFn,
    staleTime,
    gcTime: ttl,
    refetchInterval,
    refetchOnReconnect,
    retry: isOffline ? false : 3,
  });
}

export function useCachedData<T>(
  key: string,
  defaultValue?: T
): [T | undefined, (value: T) => void, () => void] {
  const [data, setData] = useState<T | undefined>(() => {
    const cached = generalCache.get<T>(key);
    return cached !== null ? cached : defaultValue;
  });

  const updateData = useCallback(
    (value: T) => {
      setData(value);
      generalCache.set(key, value);
    },
    [key]
  );

  const clearData = useCallback(() => {
    setData(defaultValue);
    generalCache.delete(key);
  }, [key, defaultValue]);

  useEffect(() => {
    const cached = generalCache.get<T>(key);
    if (cached !== null) {
      setData(cached);
    }
  }, [key]);

  return [data, updateData, clearData];
}

export function useClearCache() {
  return {
    clearAll: () => {
      generalCache.clear();
    },
    clearExpired: () => {
      generalCache.clearExpired();
    },
    clearByKey: (key: string) => {
      generalCache.delete(key);
    },
    clearByPattern: (pattern: string) => {
      const keys = generalCache.getAllKeys();
      keys.forEach((key) => {
        if (key.includes(pattern)) {
          generalCache.delete(key);
        }
      });
    },
    getCacheInfo: () => generalCache.getCacheInfo(),
  };
}

export function usePrefetch<T>(key: string, fetcher: () => Promise<T>, ttl?: number) {
  return useCallback(async () => {
    try {
      const data = await fetcher();
      await generalCache.set(key, data, { ttl });
      return data;
    } catch (error) {
      console.error(`Prefetch failed for ${key}:`, error);
      throw error;
    }
  }, [key, fetcher, ttl]);
}

export function useBatchCache<T>() {
  const setMany = useCallback(async (items: Array<{ key: string; data: T; ttl?: number }>) => {
    await generalCache.setMany(
      items.map((item) => ({
        key: item.key,
        data: item.data,
        options: { ttl: item.ttl },
      }))
    );
  }, []);

  const getMany = useCallback((keys: string[]): Map<string, T | null> => {
    return generalCache.getMany<T>(keys);
  }, []);

  const deleteMany = useCallback((keys: string[]) => {
    generalCache.deleteMany(keys);
  }, []);

  return { setMany, getMany, deleteMany };
}
