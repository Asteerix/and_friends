import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';
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

interface NotificationContextType {
  notifications: Notification[];
  loading: boolean;
  error: PostgrestError | null;
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<{ error: any }>;
  markAllAsRead: () => Promise<{ error: any }>;
  deleteNotification: (notificationId: string) => Promise<{ error: any }>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<PostgrestError | null>(null);

  const fetchNotifications = useCallback(async () => {
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
  }, [session?.user?.id]);

  const markAsRead = useCallback(async (notificationId: string) => {
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
  }, [session?.user?.id]);

  const markAllAsRead = useCallback(async () => {
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
  }, [session?.user?.id]);

  const deleteNotification = useCallback(async (notificationId: string) => {
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
  }, [session?.user?.id]);

  const unreadCount = notifications.filter((n) => !n.read).length;

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
          console.log('🔔 [NotificationProvider] Realtime update received:', payload.eventType);
          
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
  }, [session?.user?.id, fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        loading,
        error,
        unreadCount,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}