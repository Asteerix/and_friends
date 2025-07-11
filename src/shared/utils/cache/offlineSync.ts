import NetInfo from '@react-native-community/netinfo';
import { supabase } from '@/shared/lib/supabase/client';
import { generalCache, userCache, eventCache } from './cacheManager';
import { CacheKeys } from './cacheKeys';

interface SyncOperation {
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  id?: string;
  timestamp: number;
}

class OfflineSyncManager {
  private syncQueue: SyncOperation[] = [];
  private isSyncing = false;
  private isOnline = true;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.initializeNetworkListener();
    this.loadQueueFromStorage();
  }

  private initializeNetworkListener() {
    NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected || false;

      if (wasOffline && this.isOnline) {
        this.syncWithServer();
      }
    });
  }

  private async loadQueueFromStorage() {
    const queue = generalCache.get<SyncOperation[]>('offline-sync-queue');
    if (queue) {
      this.syncQueue = queue;
    }
  }

  private async saveQueueToStorage() {
    await generalCache.set('offline-sync-queue', this.syncQueue, {
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  async addToQueue(operation: Omit<SyncOperation, 'timestamp'>) {
    const syncOp: SyncOperation = {
      ...operation,
      timestamp: Date.now(),
    };

    this.syncQueue.push(syncOp);
    await this.saveQueueToStorage();

    if (this.isOnline) {
      this.syncWithServer();
    }
  }

  async syncWithServer() {
    if (this.isSyncing || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    this.isSyncing = true;

    try {
      const operations = [...this.syncQueue];
      const successfulOps: number[] = [];

      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        try {
          await this.executeSyncOperation(op);
          successfulOps.push(i);
        } catch (error) {
          console.error(`Failed to sync operation:`, error);
          // Continue with next operation
        }
      }

      // Remove successful operations from queue
      this.syncQueue = this.syncQueue.filter(
        (_, index) => !successfulOps.includes(index)
      );
      await this.saveQueueToStorage();

      // Notify listeners
      this.notifyListeners();

      // Refresh caches after sync
      await this.refreshCaches();
    } finally {
      this.isSyncing = false;
    }
  }

  private async executeSyncOperation(operation: SyncOperation) {
    switch (operation.type) {
      case 'create':
        await supabase.from(operation.table).insert(operation.data);
        break;
      
      case 'update':
        if (!operation.id) throw new Error('Update operation requires an ID');
        await supabase
          .from(operation.table)
          .update(operation.data)
          .eq('id', operation.id);
        break;
      
      case 'delete':
        if (!operation.id) throw new Error('Delete operation requires an ID');
        await supabase
          .from(operation.table)
          .delete()
          .eq('id', operation.id);
        break;
    }
  }

  private async refreshCaches() {
    // Clear potentially stale data
    const tables = new Set(this.syncQueue.map(op => op.table));
    
    if (tables.has('profiles')) {
      userCache.clear();
    }
    
    if (tables.has('events') || tables.has('event_participants')) {
      eventCache.clear();
    }
  }

  onSyncComplete(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  getQueueStatus() {
    return {
      pendingOperations: this.syncQueue.length,
      isSyncing: this.isSyncing,
      isOnline: this.isOnline,
    };
  }

  clearQueue() {
    this.syncQueue = [];
    this.saveQueueToStorage();
  }
}

export const offlineSyncManager = new OfflineSyncManager();

// Helper functions for common operations
export const offlineOperations = {
  updateProfile: async (userId: string, updates: any) => {
    // Update cache immediately
    const cached = userCache.get(CacheKeys.USER_PROFILE(userId));
    if (cached) {
      await userCache.set(
        CacheKeys.USER_PROFILE(userId),
        { ...cached, ...updates },
        { ttl: 24 * 60 * 60 * 1000 }
      );
    }

    // Queue for sync
    await offlineSyncManager.addToQueue({
      type: 'update',
      table: 'profiles',
      id: userId,
      data: updates,
    });
  },

  createEvent: async (eventData: any) => {
    // Generate temporary ID
    const tempId = `temp-${Date.now()}`;
    const event = { ...eventData, id: tempId };

    // Add to cache
    await eventCache.set(
      CacheKeys.EVENT_DETAILS(tempId),
      event,
      { ttl: 30 * 60 * 1000 }
    );

    // Queue for sync
    await offlineSyncManager.addToQueue({
      type: 'create',
      table: 'events',
      data: eventData,
    });

    return tempId;
  },

  rsvpEvent: async (eventId: string, userId: string, status: string) => {
    // Update cache
    const eventKey = CacheKeys.EVENT_PARTICIPANTS(eventId);
    const participants = eventCache.get<any[]>(eventKey) || [];
    
    const existingIndex = participants.findIndex(p => p.user_id === userId);
    if (existingIndex >= 0) {
      participants[existingIndex].status = status;
    } else {
      participants.push({ user_id: userId, event_id: eventId, status });
    }
    
    await eventCache.set(eventKey, participants, { ttl: 10 * 60 * 1000 });

    // Queue for sync
    await offlineSyncManager.addToQueue({
      type: 'create',
      table: 'event_participants',
      data: {
        event_id: eventId,
        user_id: userId,
        status,
      },
    });
  },
};