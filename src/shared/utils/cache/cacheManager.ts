import { MMKV } from 'react-native-mmkv';

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
  private storage: MMKV;
  private config: Required<CacheConfig>;
  private sizeTracker: Map<string, number> = new Map();
  private totalSize = 0;

  constructor(id: string = 'app-cache', config: CacheConfig = {}) {
    this.storage = new MMKV({ id });
    this.config = {
      ttl: config.ttl || 3600000, // 1 hour default
      maxSize: config.maxSize || 50 * 1024 * 1024, // 50MB default
      compress: config.compress || false,
    };
    this.initializeSizeTracking();
  }

  private initializeSizeTracking(): void {
    const keys = this.storage.getAllKeys();
    this.totalSize = 0;
    this.sizeTracker.clear();

    keys.forEach(key => {
      const size = this.getEntrySize(key);
      if (size > 0) {
        this.sizeTracker.set(key, size);
        this.totalSize += size;
      }
    });
  }

  private getEntrySize(key: string): number {
    try {
      const value = this.storage.getString(key);
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

    this.storage.set(key, serialized);
    
    // Update size tracking
    const oldSize = this.sizeTracker.get(key) || 0;
    this.sizeTracker.set(key, size);
    this.totalSize = this.totalSize - oldSize + size;
  }

  get<T>(key: string): T | null {
    try {
      const value = this.storage.getString(key);
      if (!value) return null;

      const entry: CacheEntry<T> = JSON.parse(value);
      
      // Check if expired
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        this.delete(key);
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
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    await this.set(key, data, options);
    return data;
  }

  delete(key: string): void {
    const size = this.sizeTracker.get(key) || 0;
    this.storage.delete(key);
    this.sizeTracker.delete(key);
    this.totalSize -= size;
  }

  clear(): void {
    this.storage.clearAll();
    this.sizeTracker.clear();
    this.totalSize = 0;
  }

  clearExpired(): void {
    const keys = this.storage.getAllKeys();
    const now = Date.now();

    keys.forEach(key => {
      try {
        const value = this.storage.getString(key);
        if (value) {
          const entry = JSON.parse(value);
          if (entry.expiresAt && now > entry.expiresAt) {
            this.delete(key);
          }
        }
      } catch {
        // Invalid entry, remove it
        this.delete(key);
      }
    });
  }

  private async evictOldestEntries(requiredSpace: number): Promise<void> {
    const entries: Array<{ key: string; timestamp: number; size: number }> = [];
    const keys = this.storage.getAllKeys();

    // Collect all entries with their timestamps
    keys.forEach(key => {
      try {
        const value = this.storage.getString(key);
        if (value) {
          const entry = JSON.parse(value);
          const size = this.sizeTracker.get(key) || 0;
          entries.push({
            key,
            timestamp: entry.timestamp || 0,
            size,
          });
        }
      } catch {
        // Invalid entry
      }
    });

    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a.timestamp - b.timestamp);

    // Evict until we have enough space
    let freedSpace = 0;
    for (const entry of entries) {
      if (freedSpace >= requiredSpace) break;
      this.delete(entry.key);
      freedSpace += entry.size;
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

  exists(key: string): boolean {
    const value = this.get(key);
    return value !== null;
  }

  getAllKeys(): string[] {
    return this.storage.getAllKeys();
  }

  // Batch operations
  async setMany<T>(
    items: Array<{ key: string; data: T; options?: { ttl?: number } }>
  ): Promise<void> {
    for (const item of items) {
      await this.set(item.key, item.data, item.options);
    }
  }

  getMany<T>(keys: string[]): Map<string, T | null> {
    const result = new Map<string, T | null>();
    keys.forEach(key => {
      result.set(key, this.get<T>(key));
    });
    return result;
  }

  deleteMany(keys: string[]): void {
    keys.forEach(key => this.delete(key));
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