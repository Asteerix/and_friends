import * as React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetworkStore } from '../stores/networkStore';

interface CacheOptions {
  ttl?: number; // Time to live en ms
  fallbackToCache?: boolean;
  compress?: boolean;
}

interface CachedData<T> {
  data: T;
  timestamp: number;
  ttl: number;
  compressed?: boolean;
}

/**
 * Système de cache pour mode offline
 * @example
 * const users = await cachedRequest(
 *   'users_list',
 *   () => supabase.from('users').select(),
 *   { ttl: 5 * 60 * 1000 } // 5 minutes
 * );
 */
export async function cachedRequest<T>(
  key: string,
  requestFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = 60 * 60 * 1000, fallbackToCache = true, compress = false } = options;
  const { isConnected } = useNetworkStore.getState();

  // Mode offline : retourne le cache
  if (!isConnected && fallbackToCache) {
    const cached = await getCachedData<T>(key);
    if (cached) {
      console.log(`📦 [Cache] Returning offline data for ${key}`);
      return cached;
    }
    throw new Error('Pas de données en cache pour le mode hors ligne');
  }

  try {
    // Requête normale
    const data = await requestFn();

    // Sauvegarde en cache
    await setCachedData(key, data, ttl, compress);

    return data;
  } catch (error) {
    console.error(`❌ [Cache] Request failed for ${key}:`, error);

    // Fallback sur le cache en cas d'erreur
    if (fallbackToCache) {
      const cached = await getCachedData<T>(key);
      if (cached) {
        console.log(`📦 [Cache] Returning fallback data for ${key}`);
        return cached;
      }
    }
    throw error;
  }
}

/**
 * Récupère les données du cache
 */
async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const stored = await AsyncStorage.getItem(key);
    if (!stored) return null;

    const cached: CachedData<T> = JSON.parse(stored);

    // Vérifie si le cache est expiré
    if (Date.now() - cached.timestamp > cached.ttl) {
      console.log(`🗑️ [Cache] Expired data for ${key}`);
      await AsyncStorage.removeItem(key);
      return null;
    }

    // Décompression si nécessaire
    let data = cached.data;
    if (cached.compressed) {
      // Dans un cas réel, implémenter la décompression
      // Pour l'instant, on retourne les données telles quelles
      data = cached.data;
    }

    console.log(`✅ [Cache] Valid data found for ${key}`);
    return data;
  } catch (error) {
    console.error(`❌ [Cache] Error reading ${key}:`, error);
    return null;
  }
}

/**
 * Sauvegarde les données en cache
 */
async function setCachedData<T>(
  key: string,
  data: T,
  ttl: number,
  compress: boolean
): Promise<void> {
  try {
    let dataToStore = data;

    // Compression si demandée (à implémenter selon les besoins)
    if (compress) {
      // Dans un cas réel, implémenter la compression
      // Pour l'instant, on stocke les données telles quelles
      dataToStore = data;
    }

    const cacheData: CachedData<T> = {
      data: dataToStore,
      timestamp: Date.now(),
      ttl,
      compressed: compress,
    };

    await AsyncStorage.setItem(key, JSON.stringify(cacheData));
    console.log(`💾 [Cache] Data saved for ${key}`);
  } catch (error) {
    console.error(`❌ [Cache] Error saving ${key}:`, error);
  }
}

/**
 * Efface une entrée du cache
 */
export async function clearCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
    console.log(`🗑️ [Cache] Cleared ${key}`);
  } catch (error) {
    console.error(`❌ [Cache] Error clearing ${key}:`, error);
  }
}

/**
 * Efface tout le cache
 */
export async function clearAllCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys);
    console.log(`🗑️ [Cache] Cleared all cache (${keys.length} items)`);
  } catch (error) {
    console.error('❌ [Cache] Error clearing all cache:', error);
  }
}

/**
 * Obtient la taille du cache
 */
export async function getCacheSize(): Promise<number> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    let totalSize = 0;

    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        totalSize += value.length;
      }
    }

    return totalSize;
  } catch (error) {
    console.error('❌ [Cache] Error calculating size:', error);
    return 0;
  }
}

/**
 * Nettoie les entrées expirées du cache
 */
export async function cleanExpiredCache(): Promise<number> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    let removedCount = 0;

    for (const key of keys) {
      try {
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const cached = JSON.parse(stored);
          if (cached.timestamp && cached.ttl) {
            if (Date.now() - cached.timestamp > cached.ttl) {
              await AsyncStorage.removeItem(key);
              removedCount++;
            }
          }
        }
      } catch {
        // Ignorer les erreurs de parsing
      }
    }

    console.log(`🗑️ [Cache] Cleaned ${removedCount} expired entries`);
    return removedCount;
  } catch (error) {
    console.error('❌ [Cache] Error cleaning expired entries:', error);
    return 0;
  }
}

/**
 * Hook pour gérer le cache dans un composant
 * @example
 * const { data, loading, error, refresh } = useCachedData(
 *   'users',
 *   () => supabase.from('users').select()
 * );
 */
export function useCachedData<T>(key: string, requestFn: () => Promise<T>, options?: CacheOptions) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const fetch = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await cachedRequest(key, requestFn, options);
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [key, requestFn, options]);

  React.useEffect(() => {
    fetch();
  }, [fetch]);

  const refresh = React.useCallback(async () => {
    await clearCache(key);
    await fetch();
  }, [key, fetch]);

  return { data, loading, error, refresh };
}
