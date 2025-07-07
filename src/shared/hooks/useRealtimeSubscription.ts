import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { REALTIME_LISTEN_TYPES } from '@supabase/realtime-js';
import { useEffect, useRef } from 'react';

import { supabase } from '../lib/supabase/client';

interface UseRealtimeSubscriptionOptions<T extends Record<string, any>> {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  onInsert?: (payload: RealtimePostgresChangesPayload<T>) => void;
  onUpdate?: (payload: RealtimePostgresChangesPayload<T>) => void;
  onDelete?: (payload: RealtimePostgresChangesPayload<T>) => void;
  onChange?: (payload: RealtimePostgresChangesPayload<T>) => void;
}
export function useRealtimeSubscription<T extends Record<string, any>>({
  table,
  event = '*',
  filter,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
}: UseRealtimeSubscriptionOptions<T>) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`${table}_changes`)
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES as any,
        Object.assign(
          {
            event,
            schema: 'public',
            table,
          },
          filter ? { filter } : {}
        ),
        (payload: RealtimePostgresChangesPayload<T>) => {
          if (onChange) {
            onChange(payload);
          }

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
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
      }
    };
  }, [table, event, filter, onInsert, onUpdate, onDelete, onChange]);

  return channelRef.current;
}
