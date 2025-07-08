import { useEffect, useRef, useCallback, useState } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { supabase } from '@/shared/lib/supabase/client';
import NetInfo from '@react-native-community/netinfo';

interface SubscriptionOptions {
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  schema?: string;
  table: string;
  filter?: string;
  onInsert?: (payload: RealtimePostgresChangesPayload<any>) => void;
  onUpdate?: (payload: RealtimePostgresChangesPayload<any>) => void;
  onDelete?: (payload: RealtimePostgresChangesPayload<any>) => void;
  onChange?: (payload: RealtimePostgresChangesPayload<any>) => void;
}

interface RealtimeManagerOptions {
  autoReconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  onConnectionChange?: (isConnected: boolean) => void;
}

export function useRealtimeManager(options: RealtimeManagerOptions = {}) {
  const {
    autoReconnect = true,
    reconnectDelay = 5000,
    maxReconnectAttempts = 10,
    onConnectionChange,
  } = options;

  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map());
  const reconnectAttemptsRef = useRef<Map<string, number>>(new Map());
  const reconnectTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const isConnectedRef = useRef(true);
  const [isConnected, setIsConnected] = useState(true);
  const subscriptionsRef = useRef<Map<string, SubscriptionOptions>>(new Map());

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected ?? false;
      isConnectedRef.current = connected;
      setIsConnected(connected);
      onConnectionChange?.(connected);

      if (connected && autoReconnect) {
        // Network is back, reconnect all channels
        reconnectAllChannels();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [autoReconnect, onConnectionChange]);

  const reconnectAllChannels = useCallback(() => {
    channelsRef.current.forEach((channel, channelId) => {
      if (channel.state !== REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
        reconnectChannel(channelId);
      }
    });
  }, []);

  const reconnectChannel = useCallback((channelId: string) => {
    if (!autoReconnect || !subscriptionsRef.current.has(channelId)) return;

    const attempts = reconnectAttemptsRef.current.get(channelId) || 0;
    if (attempts >= maxReconnectAttempts) {
      console.error(`[RealtimeManager] Max reconnection attempts reached for channel ${channelId}`);
      return;
    }

    // Clear any existing timeout
    const existingTimeout = reconnectTimeoutsRef.current.get(channelId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(() => {
      if (!isConnectedRef.current) {
        // Still no network, try again later
        reconnectChannel(channelId);
        return;
      }

      console.log(`[RealtimeManager] Attempting to reconnect channel ${channelId} (attempt ${attempts + 1})`);
      
      // Remove old channel
      const oldChannel = channelsRef.current.get(channelId);
      if (oldChannel) {
        supabase.removeChannel(oldChannel);
        channelsRef.current.delete(channelId);
      }

      // Recreate subscription
      const options = subscriptionsRef.current.get(channelId);
      if (options) {
        const newChannel = createChannel(channelId, options);
        channelsRef.current.set(channelId, newChannel);
        reconnectAttemptsRef.current.set(channelId, attempts + 1);
      }
    }, reconnectDelay * Math.pow(2, Math.min(attempts, 3))); // Exponential backoff with max delay

    reconnectTimeoutsRef.current.set(channelId, timeout);
  }, [autoReconnect, maxReconnectAttempts, reconnectDelay]);

  const createChannel = useCallback((channelId: string, options: SubscriptionOptions): RealtimeChannel => {
    const { event = '*', schema = 'public', table, filter, onInsert, onUpdate, onDelete, onChange } = options;

    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes' as any,
        {
          event,
          schema,
          table,
          ...(filter ? { filter } : {}),
        },
        (payload: any) => {
          // Reset reconnection attempts on successful message
          reconnectAttemptsRef.current.set(channelId, 0);

          // Call appropriate handler
          switch (payload.eventType) {
            case 'INSERT':
              onInsert?.(payload);
              break;
            case 'UPDATE':
              onUpdate?.(payload);
              break;
            case 'DELETE':
              onDelete?.(payload);
              break;
          }
          onChange?.(payload);
        }
      )
      .subscribe((status) => {
        console.log(`[RealtimeManager] Channel ${channelId} status:`, status);
        
        if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
          console.log(`[RealtimeManager] Channel ${channelId} subscribed successfully`);
          reconnectAttemptsRef.current.set(channelId, 0);
        } else if (status === REALTIME_SUBSCRIBE_STATES.CLOSED) {
          console.log(`[RealtimeManager] Channel ${channelId} closed`);
          if (autoReconnect && isConnectedRef.current) {
            reconnectChannel(channelId);
          }
        } else if (status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR) {
          console.error(`[RealtimeManager] Channel ${channelId} error`);
          if (autoReconnect) {
            reconnectChannel(channelId);
          }
        }
      });

    return channel;
  }, [autoReconnect, reconnectChannel]);

  const subscribe = useCallback((channelId: string, options: SubscriptionOptions): (() => void) => {
    // Store subscription options for reconnection
    subscriptionsRef.current.set(channelId, options);

    // Create and store channel
    const channel = createChannel(channelId, options);
    channelsRef.current.set(channelId, channel);

    // Return cleanup function
    return () => {
      unsubscribe(channelId);
    };
  }, [createChannel]);

  const unsubscribe = useCallback((channelId: string) => {
    // Clear any reconnection timeout
    const timeout = reconnectTimeoutsRef.current.get(channelId);
    if (timeout) {
      clearTimeout(timeout);
      reconnectTimeoutsRef.current.delete(channelId);
    }

    // Remove channel
    const channel = channelsRef.current.get(channelId);
    if (channel) {
      supabase.removeChannel(channel);
      channelsRef.current.delete(channelId);
    }

    // Clean up references
    subscriptionsRef.current.delete(channelId);
    reconnectAttemptsRef.current.delete(channelId);
  }, []);

  const unsubscribeAll = useCallback(() => {
    // Clear all timeouts
    reconnectTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    reconnectTimeoutsRef.current.clear();

    // Remove all channels
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current.clear();

    // Clear all references
    subscriptionsRef.current.clear();
    reconnectAttemptsRef.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribeAll();
    };
  }, [unsubscribeAll]);

  return {
    subscribe,
    unsubscribe,
    unsubscribeAll,
    isConnected,
    reconnectChannel,
    reconnectAllChannels,
  };
}

// Convenience hook for single subscription
export function useRealtimeSubscription(
  channelId: string,
  options: SubscriptionOptions,
  deps: React.DependencyList = []
) {
  const manager = useRealtimeManager();

  useEffect(() => {
    const cleanup = manager.subscribe(channelId, options);
    return cleanup;
  }, deps);

  return manager;
}