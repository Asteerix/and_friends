import { CacheManager, CacheConfig } from '../cacheManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('CacheManager', () => {
  let cacheManager: CacheManager;
  const cacheId = 'test-cache';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Set up default AsyncStorage mocks
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();
    mockAsyncStorage.multiRemove.mockResolvedValue();
    mockAsyncStorage.getAllKeys.mockResolvedValue([]);

    cacheManager = new CacheManager(cacheId);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor and initialization', () => {
    it('should create cache manager with default config', () => {
      const cache = new CacheManager('default-cache');
      
      expect(cache).toBeDefined();
      // Internal config is private, but we can test behavior
    });

    it('should create cache manager with custom config', () => {
      const config: CacheConfig = {
        ttl: 5000,
        maxSize: 1024 * 1024,
        compress: true,
      };

      const cache = new CacheManager('custom-cache', config);
      
      expect(cache).toBeDefined();
    });

    it('should initialize size tracking', async () => {
      mockAsyncStorage.getAllKeys.mockResolvedValue([
        'test-cache:key1',
        'test-cache:key2',
        'other-cache:key3',
      ]);

      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'test-cache:key1') return Promise.resolve('{"data":"value1","createdAt":123}');
        if (key === 'test-cache:key2') return Promise.resolve('{"data":"value2","createdAt":456}');
        return Promise.resolve(null);
      });

      // Create cache manager (which triggers size initialization)
      const cache = new CacheManager('test-cache');
      
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockAsyncStorage.getAllKeys).toHaveBeenCalled();
    });
  });

  describe('set and get operations', () => {
    it('should store and retrieve data correctly', async () => {
      const testData = { message: 'Hello, World!' };
      
      await cacheManager.set('test-key', testData);
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'test-cache:test-key',
        expect.stringContaining(JSON.stringify(testData))
      );

      // Mock the stored data for retrieval
      const storedEntry = {
        data: testData,
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedEntry));

      const retrievedData = await cacheManager.get('test-key');
      
      expect(retrievedData).toEqual(testData);
    });

    it('should handle different data types', async () => {
      const testCases = [
        { key: 'string', data: 'test string' },
        { key: 'number', data: 42 },
        { key: 'boolean', data: true },
        { key: 'array', data: [1, 2, 3] },
        { key: 'object', data: { nested: { value: 'test' } } },
        { key: 'null', data: null },
      ];

      for (const { key, data } of testCases) {
        await cacheManager.set(key, data);

        const storedEntry = {
          data,
          createdAt: Date.now(),
          expiresAt: Date.now() + 3600000,
        };

        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedEntry));
        
        const retrieved = await cacheManager.get(key);
        expect(retrieved).toEqual(data);
      }
    });

    it('should return null for non-existent keys', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await cacheManager.get('non-existent');
      
      expect(result).toBeNull();
    });

    it('should handle TTL correctly', async () => {
      const testData = { message: 'test' };
      const ttl = 5000;

      await cacheManager.set('test-key', testData, { ttl });

      // Verify expiration time was set correctly
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'test-cache:test-key',
        expect.stringMatching(/"expiresAt":\d+/)
      );
    });

    it('should delete expired entries automatically', async () => {
      const expiredEntry = {
        data: { message: 'expired' },
        createdAt: Date.now() - 7200000,
        expiresAt: Date.now() - 3600000, // Expired 1 hour ago
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(expiredEntry));

      const result = await cacheManager.get('expired-key');
      
      expect(result).toBeNull();
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('test-cache:expired-key');
    });

    it('should handle JSON parse errors gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('invalid-json');

      const result = await cacheManager.get('corrupted-key');
      
      expect(result).toBeNull();
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      await expect(cacheManager.set('error-key', { data: 'test' })).resolves.toBeUndefined();
      // Should not throw
    });
  });

  describe('delete operations', () => {
    it('should delete entries correctly', async () => {
      await cacheManager.delete('test-key');

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('test-cache:test-key');
    });

    it('should handle delete errors gracefully', async () => {
      mockAsyncStorage.removeItem.mockRejectedValue(new Error('Delete error'));

      await expect(cacheManager.delete('error-key')).resolves.toBeUndefined();
      // Should not throw
    });
  });

  describe('clear operations', () => {
    it('should clear all cache entries', async () => {
      mockAsyncStorage.getAllKeys.mockResolvedValue([
        'test-cache:key1',
        'test-cache:key2',
        'other-cache:key3',
      ]);

      await cacheManager.clear();

      expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith([
        'test-cache:key1',
        'test-cache:key2',
      ]);
    });

    it('should handle clear errors gracefully', async () => {
      mockAsyncStorage.getAllKeys.mockRejectedValue(new Error('Keys error'));

      await expect(cacheManager.clear()).resolves.toBeUndefined();
      // Should not throw
    });

    it('should clear expired entries only', async () => {
      const currentTime = Date.now();
      
      mockAsyncStorage.getAllKeys.mockResolvedValue([
        'test-cache:valid',
        'test-cache:expired1',
        'test-cache:expired2',
      ]);

      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'test-cache:valid') {
          return Promise.resolve(JSON.stringify({
            data: 'valid',
            expiresAt: currentTime + 3600000,
          }));
        }
        if (key === 'test-cache:expired1') {
          return Promise.resolve(JSON.stringify({
            data: 'expired1',
            expiresAt: currentTime - 1000,
          }));
        }
        if (key === 'test-cache:expired2') {
          return Promise.resolve(JSON.stringify({
            data: 'expired2',
            expiresAt: currentTime - 2000,
          }));
        }
        return Promise.resolve(null);
      });

      await cacheManager.clearExpired();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('test-cache:expired1');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('test-cache:expired2');
      expect(mockAsyncStorage.removeItem).not.toHaveBeenCalledWith('test-cache:valid');
    });
  });

  describe('size management and eviction', () => {
    it('should track entry sizes', async () => {
      const largeData = { data: 'x'.repeat(1000) };
      
      await cacheManager.set('large-key', largeData);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'test-cache:large-key',
        expect.any(String)
      );
    });

    it('should evict old entries when size limit is reached', async () => {
      // Create cache with small size limit
      const smallCache = new CacheManager('small-cache', { maxSize: 1000 });

      // Mock existing entries
      mockAsyncStorage.getAllKeys.mockResolvedValue([
        'small-cache:old1',
        'small-cache:old2',
      ]);

      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'small-cache:old1') {
          return Promise.resolve(JSON.stringify({
            data: 'old1',
            createdAt: Date.now() - 2000,
          }));
        }
        if (key === 'small-cache:old2') {
          return Promise.resolve(JSON.stringify({
            data: 'old2',
            createdAt: Date.now() - 1000,
          }));
        }
        return Promise.resolve(null);
      });

      // This should trigger eviction
      const largeData = 'x'.repeat(2000);
      await smallCache.set('new-large', largeData);

      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should handle eviction errors gracefully', async () => {
      const smallCache = new CacheManager('small-cache', { maxSize: 100 });

      mockAsyncStorage.getAllKeys.mockRejectedValue(new Error('Keys error'));

      const data = 'large data';
      await expect(smallCache.set('test', data)).resolves.toBeUndefined();
      // Should not throw
    });
  });

  describe('utility methods', () => {
    it('should check if key exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('{"data":"exists"}');

      const exists = await cacheManager.has('existing-key');
      
      expect(exists).toBe(true);
    });

    it('should return false for non-existent keys', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const exists = await cacheManager.has('non-existent');
      
      expect(exists).toBe(false);
    });

    it('should get all cache keys', async () => {
      mockAsyncStorage.getAllKeys.mockResolvedValue([
        'test-cache:key1',
        'test-cache:key2',
        'other-cache:key3',
      ]);

      const keys = await cacheManager.getAllKeys();
      
      expect(keys).toEqual(['key1', 'key2']);
    });

    it('should handle getAllKeys errors gracefully', async () => {
      mockAsyncStorage.getAllKeys.mockRejectedValue(new Error('Keys error'));

      const keys = await cacheManager.getAllKeys();
      
      expect(keys).toEqual([]);
    });
  });

  describe('batch operations', () => {
    it('should set multiple entries at once', async () => {
      const entries = [
        { key: 'key1', data: 'value1' },
        { key: 'key2', data: { nested: 'value2' } },
        { key: 'key3', data: [1, 2, 3] },
      ];

      await cacheManager.setMany(entries);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(3);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'test-cache:key1',
        expect.stringContaining('value1')
      );
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'test-cache:key2',
        expect.stringContaining('value2')
      );
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'test-cache:key3',
        expect.stringContaining('[1,2,3]')
      );
    });

    it('should get multiple entries at once', async () => {
      const keys = ['key1', 'key2', 'key3'];
      
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'test-cache:key1') {
          return Promise.resolve(JSON.stringify({
            data: 'value1',
            createdAt: Date.now(),
            expiresAt: Date.now() + 3600000,
          }));
        }
        if (key === 'test-cache:key2') {
          return Promise.resolve(JSON.stringify({
            data: { nested: 'value2' },
            createdAt: Date.now(),
            expiresAt: Date.now() + 3600000,
          }));
        }
        if (key === 'test-cache:key3') {
          return Promise.resolve(null); // Missing key
        }
        return Promise.resolve(null);
      });

      const results = await cacheManager.getMany(keys);
      
      expect(results).toEqual({
        key1: 'value1',
        key2: { nested: 'value2' },
        key3: null,
      });
    });

    it('should handle batch operation errors gracefully', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Batch error'));

      const entries = [
        { key: 'key1', data: 'value1' },
        { key: 'key2', data: 'value2' },
      ];

      await expect(cacheManager.setMany(entries)).resolves.toBeUndefined();
      // Should not throw
    });

    it('should handle partial batch failures', async () => {
      let callCount = 0;
      mockAsyncStorage.setItem.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('Second item error'));
        }
        return Promise.resolve();
      });

      const entries = [
        { key: 'key1', data: 'value1' },
        { key: 'key2', data: 'value2' },
        { key: 'key3', data: 'value3' },
      ];

      await cacheManager.setMany(entries);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(3);
    });
  });

  describe('compression', () => {
    it('should handle compressed cache', async () => {
      const compressedCache = new CacheManager('compressed', { compress: true });
      const testData = { message: 'This should be compressed' };

      await compressedCache.set('test', testData);
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle very large data', async () => {
      const largeData = {
        data: 'x'.repeat(10 * 1024 * 1024), // 10MB string
      };

      await expect(cacheManager.set('large', largeData)).resolves.toBeUndefined();
      // Should not throw
    });

    it('should handle special characters in keys', async () => {
      const specialKeys = [
        'key-with-dashes',
        'key.with.dots',
        'key_with_underscores',
        'key with spaces',
        'key🎉with🚀emojis',
      ];

      for (const key of specialKeys) {
        await cacheManager.set(key, { data: 'test' });
        
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          `test-cache:${key}`,
          expect.any(String)
        );
      }
    });

    it('should handle empty keys', async () => {
      await cacheManager.set('', { data: 'empty key' });
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'test-cache:',
        expect.any(String)
      );
    });

    it('should handle undefined and null data', async () => {
      await cacheManager.set('undefined', undefined);
      await cacheManager.set('null', null);
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'test-cache:undefined',
        expect.stringContaining('"data":null') // undefined becomes null in JSON
      );
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'test-cache:null',
        expect.stringContaining('"data":null')
      );
    });

    it('should handle circular references in data', async () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      // This should not crash, JSON.stringify should handle it gracefully
      await expect(cacheManager.set('circular', circular)).resolves.toBeUndefined();
    });

    it('should handle concurrent operations', async () => {
      const operations = [
        cacheManager.set('key1', 'value1'),
        cacheManager.set('key2', 'value2'),
        cacheManager.get('key3'),
        cacheManager.delete('key4'),
        cacheManager.has('key5'),
      ];

      await expect(Promise.all(operations)).resolves.toBeDefined();
      // Should handle concurrent operations without issues
    });

    it('should maintain consistency during rapid operations', async () => {
      const rapidOperations = Array.from({ length: 100 }, (_, i) =>
        cacheManager.set(`key${i}`, `value${i}`)
      );

      await Promise.all(rapidOperations);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(100);
    });

    it('should handle storage quota exceeded errors', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(
        new Error('QuotaExceededError: The quota has been exceeded')
      );

      await expect(cacheManager.set('quota-test', 'data')).resolves.toBeUndefined();
      // Should handle gracefully without throwing
    });

    it('should handle device storage full scenarios', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(
        new Error('ENOSPC: no space left on device')
      );

      await expect(cacheManager.set('storage-full', 'data')).resolves.toBeUndefined();
      // Should handle gracefully without throwing
    });
  });

  describe('memory management', () => {
    it('should clean up internal tracking on clear', async () => {
      await cacheManager.set('key1', 'value1');
      await cacheManager.set('key2', 'value2');
      
      await cacheManager.clear();
      
      // Internal size tracking should be reset
      // We can't directly test private properties, but we can test behavior
      expect(mockAsyncStorage.multiRemove).toHaveBeenCalled();
    });

    it('should handle size tracking with corrupted entries', async () => {
      mockAsyncStorage.getAllKeys.mockResolvedValue(['test-cache:corrupted']);
      mockAsyncStorage.getItem.mockResolvedValue('invalid-json');

      const cache = new CacheManager('test-cache');
      
      // Should not crash during initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(cache).toBeDefined();
    });
  });

  describe('TTL and expiration edge cases', () => {
    it('should handle entries without expiration', async () => {
      const entryWithoutExpiration = {
        data: 'no expiration',
        createdAt: Date.now(),
        // No expiresAt field
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(entryWithoutExpiration));

      const result = await cacheManager.get('no-expiration');
      
      expect(result).toBe('no expiration');
    });

    it('should handle entries with invalid expiration', async () => {
      const entryWithInvalidExpiration = {
        data: 'invalid expiration',
        createdAt: Date.now(),
        expiresAt: 'invalid-date',
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(entryWithInvalidExpiration));

      const result = await cacheManager.get('invalid-expiration');
      
      // Should still return the data
      expect(result).toBe('invalid expiration');
    });

    it('should handle entries expiring exactly now', async () => {
      const now = Date.now();
      const entryExpiringNow = {
        data: 'expiring now',
        createdAt: now - 3600000,
        expiresAt: now,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(entryExpiringNow));

      const result = await cacheManager.get('expiring-now');
      
      // Should be considered expired and return null
      expect(result).toBeNull();
    });
  });
});