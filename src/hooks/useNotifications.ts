import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { PostgrestError } from "@supabase/supabase-js";
import { useSession } from "@/lib/SessionContext";

export type NotificationType = "invite" | "follow" | "rsvp" | "message";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_id?: string;
  related_type?: string;
  read: boolean;
  created_at: string;
  // Additional fields for UI
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
        .from("notifications")
        .select(`
          *,
          profiles!notifications_sender_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        setError(error);
        console.error("Error fetching notifications:", error);
        return;
      }

      const formattedNotifications = (data || []).map((notif: any) => ({
        ...notif,
        user: notif.profiles ? {
          full_name: notif.profiles.full_name,
          avatar_url: notif.profiles.avatar_url
        } : undefined
      }));

      setNotifications(formattedNotifications);
      setUnread(formattedNotifications.filter((n: Notification) => !n.read));
    } catch (err: any) {
      setError(err);
      console.error("Unexpected error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }

  async function markRead(notificationId: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId)
      .eq("user_id", session?.user?.id);

    if (!error) {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnread(prev => prev.filter(n => n.id !== notificationId));
    }
    return { error };
  }

  async function markAllRead() {
    if (!session?.user?.id) return { error: { message: "Not authenticated" } };

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", session.user.id)
      .eq("read", false);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnread([]);
    }
    return { error };
  }

  async function createNotification(notification: Omit<Notification, "id" | "created_at" | "read">) {
    const { data, error } = await supabase
      .from("notifications")
      .insert([{ ...notification, read: false }])
      .select()
      .single();

    if (!error && data) {
      const newNotification = { ...data } as Notification;
      setNotifications(prev => [newNotification, ...prev]);
      if (!newNotification.read) {
        setUnread(prev => [newNotification, ...prev]);
      }
    }
    return { data, error };
  }

  // Set up real-time subscription
  useEffect(() => {
    if (!session?.user?.id) return;

    fetchNotifications();

    // Subscribe to new notifications for the current user
    const subscription = supabase
      .channel(`notifications:${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${session.user.id}`,
        },
        async (payload) => {
          // Fetch the complete notification with user info
          const { data } = await supabase
            .from("notifications")
            .select(`
              *,
              profiles!notifications_sender_id_fkey (
                full_name,
                avatar_url
              )
            `)
            .eq("id", payload.new.id)
            .single();

          if (data) {
            const formattedNotification = {
              ...data,
              user: data.profiles ? {
                full_name: data.profiles.full_name,
                avatar_url: data.profiles.avatar_url
              } : undefined
            };
            
            setNotifications(prev => [formattedNotification, ...prev]);
            if (!formattedNotification.read) {
              setUnread(prev => [formattedNotification, ...prev]);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          // Update notification read status
          setNotifications(prev =>
            prev.map(n => n.id === payload.new.id ? { ...n, ...payload.new } : n)
          );
          
          if (payload.new.read) {
            setUnread(prev => prev.filter(n => n.id !== payload.new.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [session?.user?.id]);

  return {
    notifications,
    unread,
    loading,
    error,
    fetchNotifications,
    markRead,
    markAllRead,
    createNotification
  };
}