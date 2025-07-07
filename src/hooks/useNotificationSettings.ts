import { supabase } from '@/shared/lib/supabase/client';
import { useProfile } from './useProfile';
import type { NotificationType } from './useNotifications';

export function useNotificationSettings() {
  const { profile } = useProfile();

  /**
   * Create a notification with settings check
   * This uses the Supabase function that checks user preferences before creating the notification
   */
  const createNotificationWithSettings = async (notification: {
    user_id: string;
    type: NotificationType;
    title: string;
    message?: string;
    data?: Record<string, unknown>;
    sender_id?: string;
    related_id?: string;
    related_type?: string;
    action_url?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .rpc('create_notification_with_settings_check', {
          p_user_id: notification.user_id,
          p_type: notification.type,
          p_title: notification.title,
          p_message: notification.message || null,
          p_data: notification.data || null,
          p_related_user_id: notification.sender_id || null,
          p_related_id: notification.related_id || null,
          p_related_type: notification.related_type || null,
          p_action_url: notification.action_url || null,
        });

      if (error) {
        console.error('Error creating notification:', error);
        return { error, data: null };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error creating notification:', error);
      return { error, data: null };
    }
  };

  /**
   * Check if a user can be invited to an event based on their privacy settings
   */
  const canInviteToEvent = async (inviterId: string, inviteeId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('can_invite_to_event', {
          p_inviter_id: inviterId,
          p_invitee_id: inviteeId,
        });

      if (error) {
        console.error('Error checking invite permission:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Unexpected error checking invite permission:', error);
      return false;
    }
  };

  /**
   * Check if a notification should be sent based on user settings
   */
  const shouldSendNotification = async (userId: string, notificationType: string) => {
    try {
      const { data, error } = await supabase
        .rpc('should_send_notification', {
          p_user_id: userId,
          p_notification_type: notificationType,
        });

      if (error) {
        console.error('Error checking notification settings:', error);
        return true; // Default to sending if error
      }

      return data === true;
    } catch (error) {
      console.error('Unexpected error checking notification settings:', error);
      return true; // Default to sending if error
    }
  };

  /**
   * Get notification settings from local profile state
   */
  const getNotificationSettings = () => {
    return profile?.settings?.notifications || {
      event_invites: true,
      friend_requests: true,
      event_reminders: true,
    };
  };

  /**
   * Get privacy settings from local profile state
   */
  const getPrivacySettings = () => {
    return profile?.settings?.privacy || {
      who_can_invite: 'Public',
      hide_from_search: false,
    };
  };

  return {
    createNotificationWithSettings,
    canInviteToEvent,
    shouldSendNotification,
    getNotificationSettings,
    getPrivacySettings,
  };
}