/**
 * Optimized Query Hook
 * Provides intelligent caching, batching, and optimization for API calls
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface QueryOptions<T> {
  cacheKey?: string;
  cacheDuration?: number; // in milliseconds
  staleTime?: number; // Time before data is considered stale
  refetchInterval?: number;
  refetchOnFocus?: boolean;
  refetchOnReconnect?: boolean;
  retry?: number;
  retryDelay?: number;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  transform?: (data: any) => T;
  dedupe?: boolean;
}

interface QueryState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  isStale: boolean;
  isFetching: boolean;
  lastUpdated: number | null;
}

// Global cache for deduplication
const queryCache = new Map<string, any>();
const pendingQueries = new Map<string, Promise<any>>();

export function useOptimizedQuery<T>(
  queryKey: string,
  queryFn: () => Promise<T>,
  options: QueryOptions<T> = {}
) {
  const {
    cacheKey = queryKey,
    cacheDuration = 5 * 60 * 1000, // 5 minutes default
    staleTime = 30 * 1000, // 30 seconds default
    refetchInterval,
    refetchOnFocus = false,
    refetchOnReconnect = true,
    retry = 3,
    retryDelay = 1000,
    enabled = true,
    onSuccess,
    onError,
    transform,
    dedupe = true,
  } = options;

  const [state, setState] = useState<QueryState<T>>({
    data: null,
    isLoading: false,
    error: null,
    isStale: false,
    isFetching: false,
    lastUpdated: null,
  });

  const isMountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const refetchIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load cached data on mount
  useEffect(() => {
    const loadCachedData = async () => {
      try {
        const cachedData = await AsyncStorage.getItem(`query_cache_${cacheKey}`);
        if (cachedData && isMountedRef.current) {
          const { data, timestamp } = JSON.parse(cachedData);
          const now = Date.now();
          const isExpired = now - timestamp > cacheDuration;
          const isStale = now - timestamp > staleTime;

          if (!isExpired) {
            setState((prev) => ({
              ...prev,
              data: transform ? transform(data) : data,
              isStale,
              lastUpdated: timestamp,
            }));
          }
        }
      } catch (error) {
        console.warn('Failed to load cached query data:', error);
      }
    };

    loadCachedData();
  }, [cacheKey, cacheDuration, staleTime, transform]);

  // Execute query with optimization
  const executeQuery = useCallback(
    async (isRefetch = false): Promise<T | null> => {
      if (!enabled) return null;

      const queryId = `${queryKey}_${Date.now()}`;

      // Check if query is already pending (deduplication)
      if (dedupe && pendingQueries.has(queryKey)) {
        return pendingQueries.get(queryKey);
      }

      // Check cache first (for non-refetch calls)
      if (!isRefetch && queryCache.has(cacheKey)) {
        const cached = queryCache.get(cacheKey);
        const now = Date.now();
        if (now - cached.timestamp < staleTime) {
          return cached.data;
        }
      }

      setState((prev) => ({
        ...prev,
        isLoading: !prev.data, // Show loading only if no cached data
        isFetching: true,
        error: null,
      }));

      const queryPromise = (async (): Promise<T> => {
        for (let attempt = 0; attempt <= retry; attempt++) {
          try {
            const result = await queryFn();
            const transformedResult = transform ? transform(result) : result;

            if (isMountedRef.current) {
              const now = Date.now();

              // Update state
              setState((prev) => ({
                ...prev,
                data: transformedResult,
                isLoading: false,
                isFetching: false,
                error: null,
                isStale: false,
                lastUpdated: now,
              }));

              // Cache in memory
              queryCache.set(cacheKey, {
                data: result,
                timestamp: now,
              });

              // Cache in AsyncStorage
              try {
                await AsyncStorage.setItem(
                  `query_cache_${cacheKey}`,
                  JSON.stringify({
                    data: result,
                    timestamp: now,
                  })
                );
              } catch (cacheError) {
                console.warn('Failed to cache query data:', cacheError);
              }

              // Reset retry count
              retryCountRef.current = 0;

              // Call success callback
              onSuccess?.(transformedResult);
            }

            return transformedResult;
          } catch (error) {
            console.warn(`Query attempt ${attempt + 1} failed:`, error);

            if (attempt === retry) {
              // Final attempt failed
              const finalError = error as Error;

              if (isMountedRef.current) {
                setState((prev) => ({
                  ...prev,
                  isLoading: false,
                  isFetching: false,
                  error: finalError,
                }));

                onError?.(finalError);
              }

              throw finalError;
            } else {
              // Wait before retry
              await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
            }
          }
        }

        throw new Error('All retry attempts failed');
      })();

      // Store pending query for deduplication
      if (dedupe) {
        pendingQueries.set(queryKey, queryPromise);
        queryPromise.finally(() => {
          pendingQueries.delete(queryKey);
        });
      }

      return queryPromise;
    },
    [
      enabled,
      queryKey,
      queryFn,
      cacheKey,
      staleTime,
      retry,
      retryDelay,
      transform,
      onSuccess,
      onError,
      dedupe,
    ]
  );

  // Initial fetch
  useEffect(() => {
    if (enabled && (!state.data || state.isStale)) {
      executeQuery();
    }
  }, [enabled, executeQuery, state.data, state.isStale]);

  // Set up refetch interval
  useEffect(() => {
    if (refetchInterval && enabled) {
      refetchIntervalRef.current = setInterval(() => {
        executeQuery(true);
      }, refetchInterval);

      return () => {
        if (refetchIntervalRef.current) {
          clearInterval(refetchIntervalRef.current);
        }
      };
    }
  }, [refetchInterval, enabled, executeQuery]);

  // Manual refetch function
  const refetch = useCallback(() => {
    return executeQuery(true);
  }, [executeQuery]);

  // Invalidate cache
  const invalidate = useCallback(async () => {
    queryCache.delete(cacheKey);
    try {
      await AsyncStorage.removeItem(`query_cache_${cacheKey}`);
    } catch (error) {
      console.warn('Failed to invalidate query cache:', error);
    }
    setState((prev) => ({ ...prev, isStale: true }));
  }, [cacheKey]);

  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (refetchIntervalRef.current) {
        clearInterval(refetchIntervalRef.current);
      }
    };
  }, []);

  // Memoized return value
  const result = useMemo(
    () => ({
      ...state,
      refetch,
      invalidate,
      isSuccess: !state.isLoading && !state.error && state.data !== null,
      isError: !!state.error,
    }),
    [state, refetch, invalidate]
  );

  return result;
}

/**
 * Hook for paginated queries with infinite loading
 */
