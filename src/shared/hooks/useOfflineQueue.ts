import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'offline-queue';

export interface QueuedAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'failed' | 'completed';
  error?: string;
}

export type ActionHandler = (action: QueuedAction) => Promise<void>;

class OfflineQueueManager {
  private handlers: Map<string, ActionHandler> = new Map();
  private isProcessing = false;
  private isOnline = true;

  constructor() {
    this.initNetworkListener();
  }

  private initNetworkListener() {
    NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected || false;
      
      // Process queue when coming back online
      if (wasOffline && this.isOnline) {
        this.processQueue();
      }
    });
  }

  registerHandler(type: string, handler: ActionHandler) {
    this.handlers.set(type, handler);
  }

  async enqueue(type: string, payload: any, maxRetries = 3): Promise<string> {
    const action: QueuedAction = {
      id: uuidv4(),
      type,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries,
      status: 'pending',
    };

    const queue = await this.getQueue();
    queue.push(action);
    await this.saveQueue(queue);

    // Try to process immediately if online
    if (this.isOnline) {
      this.processQueue();
    }

    return action.id;
  }

  private async getQueue(): Promise<QueuedAction[]> {
    try {
      const data = await AsyncStorage.getItem(`${STORAGE_KEY}:queue`);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading queue from AsyncStorage:', error);
      return [];
    }
  }

  private async saveQueue(queue: QueuedAction[]): Promise<void> {
    try {
      await AsyncStorage.setItem(`${STORAGE_KEY}:queue`, JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving queue to AsyncStorage:', error);
    }
  }

  async processQueue() {
    if (this.isProcessing || !this.isOnline) return;

    this.isProcessing = true;
    const queue = await this.getQueue();
    const pendingActions = queue.filter(a => a.status === 'pending');

    for (const action of pendingActions) {
      await this.processAction(action);
    }

    // Clean up completed actions older than 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const cleanedQueue = queue.filter(
      a => a.status !== 'completed' || a.timestamp > oneDayAgo
    );
    await this.saveQueue(cleanedQueue);

    this.isProcessing = false;
  }

  private async processAction(action: QueuedAction) {
    const handler = this.handlers.get(action.type);
    if (!handler) {
      console.error(`No handler registered for action type: ${action.type}`);
      return;
    }

    const queue = await this.getQueue();
    const actionIndex = queue.findIndex(a => a.id === action.id);
    if (actionIndex === -1) return;

    try {
      queue[actionIndex].status = 'processing';
      await this.saveQueue(queue);

      await handler(action);

      queue[actionIndex].status = 'completed';
      await this.saveQueue(queue);
    } catch (error: any) {
      queue[actionIndex].retryCount++;
      queue[actionIndex].error = error.message;

      if (queue[actionIndex].retryCount >= action.maxRetries) {
        queue[actionIndex].status = 'failed';
      } else {
        queue[actionIndex].status = 'pending';
      }

      await this.saveQueue(queue);
    }
  }

  async getQueuedActions(): Promise<QueuedAction[]> {
    return await this.getQueue();
  }

  async getActionStatus(actionId: string): Promise<QueuedAction | undefined> {
    const queue = await this.getQueue();
    return queue.find(a => a.id === actionId);
  }

  async removeAction(actionId: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter(a => a.id !== actionId);
    await this.saveQueue(filtered);
  }

  async clearQueue(): Promise<void> {
    await this.saveQueue([]);
  }

  async retryFailedActions(): Promise<void> {
    const queue = await this.getQueue();
    queue.forEach(action => {
      if (action.status === 'failed') {
        action.status = 'pending';
        action.retryCount = 0;
      }
    });
    await this.saveQueue(queue);
    this.processQueue();
  }
}

const queueManager = new OfflineQueueManager();

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const updateQueue = async () => {
      const actions = await queueManager.getQueuedActions();
      setQueue(actions);
    };

    updateQueue();
    const interval = setInterval(updateQueue, 1000);

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected || false);
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const enqueue = useCallback(
    async (type: string, payload: any, maxRetries?: number) => {
      const actionId = await queueManager.enqueue(type, payload, maxRetries);
      const actions = await queueManager.getQueuedActions();
      setQueue(actions);
      return actionId;
    },
    []
  );

  const registerHandler = useCallback(
    (type: string, handler: ActionHandler) => {
      queueManager.registerHandler(type, handler);
    },
    []
  );

  const getActionStatus = useCallback(async (actionId: string) => {
    return await queueManager.getActionStatus(actionId);
  }, []);

  const removeAction = useCallback(async (actionId: string) => {
    await queueManager.removeAction(actionId);
    const actions = await queueManager.getQueuedActions();
    setQueue(actions);
  }, []);

  const retryFailedActions = useCallback(async () => {
    await queueManager.retryFailedActions();
    const actions = await queueManager.getQueuedActions();
    setQueue(actions);
  }, []);

  const clearQueue = useCallback(async () => {
    await queueManager.clearQueue();
    setQueue([]);
  }, []);

  return {
    queue,
    isOnline,
    enqueue,
    registerHandler,
    getActionStatus,
    removeAction,
    retryFailedActions,
    clearQueue,
    pendingCount: queue.filter(a => a.status === 'pending').length,
    failedCount: queue.filter(a => a.status === 'failed').length,
  };
}