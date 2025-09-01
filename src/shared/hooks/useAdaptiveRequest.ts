import { useState, useCallback } from 'react';
import { useNetworkStore } from '../stores/networkStore';
import { withNetworkRetry } from '../utils/networkRetry';
import { cachedRequest } from '../utils/offlineCache';

interface AdaptiveRequestOptions {
  baseTimeout?: number;
  maxRetries?: number;
  offlineMessage?: string;
  enableCache?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
  onProgress?: (progress: number) => void;
}

interface AdaptiveRequestResult<T> {
  execute: (requestFn: () => Promise<T>) => Promise<T | null>;
  loading: boolean;
  error: string | null;
  progress: number;
  retry: () => Promise<T | null>;
  reset: () => void;
}

/**
 * Hook pour requêtes avec gestion réseau intelligente
 * @example
 * const { execute, loading, error } = useAdaptiveRequest({
 *   baseTimeout: 10000,
 *   maxRetries: 3,
 *   enableCache: true,
 *   cacheKey: 'users-list'
 * });
 *
 * const data = await execute(() => supabase.from('users').select());
 */
export function useAdaptiveRequest<T = any>(
  options: AdaptiveRequestOptions = {}
): AdaptiveRequestResult<T> {
  const {
    baseTimeout = 10000,
    maxRetries = 3,
    offlineMessage = 'Aucune connexion internet',
    enableCache = false,
    cacheKey,
    cacheTTL = 5 * 60 * 1000, // 5 minutes par défaut
    onProgress,
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [lastRequestFn, setLastRequestFn] = useState<(() => Promise<T>) | null>(null);

  const { connectionQuality, isConnected } = useNetworkStore();

  const getAdaptedTimeout = useCallback(() => {
    switch (connectionQuality) {
      case 'poor':
        return baseTimeout * 2;
      case 'offline':
        return baseTimeout * 5;
      default:
        return baseTimeout;
    }
  }, [connectionQuality, baseTimeout]);

  const getAdaptedRetries = useCallback(() => {
    switch (connectionQuality) {
      case 'poor':
        return maxRetries + 2;
      case 'offline':
        return 0; // Pas de retry si offline
      default:
        return maxRetries;
    }
  }, [connectionQuality, maxRetries]);

  const updateProgress = useCallback(
    (value: number) => {
      setProgress(value);
      if (onProgress) {
        onProgress(value);
      }
    },
    [onProgress]
  );

  const execute = useCallback(
    async (requestFn: () => Promise<T>): Promise<T | null> => {
      // Sauvegarder la fonction pour retry
      setLastRequestFn(() => requestFn);

      if (!isConnected) {
        // Si cache activé et clé fournie, tenter de récupérer depuis le cache
        if (enableCache && cacheKey) {
          try {
            setLoading(true);
            updateProgress(50);
            const cachedData = await cachedRequest(cacheKey, requestFn, {
              ttl: cacheTTL,
              fallbackToCache: true,
            });
            updateProgress(100);
            setLoading(false);
            return cachedData;
          } catch (cacheError) {
            setError(offlineMessage);
            setLoading(false);
            updateProgress(0);
            return null;
          }
        }

        setError(offlineMessage);
        return null;
      }

      setLoading(true);
      setError(null);
      updateProgress(10);

      try {
        let result: T;

        if (enableCache && cacheKey) {
          // Utiliser le cache si activé
          updateProgress(30);
          result = await cachedRequest(
            cacheKey,
            async () => {
              updateProgress(50);
              const data = await withNetworkRetry(requestFn, {
                maxRetries: getAdaptedRetries(),
                timeout: getAdaptedTimeout(),
                onRetry: (attempt) => {
                  updateProgress(50 + attempt * 10);
                  console.log(`🔄 [AdaptiveRequest] Retry attempt ${attempt}`);
                },
              });
              updateProgress(90);
              return data;
            },
            { ttl: cacheTTL, fallbackToCache: true }
          );
        } else {
          // Sans cache
          updateProgress(30);
          result = await withNetworkRetry(requestFn, {
            maxRetries: getAdaptedRetries(),
            timeout: getAdaptedTimeout(),
            onRetry: (attempt) => {
              updateProgress(30 + attempt * 20);
              console.log(`🔄 [AdaptiveRequest] Retry attempt ${attempt}`);
            },
          });
          updateProgress(90);
        }

        updateProgress(100);
        setLoading(false);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(errorMessage);
        setLoading(false);
        updateProgress(0);
        console.error('❌ [AdaptiveRequest] Request failed:', err);
        return null;
      }
    },
    [
      isConnected,
      enableCache,
      cacheKey,
      cacheTTL,
      offlineMessage,
      getAdaptedRetries,
      getAdaptedTimeout,
      updateProgress,
    ]
  );

  const retry = useCallback(async (): Promise<T | null> => {
    if (lastRequestFn) {
      return execute(lastRequestFn);
    }
    return null;
  }, [execute, lastRequestFn]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setProgress(0);
    setLastRequestFn(null);
  }, []);

  return {
    execute,
    loading,
    error,
    progress,
    retry,
    reset,
  };
}

/**
 * Hook pour requêtes multiples avec gestion réseau
 * @example
 * const { executeAll, results, loading } = useAdaptiveMultiRequest();
 *
 * const [users, posts] = await executeAll([
 *   () => supabase.from('users').select(),
 *   () => supabase.from('posts').select()
 * ]);
 */
export function useAdaptiveMultiRequest<T = any>(
  options: Omit<AdaptiveRequestOptions, 'cacheKey'> = {}
) {
  const [results, setResults] = useState<(T | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<(string | null)[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);

  const executeAll = useCallback(
    async (
      requests: Array<{
        fn: () => Promise<T>;
        cacheKey?: string;
      }>
    ): Promise<(T | null)[]> => {
      setLoading(true);
      setErrors([]);
      setResults([]);
      setOverallProgress(0);

      const results = await Promise.all(
        requests.map(async (request, index) => {
          try {
            // Progress tracking
            const baseProgress = (index / requests.length) * 100;
            setOverallProgress(baseProgress + 25); // Start progress

            // Execute the request directly with network retry logic
            const result = await withNetworkRetry(request.fn, options.maxRetries || 3);

            // Update progress
            setOverallProgress(baseProgress + 100 / requests.length);
            return result;
          } catch (error) {
            setErrors((prev) => {
              const newErrors = [...prev];
              newErrors[index] = error instanceof Error ? error.message : 'Erreur';
              return newErrors;
            });
            return null;
          }
        })
      );

      setResults(results);
      setLoading(false);
      setOverallProgress(100);
      return results;
    },
    [options]
  );

  return {
    executeAll,
    results,
    loading,
    errors,
    progress: overallProgress,
  };
}
