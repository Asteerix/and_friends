import type { PostgrestError } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { supabase } from '@/shared/lib/supabase/client';
import { useSession } from '@/shared/providers/SessionContext';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  related_user_id?: string;
  related_event_id?: string;
  related_chat_id?: string;
  read: boolean;
  read_at?: string;
  action_url?: string;
  action_type?: string;
  created_at: string;
  updated_at?: string;
  // Joined data
  user?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

export function useNotifications() {
  const { session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<PostgrestError | null>(null);

  async function fetchNotifications() {
    if (!session?.user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        setError(error);
        return;
      }

      setNotifications(data || []);
    } catch (err: unknown) {
      console.error('Unexpected error:', err);
      setError(err as PostgrestError);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(notificationId: string) {
    if (!session?.user?.id) return { error: { message: 'Not authenticated' } };

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Error marking notification as read:', error);
        return { error };
      }

      setNotifications((prev) =>
        prev.map((notif) => (notif.id === notificationId ? { ...notif, read: true } : notif))
      );

      return { error: null };
    } catch (err: unknown) {
      console.error('Unexpected error:', err);
      return { error: err };
    }
  }

  async function markAllAsRead() {
    if (!session?.user?.id) return { error: { message: 'Not authenticated' } };

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', session.user.id)
        .eq('read', false);

      if (error) {
        console.error('Error marking all as read:', error);
        return { error };
      }

      setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
      return { error: null };
    } catch (err: unknown) {
      console.error('Unexpected error:', err);
      return { error: err };
    }
  }

  async function deleteNotification(notificationId: string) {
    if (!session?.user?.id) return { error: { message: 'Not authenticated' } };

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Error deleting notification:', error);
        return { error };
      }

      setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
      return { error: null };
    } catch (err: unknown) {
      console.error('Unexpected error:', err);
      return { error: err };
    }
  }

  const getUnreadCount = () => {
    return notifications.filter((n) => !n.read).length;
  };

  useEffect(() => {
    if (!session?.user?.id) return;

    fetchNotifications();

    // Set up real-time subscription for notifications
    const notificationsChannel = supabase
      .channel(`notifications:${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          console.log('🔔 [useNotifications] Realtime update received:', payload.eventType);
          
          if (payload.eventType === 'INSERT' && payload.new) {
            // Add new notification at the beginning
            setNotifications((prev) => [payload.new as Notification, ...prev]);
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setNotifications((prev) => 
              prev.map((notif) => 
                notif.id === payload.new.id ? payload.new as Notification : notif
              )
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setNotifications((prev) => 
              prev.filter((notif) => notif.id !== (payload.old as any).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(notificationsChannel);
    };
  }, [session?.user?.id]);

  return {
    notifications,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount,
  };
}