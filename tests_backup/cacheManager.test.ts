import { CacheManager } from '../cacheManager';

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    cacheManager = new CacheManager('test', 1000); // 1 second default TTL
    cacheManager.clear();
  });

  afterEach(() => {
    cacheManager.clear();
  });

  describe('Basic Operations', () => {
    test('should set and get values', async () => {
      await cacheManager.set('key1', 'value1');
      const result = await cacheManager.get('key1');
      expect(result).toBe('value1');
    });

    test('should return null for non-existent keys', async () => {
      const result = await cacheManager.get('nonexistent');
      expect(result).toBeNull();
    });

    test('should handle complex objects', async () => {
      const complexObject = {
        id: 1,
        name: 'Test User',
        metadata: {
          created: new Date().toISOString(),
          tags: ['test', 'user']
        }
      };
      
      await cacheManager.set('user1', complexObject);
      const result = await cacheManager.get('user1');
      expect(result).toEqual(complexObject);
    });
  });

  describe('TTL (Time to Live)', () => {
    test('should expire items after TTL', async () => {
      await cacheManager.set('expireKey', 'expireValue', { ttl: 50 }); // 50ms
      
      // Should exist immediately
      let result = await cacheManager.get('expireKey');
      expect(result).toBe('expireValue');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should be expired
      result = await cacheManager.get('expireKey');
      expect(result).toBeNull();
    });

    test('should use default TTL when not specified', async () => {
      await cacheManager.set('defaultTTLKey', 'defaultValue');
      const result = await cacheManager.get('defaultTTLKey');
      expect(result).toBe('defaultValue');
    });
  });

  describe('Cache Management', () => {
    test('should delete specific keys', async () => {
      await cacheManager.set('key1', 'value1');
      await cacheManager.set('key2', 'value2');
      
      await cacheManager.delete('key1');
      
      expect(await cacheManager.get('key1')).toBeNull();
      expect(await cacheManager.get('key2')).toBe('value2');
    });

    test('should clear all cache', async () => {
      await cacheManager.set('key1', 'value1');
      await cacheManager.set('key2', 'value2');
      
      await cacheManager.clear();
      
      expect(await cacheManager.get('key1')).toBeNull();
      expect(await cacheManager.get('key2')).toBeNull();
    });

    test('should check if key exists', async () => {
      await cacheManager.set('existsKey', 'value');
      
      expect(await cacheManager.exists('existsKey')).toBe(true);
      expect(await cacheManager.exists('nonExistentKey')).toBe(false);
    });
  });

  describe('Advanced Operations', () => {
    test('should get all keys', async () => {
      await cacheManager.set('key1', 'value1');
      await cacheManager.set('key2', 'value2');
      
      const keys = await cacheManager.getAllKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys.length).toBeGreaterThanOrEqual(2);
    });

    test('should handle batch operations', async () => {
      // Set items individually first to test getMany
      await cacheManager.set('batch1', 'value1');
      await cacheManager.set('batch2', 'value2');
      
      const results = await cacheManager.getMany(['batch1', 'batch2', 'nonexistent']);
      expect(results.get('batch1')).toBe('value1');
      expect(results.get('batch2')).toBe('value2');
      expect(results.get('nonexistent')).toBeNull();
    });

    test('should clear expired entries', async () => {
      await cacheManager.set('expiring', 'value', { ttl: 50 });
      await cacheManager.set('permanent', 'value');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await cacheManager.clearExpired();
      
      expect(await cacheManager.get('expiring')).toBeNull();
      expect(await cacheManager.get('permanent')).toBe('value');
    });
  });
});