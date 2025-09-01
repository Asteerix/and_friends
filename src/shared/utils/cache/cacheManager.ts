import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CacheConfig {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size in bytes
  compress?: boolean; // Enable compression
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt?: number;
  size?: number;
}

export class CacheManager {
  private storagePrefix: string;
  private config: Required<CacheConfig>;
  private sizeTracker: Map<string, number> = new Map();
  private totalSize = 0;

  constructor(id: string = 'app-cache', config: CacheConfig = {}) {
    this.storagePrefix = id;
    this.config = {
      ttl: config.ttl || 3600000, // 1 hour default
      maxSize: config.maxSize || 50 * 1024 * 1024, // 50MB default
      compress: config.compress || false,
    };
    // Initialize size tracking asynchronously
    this.initializeSizeTracking().catch((error) =>
      console.error('Failed to initialize size tracking:', error)
    );
  }

  private async initializeSizeTracking(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const keys = allKeys.filter((key) => key.startsWith(this.storagePrefix + ':'));
      this.totalSize = 0;
      this.sizeTracker.clear();

      for (const key of keys) {
        const size = await this.getEntrySize(key);
        if (size > 0) {
          const shortKey = key.substring(this.storagePrefix.length + 1);
          this.sizeTracker.set(shortKey, size);
          this.totalSize += size;
        }
      }
    } catch (error) {
      console.error('Error initializing size tracking:', error);
    }
  }

  private async getEntrySize(key: string): Promise<number> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? new Blob([value]).size : 0;
    } catch {
      return 0;
    }
  }

  async set<T>(
    key: string,
    data: T,
    options: { ttl?: number; compress?: boolean } = {}
  ): Promise<void> {
    const ttl = options.ttl || this.config.ttl;
    const compress = options.compress ?? this.config.compress;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: ttl > 0 ? Date.now() + ttl : undefined,
    };

    const serialized = JSON.stringify(entry);
    const size = new Blob([serialized]).size;

    // Check if we need to evict old entries
    if (this.totalSize + size > this.config.maxSize) {
      await this.evictOldestEntries(size);
    }

    await AsyncStorage.setItem(`${this.storagePrefix}:${key}`, serialized);

    // Update size tracking
    const oldSize = this.sizeTracker.get(key) || 0;
    this.sizeTracker.set(key, size);
    this.totalSize = this.totalSize - oldSize + size;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(`${this.storagePrefix}:${key}`);
      if (!value) return null;

      const entry: CacheEntry<T> = JSON.parse(value);

      // Check if expired
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        await this.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: { ttl?: number; compress?: boolean } = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    await this.set(key, data, options);
    return data;
  }

  async delete(key: string): Promise<void> {
    try {
      const size = this.sizeTracker.get(key) || 0;
      await AsyncStorage.removeItem(`${this.storagePrefix}:${key}`);
      this.sizeTracker.delete(key);
      this.totalSize -= size;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const keysToRemove = allKeys.filter((key) => key.startsWith(this.storagePrefix + ':'));
      await AsyncStorage.multiRemove(keysToRemove);
      this.sizeTracker.clear();
      this.totalSize = 0;
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  async clearExpired(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const keys = allKeys.filter((key) => key.startsWith(this.storagePrefix + ':'));
      const now = Date.now();

      for (const fullKey of keys) {
        try {
          const value = await AsyncStorage.getItem(fullKey);
          if (value) {
            const entry = JSON.parse(value);
            if (entry.expiresAt && now > entry.expiresAt) {
              const shortKey = fullKey.substring(this.storagePrefix.length + 1);
              await this.delete(shortKey);
            }
          }
        } catch {
          // Invalid entry, remove it
          const shortKey = fullKey.substring(this.storagePrefix.length + 1);
          await this.delete(shortKey);
        }
      }
    } catch (error) {
      console.error('Clear expired error:', error);
    }
  }

  private async evictOldestEntries(requiredSpace: number): Promise<void> {
    try {
      const entries: Array<{ key: string; timestamp: number; size: number }> = [];
      const allKeys = await AsyncStorage.getAllKeys();
      const keys = allKeys.filter((key) => key.startsWith(this.storagePrefix + ':'));

      // Collect all entries with their timestamps
      for (const fullKey of keys) {
        try {
          const value = await AsyncStorage.getItem(fullKey);
          if (value) {
            const entry = JSON.parse(value);
            const shortKey = fullKey.substring(this.storagePrefix.length + 1);
            const size = this.sizeTracker.get(shortKey) || 0;
            entries.push({
              key: shortKey,
              timestamp: entry.timestamp || 0,
              size,
            });
          }
        } catch {
          // Invalid entry
        }
      }

      // Sort by timestamp (oldest first)
      entries.sort((a, b) => a.timestamp - b.timestamp);

      // Evict until we have enough space
      let freedSpace = 0;
      for (const entry of entries) {
        if (freedSpace >= requiredSpace) break;
        await this.delete(entry.key);
        freedSpace += entry.size;
      }
    } catch (error) {
      console.error('Evict oldest entries error:', error);
    }
  }

  getCacheSize(): number {
    return this.totalSize;
  }

  getCacheInfo(): {
    totalSize: number;
    itemCount: number;
    maxSize: number;
  } {
    return {
      totalSize: this.totalSize,
      itemCount: this.sizeTracker.size,
      maxSize: this.config.maxSize,
    };
  }

  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async getAllKeys(): Promise<string[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const prefix = this.storagePrefix + ':';
      return allKeys
        .filter((key) => key.startsWith(prefix))
        .map((key) => key.substring(prefix.length));
    } catch (error) {
      console.error('Get all keys error:', error);
      return [];
    }
  }

  // Batch operations
  async setMany<T>(
    items: Array<{ key: string; data: T; options?: { ttl?: number } }>
  ): Promise<void> {
    for (const item of items) {
      await this.set(item.key, item.data, item.options);
    }
  }

  async getMany<T>(keys: string[]): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>();
    for (const key of keys) {
      const value = await this.get<T>(key);
      result.set(key, value);
    }
    return result;
  }

  async deleteMany(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.delete(key);
    }
  }
}

// Singleton instances for different cache types
export const generalCache = new CacheManager('general-cache', {
  ttl: 3600000, // 1 hour
  maxSize: 20 * 1024 * 1024, // 20MB
});

export const userCache = new CacheManager('user-cache', {
  ttl: 86400000, // 24 hours
  maxSize: 10 * 1024 * 1024, // 10MB
});

export const eventCache = new CacheManager('event-cache', {
  ttl: 1800000, // 30 minutes
  maxSize: 15 * 1024 * 1024, // 15MB
});

export const imageCache = new CacheManager('image-cache', {
  ttl: 604800000, // 7 days
  maxSize: 100 * 1024 * 1024, // 100MB
  compress: true,
});
