import { useEffect, useState, useCallback } from 'react';
import { MMKV } from 'react-native-mmkv';
import NetInfo from '@react-native-community/netinfo';
import { v4 as uuidv4 } from 'uuid';

const storage = new MMKV({ id: 'offline-queue' });

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

    const queue = this.getQueue();
    queue.push(action);
    this.saveQueue(queue);

    // Try to process immediately if online
    if (this.isOnline) {
      this.processQueue();
    }

    return action.id;
  }

  private getQueue(): QueuedAction[] {
    const data = storage.getString('queue');
    return data ? JSON.parse(data) : [];
  }

  private saveQueue(queue: QueuedAction[]) {
    storage.set('queue', JSON.stringify(queue));
  }

  async processQueue() {
    if (this.isProcessing || !this.isOnline) return;

    this.isProcessing = true;
    const queue = this.getQueue();
    const pendingActions = queue.filter(a => a.status === 'pending');

    for (const action of pendingActions) {
      await this.processAction(action);
    }

    // Clean up completed actions older than 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const cleanedQueue = queue.filter(
      a => a.status !== 'completed' || a.timestamp > oneDayAgo
    );
    this.saveQueue(cleanedQueue);

    this.isProcessing = false;
  }

  private async processAction(action: QueuedAction) {
    const handler = this.handlers.get(action.type);
    if (!handler) {
      console.error(`No handler registered for action type: ${action.type}`);
      return;
    }

    const queue = this.getQueue();
    const actionIndex = queue.findIndex(a => a.id === action.id);
    if (actionIndex === -1) return;

    try {
      queue[actionIndex].status = 'processing';
      this.saveQueue(queue);

      await handler(action);

      queue[actionIndex].status = 'completed';
      this.saveQueue(queue);
    } catch (error: any) {
      queue[actionIndex].retryCount++;
      queue[actionIndex].error = error.message;

      if (queue[actionIndex].retryCount >= action.maxRetries) {
        queue[actionIndex].status = 'failed';
      } else {
        queue[actionIndex].status = 'pending';
      }

      this.saveQueue(queue);
    }
  }

  getQueuedActions(): QueuedAction[] {
    return this.getQueue();
  }

  getActionStatus(actionId: string): QueuedAction | undefined {
    const queue = this.getQueue();
    return queue.find(a => a.id === actionId);
  }

  removeAction(actionId: string) {
    const queue = this.getQueue();
    const filtered = queue.filter(a => a.id !== actionId);
    this.saveQueue(filtered);
  }

  clearQueue() {
    this.saveQueue([]);
  }

  retryFailedActions() {
    const queue = this.getQueue();
    queue.forEach(action => {
      if (action.status === 'failed') {
        action.status = 'pending';
        action.retryCount = 0;
      }
    });
    this.saveQueue(queue);
    this.processQueue();
  }
}

const queueManager = new OfflineQueueManager();

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const updateQueue = () => {
      setQueue(queueManager.getQueuedActions());
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
      setQueue(queueManager.getQueuedActions());
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

  const getActionStatus = useCallback((actionId: string) => {
    return queueManager.getActionStatus(actionId);
  }, []);

  const removeAction = useCallback((actionId: string) => {
    queueManager.removeAction(actionId);
    setQueue(queueManager.getQueuedActions());
  }, []);

  const retryFailedActions = useCallback(() => {
    queueManager.retryFailedActions();
    setQueue(queueManager.getQueuedActions());
  }, []);

  const clearQueue = useCallback(() => {
    queueManager.clearQueue();
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