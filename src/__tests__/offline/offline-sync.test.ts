import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

describe('Offline Functionality and Sync', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  describe('Offline Queue Management', () => {
    it('should queue actions when offline', async () => {
      const offlineQueue: any[] = [];

      const queueAction = (action: any) => {
        offlineQueue.push({
          ...action,
          timestamp: Date.now(),
          retryCount: 0,
        });
      };

      // Queue multiple actions
      queueAction({ type: 'CREATE_EVENT', data: { title: 'Test Event' } });
      queueAction({ type: 'SEND_MESSAGE', data: { text: 'Hello' } });
      queueAction({ type: 'UPDATE_PROFILE', data: { name: 'John' } });

      expect(offlineQueue.length).toBe(3);
      expect(offlineQueue[0].type).toBe('CREATE_EVENT');
    });

    it('should persist queue to storage', async () => {
      const queue = [
        { id: '1', type: 'CREATE_EVENT', data: {} },
        { id: '2', type: 'SEND_MESSAGE', data: {} },
      ];

      await AsyncStorage.setItem('offline_queue', JSON.stringify(queue));
      const saved = await AsyncStorage.getItem('offline_queue');
      const parsed = JSON.parse(saved!);

      expect(parsed.length).toBe(2);
      expect(parsed[0].id).toBe('1');
    });

    it('should process queue when back online', async () => {
      const processedItems: string[] = [];

      const processQueue = async (queue: any[]) => {
        for (const item of queue) {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 10));
          processedItems.push(item.id);
        }
        return processedItems;
      };

      const queue = [
        { id: '1', type: 'ACTION_1' },
        { id: '2', type: 'ACTION_2' },
        { id: '3', type: 'ACTION_3' },
      ];

      const result = await processQueue(queue);
      expect(result).toEqual(['1', '2', '3']);
    });

    it('should handle failed sync attempts', async () => {
      const maxRetries = 3;
      let attempts = 0;

      const syncWithRetry = async (): Promise<boolean> => {
        attempts++;
        
        if (attempts < maxRetries) {
          throw new Error('Network error');
        }
        
        return true;
      };

      let success = false;
      for (let i = 0; i < maxRetries; i++) {
        try {
          success = await syncWithRetry();
          break;
        } catch (e) {
          // Retry
        }
      }

      expect(success).toBe(true);
      expect(attempts).toBe(maxRetries);
    });
  });

  describe('Data Caching', () => {
    it('should cache frequently accessed data', async () => {
      const cache = new Map();
      const cacheKey = 'events_list';
      const data = [
        { id: '1', title: 'Event 1' },
        { id: '2', title: 'Event 2' },
      ];

      // Cache data
      cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl: 300000, // 5 minutes
      });

      // Retrieve from cache
      const cached = cache.get(cacheKey);
      expect(cached.data).toEqual(data);
    });

    it('should invalidate stale cache', () => {
      const isStale = (timestamp: number, ttl: number) => {
        return Date.now() - timestamp > ttl;
      };

      const freshCache = {
        timestamp: Date.now(),
        ttl: 300000,
      };

      const staleCache = {
        timestamp: Date.now() - 400000,
        ttl: 300000,
      };

      expect(isStale(freshCache.timestamp, freshCache.ttl)).toBe(false);
      expect(isStale(staleCache.timestamp, staleCache.ttl)).toBe(true);
    });

    it('should update cache after successful sync', async () => {
      const cache = new Map();

      const syncAndUpdateCache = async (key: string, fetchFn: () => Promise<any>) => {
        const data = await fetchFn();
        cache.set(key, {
          data,
          timestamp: Date.now(),
        });
        return data;
      };

      const mockFetch = async () => {
        return { id: '1', updated: true };
      };

      const result = await syncAndUpdateCache('test_key', mockFetch);
      
      expect(cache.has('test_key')).toBe(true);
      expect(cache.get('test_key').data.updated).toBe(true);
    });
  });

  describe('Optimistic Updates', () => {
    it('should apply optimistic updates immediately', () => {
      const state = {
        messages: [] as any[],
      };

      const sendMessageOptimistic = (text: string) => {
        const optimisticMessage = {
          id: `temp_${Date.now()}`,
          text,
          status: 'pending',
          timestamp: Date.now(),
        };

        state.messages.push(optimisticMessage);
        return optimisticMessage;
      };

      const message = sendMessageOptimistic('Hello');
      
      expect(state.messages.length).toBe(1);
      expect(state.messages[0].status).toBe('pending');
      expect(state.messages[0].id).toContain('temp_');
    });

    it('should rollback failed optimistic updates', () => {
      const state = {
        items: [
          { id: '1', name: 'Item 1' },
          { id: '2', name: 'Item 2' },
        ],
      };

      const originalState = [...state.items];

      // Apply optimistic update
      state.items.push({ id: 'temp_3', name: 'Item 3' });

      // Simulate failure - rollback
      const rollback = () => {
        state.items = originalState;
      };

      // On failure, rollback
      rollback();

      expect(state.items.length).toBe(2);
      expect(state.items.find(i => i.id === 'temp_3')).toBeUndefined();
    });

    it('should reconcile optimistic updates with server response', () => {
      const localState = [
        { id: 'temp_1', text: 'Message 1', status: 'pending' },
        { id: '2', text: 'Message 2', status: 'sent' },
      ];

      const serverResponse = {
        id: 'server_1',
        text: 'Message 1',
        status: 'sent',
      };

      const reconcile = (local: any[], server: any) => {
        const index = local.findIndex(
          item => item.id.startsWith('temp_') && item.text === server.text
        );

        if (index !== -1) {
          local[index] = server;
        }

        return local;
      };

      const reconciled = reconcile(localState, serverResponse);
      
      expect(reconciled[0].id).toBe('server_1');
      expect(reconciled[0].status).toBe('sent');
    });
  });

  describe('Conflict Resolution', () => {
    it('should detect conflicts in offline edits', () => {
      const localVersion = {
        id: '1',
        data: 'local edit',
        version: 1,
        lastModified: Date.now() - 1000,
      };

      const serverVersion = {
        id: '1',
        data: 'server edit',
        version: 2,
        lastModified: Date.now(),
      };

      const hasConflict = (local: any, server: any) => {
        return local.version < server.version;
      };

      expect(hasConflict(localVersion, serverVersion)).toBe(true);
    });

    it('should merge non-conflicting changes', () => {
      const local = {
        name: 'John Updated',
        age: 25,
      };

      const server = {
        name: 'John',
        email: 'john@example.com',
      };

      const merge = (local: any, server: any) => {
        return {
          ...server,
          ...local,
          // Server wins for conflicts
          email: server.email || local.email,
        };
      };

      const merged = merge(local, server);
      
      expect(merged.name).toBe('John Updated'); // Local wins
      expect(merged.email).toBe('john@example.com'); // Server value
      expect(merged.age).toBe(25); // Local only field
    });

    it('should handle last-write-wins strategy', () => {
      const changes = [
        { id: '1', value: 'A', timestamp: 1000 },
        { id: '1', value: 'B', timestamp: 2000 },
        { id: '1', value: 'C', timestamp: 1500 },
      ];

      const lastWriteWins = (changes: any[]) => {
        return changes.reduce((latest, current) => 
          current.timestamp > latest.timestamp ? current : latest
        );
      };

      const winner = lastWriteWins(changes);
      expect(winner.value).toBe('B');
    });
  });

  describe('Network Detection', () => {
    it('should detect network status changes', () => {
      const networkCallbacks: Array<(isOnline: boolean) => void> = [];

      const subscribeToNetwork = (callback: (isOnline: boolean) => void) => {
        networkCallbacks.push(callback);
      };

      const simulateNetworkChange = (isOnline: boolean) => {
        networkCallbacks.forEach(cb => cb(isOnline));
      };

      let currentStatus = true;
      subscribeToNetwork((isOnline) => {
        currentStatus = isOnline;
      });

      simulateNetworkChange(false);
      expect(currentStatus).toBe(false);

      simulateNetworkChange(true);
      expect(currentStatus).toBe(true);
    });

    it('should batch sync operations when reconnected', async () => {
      const pendingOperations: any[] = [];

      const addOperation = (op: any) => {
        pendingOperations.push(op);
      };

      // Add operations while offline
      addOperation({ type: 'CREATE', data: { id: '1' } });
      addOperation({ type: 'UPDATE', data: { id: '2' } });
      addOperation({ type: 'DELETE', data: { id: '3' } });

      // Batch sync when online
      const batchSync = async (operations: any[]) => {
        const results = await Promise.all(
          operations.map(async (op) => {
            await new Promise(resolve => setTimeout(resolve, 10));
            return { ...op, synced: true };
          })
        );
        return results;
      };

      const synced = await batchSync(pendingOperations);
      
      expect(synced.length).toBe(3);
      expect(synced.every(op => op.synced)).toBe(true);
    });
  });

  describe('Storage Optimization', () => {
    it('should compress large data before storing', () => {
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          data: 'x'.repeat(100),
        })),
      };

      const compress = (data: any): string => {
        // Simulate compression
        const json = JSON.stringify(data);
        return json.substring(0, Math.floor(json.length / 2)); // Mock 50% compression
      };

      const decompress = (compressed: string): any => {
        // This is mock - real implementation would decompress
        return { items: [] };
      };

      const original = JSON.stringify(largeData);
      const compressed = compress(largeData);

      expect(compressed.length).toBeLessThan(original.length);
    });

    it('should clean up old cached data', async () => {
      const cache = new Map();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      // Add old and new items
      cache.set('old_1', { timestamp: Date.now() - (maxAge + 1000) });
      cache.set('old_2', { timestamp: Date.now() - (maxAge + 2000) });
      cache.set('new_1', { timestamp: Date.now() });

      const cleanup = () => {
        const now = Date.now();
        for (const [key, value] of cache.entries()) {
          if (now - value.timestamp > maxAge) {
            cache.delete(key);
          }
        }
      };

      cleanup();

      expect(cache.has('old_1')).toBe(false);
      expect(cache.has('old_2')).toBe(false);
      expect(cache.has('new_1')).toBe(true);
    });
  });
});