export function useOptimizedInfiniteQuery<T>(
  baseQueryKey: string,
  queryFn: (page: number, previousPageData?: T[]) => Promise<T[]>,
  options: QueryOptions<T[]> & {
    getNextPageParam?: (lastPage: T[], allPages: T[][]) => number | null;
    hasMoreData?: (lastPage: T[]) => boolean;
  } = {}
) {
  const {
    getNextPageParam = (_, allPages) => allPages.length + 1,
    hasMoreData = (lastPage) => lastPage.length > 0,
    ...queryOptions
  } = options;

  const [allPages, setAllPages] = useState<T[][]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const queryKey = `${baseQueryKey}_page_${currentPage}`;

  const pageQueryFn = useCallback(async () => {
    const previousPageData = allPages.length > 0 ? allPages[allPages.length - 1] : undefined;
    return queryFn(currentPage, previousPageData);
  }, [queryFn, currentPage, allPages]);

  const query = useOptimizedQuery(queryKey, pageQueryFn, {
    ...queryOptions,
    onSuccess: (data) => {
      setAllPages((prev) => {
        const newPages = [...prev];
        newPages[currentPage - 1] = data;
        return newPages;
      });

      if (!hasMoreData(data)) {
        setHasMore(false);
      }

      queryOptions.onSuccess?.(data);
    },
  });

  const loadNextPage = useCallback(() => {
    if (hasMore && !query.isFetching) {
      const nextPage = getNextPageParam(allPages[allPages.length - 1] || [], allPages);

      if (nextPage !== null) {
        setCurrentPage(nextPage);
      } else {
        setHasMore(false);
      }
    }
  }, [hasMore, query.isFetching, getNextPageParam, allPages]);

  const flatData = useMemo(() => {
    return allPages.flat();
  }, [allPages]);

  return {
    ...query,
    data: flatData,
    hasMore,
    loadNextPage,
    allPages,
  };
}

/**
 * Clear all query cache
 */
export async function clearQueryCache() {
  queryCache.clear();

  try {
    const keys = await AsyncStorage.getAllKeys();
    const queryKeys = keys.filter((key) => key.startsWith('query_cache_'));
    await AsyncStorage.multiRemove(queryKeys);
  } catch (error) {
    console.warn('Failed to clear query cache:', error);
  }
}
