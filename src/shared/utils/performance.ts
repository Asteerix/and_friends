import * as React from 'react';
import { useCallback, useRef } from 'react';
import { InteractionManager } from 'react-native';

/**
 * Performance optimization utilities for React Native applications
 */

/**
 * Debounce hook for optimizing frequent function calls
 */
export const useDebounce = <T extends (...args: any[]) => void>(callback: T, delay: number): T => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
};

/**
 * Throttle hook for limiting function calls
 */
export const useThrottle = <T extends (...args: any[]) => void>(callback: T, delay: number): T => {
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallRef.current;

      if (timeSinceLastCall >= delay) {
        lastCallRef.current = now;
        callback(...args);
      } else if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          callback(...args);
          timeoutRef.current = null;
        }, delay - timeSinceLastCall);
      }
    }) as T,
    [callback, delay]
  );
};

/**
 * Optimized image loading with lazy loading support
 */
export interface ImageLoadingOptions {
  placeholder?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  cachePolicy?: 'memory' | 'disk' | 'none';
}

export const optimizeImageUri = (uri: string, options: ImageLoadingOptions = {}): string => {
  const { maxWidth = 800, maxHeight = 600, quality = 80 } = options;

  // For development, return original URI
  if (__DEV__) {
    return uri;
  }

  // Add image optimization parameters
  const url = new URL(uri);
  url.searchParams.set('w', maxWidth.toString());
  url.searchParams.set('h', maxHeight.toString());
  url.searchParams.set('q', quality.toString());
  url.searchParams.set('fm', 'webp');

  return url.toString();
};

/**
 * Memory-efficient data processing utilities
 */
export class DataProcessor {
  private static readonly CHUNK_SIZE = 100;

  /**
   * Process large arrays in chunks to avoid blocking the main thread
   */
  static async processInChunks<T, R>(
    items: T[],
    processor: (item: T) => R,
    chunkSize: number = DataProcessor.CHUNK_SIZE
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const chunkResults = chunk.map(processor);
      results.push(...chunkResults);

      // Allow other operations to run
      if (i + chunkSize < items.length) {
        await new Promise((resolve) => {
          InteractionManager.runAfterInteractions(() => {
            setImmediate(resolve);
          });
        });
      }
    }

    return results;
  }

  /**
   * Optimized filtering with early termination
   */
  static filterWithLimit<T>(items: T[], predicate: (item: T) => boolean, limit: number = 50): T[] {
    const results: T[] = [];

    for (const item of items) {
      if (predicate(item)) {
        results.push(item);
        if (results.length >= limit) {
          break;
        }
      }
    }

    return results;
  }
}

/**
 * Network request optimization utilities
 */
export class NetworkOptimizer {
  private static requestCache = new Map<string, { data: any; timestamp: number }>();
  private static pendingRequests = new Map<string, Promise<any>>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Deduplicate identical requests
   */
  static async deduplicateRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // Check cache
    const cached = this.requestCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    // Make new request
    const promise = requestFn()
      .then((data) => {
        this.requestCache.set(key, { data, timestamp: Date.now() });
        this.pendingRequests.delete(key);
        return data;
      })
      .catch((error) => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Batch multiple requests together
   */
  static createBatcher<T>(
    batchFn: (keys: string[]) => Promise<Record<string, T>>,
    maxBatchSize: number = 10,
    maxWaitTime: number = 100
  ) {
    const queue: Array<{
      key: string;
      resolve: (value: T) => void;
      reject: (error: any) => void;
    }> = [];
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const processBatch = async () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (queue.length === 0) return;

      const batch = queue.splice(0);
      const keys = batch.map((item) => item.key);

      try {
        const results = await batchFn(keys);
        batch.forEach(({ key, resolve }) => {
          const result = results[key];
          if (result !== undefined) {
            resolve(result);
          }
        });
      } catch (error) {
        batch.forEach(({ reject }) => {
          reject(error);
        });
      }
    };

    return (key: string): Promise<T> => {
      return new Promise((resolve, reject) => {
        queue.push({ key, resolve, reject });

        if (queue.length >= maxBatchSize) {
          processBatch();
        } else if (!timeoutId) {
          timeoutId = setTimeout(processBatch, maxWaitTime);
        }
      });
    };
  }
}

/**
 * Component performance monitoring
 */
export class PerformanceMonitor {
  private static measurements = new Map<string, number[]>();

  /**
   * Measure component render time
   */
  static measureRender(componentName: string, renderFn: () => any): any {
    const start = performance.now();
    const result = renderFn();
    const duration = performance.now() - start;

    if (!this.measurements.has(componentName)) {
      this.measurements.set(componentName, []);
    }
    this.measurements.get(componentName)!.push(duration);

    // Log slow renders in development
    if (__DEV__ && duration > 16) {
      // 16ms = 60fps threshold
      console.warn(`Slow render detected: ${componentName} took ${duration.toFixed(2)}ms`);
    }

    return result;
  }

  /**
   * Get performance statistics for a component
   */
  static getStats(componentName: string) {
    const measurements = this.measurements.get(componentName) || [];
    if (measurements.length === 0) return null;

    const sum = measurements.reduce((a, b) => a + b, 0);
    const avg = sum / measurements.length;
    const max = Math.max(...measurements);
    const min = Math.min(...measurements);

    return { avg, max, min, count: measurements.length };
  }

  /**
   * Clear measurements for a component
   */
  static clearStats(componentName?: string) {
    if (componentName) {
      this.measurements.delete(componentName);
    } else {
      this.measurements.clear();
    }
  }
}

/**
 * Memory management utilities
 */
export class MemoryManager {
  private static readonly MAX_CACHE_SIZE = 100;
  private static cache = new Map<string, any>();
  private static accessOrder = new Map<string, number>();

  /**
   * LRU cache implementation
   */
  static setCache(key: string, value: any): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE && !this.cache.has(key)) {
      const oldestKey = this.getOldestKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.accessOrder.delete(oldestKey);
      }
    }

    this.cache.set(key, value);
    this.accessOrder.set(key, Date.now());
  }

  static getCache(key: string): any {
    if (this.cache.has(key)) {
      this.accessOrder.set(key, Date.now());
      return this.cache.get(key);
    }
    return undefined;
  }

  private static getOldestKey(): string | undefined {
    let oldestKey: string | undefined;
    let oldestTime = Infinity;

    this.accessOrder.forEach((time, key) => {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    });

    return oldestKey;
  }

  /**
   * Clear cache
   */
  static clearCache(): void {
    this.cache.clear();
    this.accessOrder.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      usage: (this.cache.size / this.MAX_CACHE_SIZE) * 100,
    };
  }
}

/**
 * Bundle size optimization helpers
 */
export const createLazyComponent = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
) => {
  return React.lazy(importFn);
};

/**
 * Animation performance utilities
 */
export const withAnimationOptimizations = {
  /**
   * Use native driver when possible
   */
  defaultAnimationConfig: {
    useNativeDriver: true,
    duration: 300,
  },

  /**
   * Optimize list animations
   */
  listItemAnimation: {
    useNativeDriver: true,
    duration: 200,
  },
};

export default {
  useDebounce,
  useThrottle,
  optimizeImageUri,
  DataProcessor,
  NetworkOptimizer,
  PerformanceMonitor,
  MemoryManager,
  createLazyComponent,
  withAnimationOptimizations,
};
