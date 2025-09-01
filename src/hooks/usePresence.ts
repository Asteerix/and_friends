import { useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '@/shared/lib/supabase/client';
import { useSession } from '@/shared/providers/SessionContext';

export function usePresence() {
  const { session } = useSession();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<any>(null);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    if (!session?.user?.id) return;

    const setupPresence = async () => {
      // Create a unique channel for the app
      const channel = supabase.channel('online-users', {
        config: {
          presence: {
            key: session.user.id,
          },
        },
      });

      channelRef.current = channel;

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const userIds = new Set<string>();

          Object.keys(state).forEach((key) => {
            userIds.add(key);
          });

          setOnlineUsers(userIds);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          setOnlineUsers((prev) => new Set([...prev, key]));
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          setOnlineUsers((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Track this user's presence
            await channel.track({
              user_id: session.user.id,
              online_at: new Date().toISOString(),
            });
          }
        });
    };

    setupPresence();

    // Handle app state changes
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to foreground - track presence again
        if (channelRef.current) {
          await channelRef.current.track({
            user_id: session.user.id,
            online_at: new Date().toISOString(),
          });
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App going to background - untrack presence
        if (channelRef.current) {
          await channelRef.current.untrack();
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [session?.user?.id]);

  const isUserOnline = (userId: string): boolean => {
    return onlineUsers.has(userId);
  };

  const getOnlineCount = (): number => {
    return onlineUsers.size;
  };

  return {
    onlineUsers: Array.from(onlineUsers),
    isUserOnline,
    getOnlineCount,
  };
}
