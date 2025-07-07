import type { PostgrestError } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { useRealtimeSubscription } from '@/shared/hooks/useRealtimeSubscription';
import { supabase } from '@/shared/lib/supabase/client';
import { useSession } from '@/shared/providers/SessionContext';

export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'event_invite'
  | 'event_update'
  | 'event_reminder'
  | 'event_cancelled'
  | 'new_message'
  | 'new_story'
  | 'story_mention'
  | 'memory_like'
  | 'memory_comment'
  | 'event_comment'
  | 'event_like'
  | 'rsvp_update';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message?: string;
  body?: string; // Alias for message for backward compatibility
  data?: Record<string, unknown>;
  sender_id?: string;
  related_id?: string;
  related_type?: string;
  action_url?: string;
  read: boolean;
  created_at: string;
  // Additional fields for UI
  sender?: {
    full_name: string;
    avatar_url: string;
  };
  user?: {
    full_name: string;
    avatar_url: string;
  };
  event?: {
    title: string;
    image_url: string;
  };
}
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<PostgrestError | null>(null);
  const { session } = useSession();

  async function fetchNotifications() {
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(
          `
          *,
          sender:related_user_id (
            full_name,
            avatar_url
          )
        `
        )
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        setError(error);
        console.error('Error fetching notifications:', error);
        return;
      }

      const formattedNotifications = (data || []).map((notif: any) => ({
        ...notif,
        body: notif.message || notif.body, // Add alias for backward compatibility
        sender_id: notif.related_id, // Map related_id to sender_id for backward compatibility
        user: notif.sender
          ? {
              full_name: notif.sender.full_name,
              avatar_url: notif.sender.avatar_url,
            }
          : undefined,
        sender: notif.sender, // Keep the sender object
      }));

      setNotifications(formattedNotifications);
      void setUnread(formattedNotifications.filter((n: Notification) => !n.read));
    } catch (err: unknown) {
      setError(err as PostgrestError);
      console.error('Unexpected error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }

  async function markRead(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', session?.user?.id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnread((prev) => prev.filter((n) => n.id !== notificationId));
    }
    return { error };
  }

  async function markAllRead() {
    if (!session?.user?.id) return { error: { message: 'Not authenticated' } };

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', session.user.id)
      .eq('read', false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread([]);
    }
    return { error };
  }

  async function createNotification(notification: {
    user_id: string;
    type: NotificationType;
    title: string;
    message?: string;
    data?: Record<string, unknown>;
    sender_id?: string;
    related_id?: string;
    related_type?: string;
    action_url?: string;
  }) {
    const { data, error } = await supabase
      .from('notifications')
      .insert([
        {
          ...notification,
          related_user_id: notification.sender_id,
          body: notification.message,
          read: false,
        },
      ])
      .select()
      .single();

    if (!error && data) {
      const newNotification = {
        ...data,
        body: data.message, // Add alias for backward compatibility
      } as Notification;
      setNotifications((prev) => [newNotification, ...prev]);
      if (!newNotification.read) {
        setUnread((prev) => [newNotification, ...prev]);
      }
    }
    return { data, error };
  }

  // Set up real-time subscription using the custom hook
  useRealtimeSubscription<Notification>({
    table: 'notifications',
    filter: session?.user?.id ? `user_id=eq.${session.user.id}` : undefined,
    onInsert: async (payload) => {
      // Fetch the complete notification with user info
      const { data } = await supabase
        .from('notifications')
        .select(
          `
          *,
          sender:profiles!notifications_related_user_id_fkey (
            full_name,
            avatar_url
          )
        `
        )
        .eq('id', (payload.new as Notification).id)
        .single();

      if (data) {
        const formattedNotification = {
          ...data,
          body: data.message || data.body,
          sender_id: data.related_user_id,
          user: data.sender
            ? {
                full_name: data.sender.full_name,
                avatar_url: data.sender.avatar_url,
              }
            : undefined,
          sender: data.sender,
        };

        setNotifications((prev) => [formattedNotification, ...prev]);
        if (!formattedNotification.read) {
          setUnread((prev) => [formattedNotification, ...prev]);
        }
      }
    },
    onUpdate: (payload) => {
      const updated = payload.new as Notification;
      setNotifications((prev) => prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n)));

      // Update unread if read status changed
      const wasUnread = unread.some((n) => n.id === updated.id);
      if (wasUnread && updated.read) {
        setUnread((prev) => prev.filter((n) => n.id !== updated.id));
      }
    },
    onDelete: (payload) => {
      const deletedId = (payload.old as Partial<Notification>).id;
      if (!deletedId) return;
      setNotifications((prev) => prev.filter((n) => n.id !== deletedId));
      setUnread((prev) => prev.filter((n) => n.id !== deletedId));
    },
  });

  // Initial fetch
  useEffect(() => {
    if (!session?.user?.id) return;
    void fetchNotifications();
  }, [session?.user?.id]);

  return {
    notifications,
    unread,
    loading,
    error,
    fetchNotifications,
    markRead,
    markAllRead,
    createNotification,
  };
}
