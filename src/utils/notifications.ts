import { supabase } from '@/shared/lib/supabase/client';

export type NotificationType = 
  | 'friend_request'
  | 'friend_accepted'
  | 'new_rating'
  | 'story_like'
  | 'story_comment'
  | 'event_invite'
  | 'event_join'
  | 'event_accepted'
  | 'event_removed'
  | 'new_message'
  | 'rsvp_update';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedUserId?: string;
  relatedEventId?: string;
  relatedChatId?: string;
  data?: Record<string, any>;
}

/**
 * Create a notification manually (useful for testing or custom notifications)
 * Note: Most notifications are created automatically via database triggers
 */
export async function createNotification({
  userId,
  type,
  title,
  body,
  relatedUserId,
  relatedEventId,
  relatedChatId,
  data,
}: CreateNotificationParams) {
  try {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        body,
        related_user_id: relatedUserId,
        related_event_id: relatedEventId,
        related_chat_id: relatedChatId,
        data,
        read: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return { error };
    }

    return { data: notification, error: null };
  } catch (err) {
    console.error('Unexpected error creating notification:', err);
    return { error: err };
  }
}

/**
 * Mark all notifications as read for the current user
 */
export async function markAllNotificationsAsRead(userId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return { error };
    }

    return { error: null };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { error: err };
  }
}

/**
 * Delete old notifications (older than 30 days)
 */
export async function cleanupOldNotifications(userId: string) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .lt('created_at', thirtyDaysAgo.toISOString());

    if (error) {
      console.error('Error cleaning up old notifications:', error);
      return { error };
    }

    return { error: null };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { error: err };
  }
}