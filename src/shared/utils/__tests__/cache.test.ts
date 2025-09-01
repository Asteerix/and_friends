import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CacheManager } from '../cache/cacheManager';
import { compressionUtils } from '../cache/compressionUtils';
import { cacheKeys } from '../cache/cacheKeys';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    getAllKeys: jest.fn(),
    multiGet: jest.fn(),
    multiRemove: jest.fn(),
  }
}));

describe('Cache System', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheManager = new CacheManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CacheManager', () => {
    it('should store and retrieve data', async () => {
      const testData = { id: 1, name: 'Test User' };
      const key = 'test_key';

      await cacheManager.set(key, testData);
      expect(AsyncStorage.setItem).toHaveBeenCalled();

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(testData));
      const retrieved = await cacheManager.get(key);
      expect(retrieved).toEqual(testData);
    });

    it('should handle cache expiration', async () => {
      const key = 'expired_key';
      const expiredData = {
        data: { test: 'data' },
        timestamp: Date.now() - 3600000, // 1 hour ago
        expiresAt: Date.now() - 1000 // Expired 1 second ago
      };

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(expiredData));
      const result = await cacheManager.get(key);
      expect(result).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(key);
    });

    it('should clear all cache', async () => {
      AsyncStorage.getAllKeys.mockResolvedValue(['cache_key1', 'cache_key2', 'other_key']);
      
      await cacheManager.clearAll();
      
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['cache_key1', 'cache_key2']);
    });

    it('should handle cache size limits', async () => {
      const largeData = new Array(1000).fill('x').join('');
      const key = 'large_data';

      await cacheManager.set(key, largeData, { maxSize: 100 });
      
      // Should not store data exceeding size limit
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Compression Utils', () => {
    it('should compress and decompress data', async () => {
      const originalData = { 
        users: Array(100).fill({ id: 1, name: 'User', email: 'test@example.com' })
      };

      const compressed = await compressionUtils.compress(originalData);
      expect(compressed).toBeDefined();
      expect(typeof compressed).toBe('string');
      expect(compressed.length).toBeLessThan(JSON.stringify(originalData).length);

      const decompressed = await compressionUtils.decompress(compressed);
      expect(decompressed).toEqual(originalData);
    });

    it('should handle compression errors gracefully', async () => {
      const invalidData = undefined;
      
      await expect(compressionUtils.compress(invalidData)).rejects.toThrow();
    });
  });

  describe('Cache Keys', () => {
    it('should generate consistent cache keys', () => {
      const userId = 'user123';
      const eventId = 'event456';

      const userKey = cacheKeys.user(userId);
      const eventKey = cacheKeys.event(eventId);

      expect(userKey).toBe(`user_${userId}`);
      expect(eventKey).toBe(`event_${eventId}`);
      expect(cacheKeys.user(userId)).toBe(userKey); // Consistency check
    });

    it('should handle special characters in keys', () => {
      const specialId = 'user@123#456';
      const sanitizedKey = cacheKeys.user(specialId);
      
      expect(sanitizedKey).not.toContain('@');
      expect(sanitizedKey).not.toContain('#');
    });
  });

  describe('Cache Performance', () => {
    it('should handle concurrent operations', async () => {
      const operations = Array(10).fill(null).map((_, i) => 
        cacheManager.set(`key_${i}`, { data: i })
      );

      await Promise.all(operations);
      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(10);
    });

    it('should batch operations efficiently', async () => {
      const items = Array(5).fill(null).map((_, i) => ({
        key: `batch_${i}`,
        value: { data: i }
      }));

      await cacheManager.setBatch(items);
      expect(AsyncStorage.multiSet).toHaveBeenCalled();
    });
  });
});