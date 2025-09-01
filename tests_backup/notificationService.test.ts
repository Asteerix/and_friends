import { NotificationService } from '@/features/notifications/services/notificationService';
import * as Notifications from 'expo-notifications';

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  dismissAllNotificationsAsync: jest.fn(),
  presentNotificationAsync: jest.fn(),
}));

// Mock supabase
const mockUser = { id: 'user-123' };
jest.mock('@/shared/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: mockUser }, error: null })),
    },
    from: jest.fn(() => ({
      upsert: jest.fn(() => Promise.resolve({ error: null })),
      insert: jest.fn(() => Promise.resolve({ error: null })),
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}));

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  describe('requestPermissions', () => {
    it('should return true when permissions are already granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const result = await NotificationService.requestPermissions();

      expect(result).toBe(true);
      expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('should request permissions when not granted and return true on success', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const result = await NotificationService.requestPermissions();

      expect(result).toBe(true);
      expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('should return false when permissions are denied', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await NotificationService.requestPermissions();

      expect(result).toBe(false);
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('Permission notifications refusée');
    });
  });

  describe('getExpoPushToken', () => {
    it('should return push token successfully', async () => {
      const mockToken = { data: 'ExponentPushToken[abc123]' };
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue(mockToken);

      const result = await NotificationService.getExpoPushToken();

      expect(result).toBe('ExponentPushToken[abc123]');
      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalled();
    });

    it('should return null when token retrieval fails', async () => {
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValue(
        new Error('Token error')
      );

      const result = await NotificationService.getExpoPushToken();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        "Erreur lors de l'obtention du token:",
        expect.any(Error)
      );
    });
  });

  describe('registerPushToken', () => {
    it('should register push token successfully', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
        data: 'ExponentPushToken[abc123]',
      });

      await NotificationService.registerPushToken('user-123');

      const mockSupabase = require('@/shared/lib/supabase/client');
      expect(mockSupabase.supabase.from).toHaveBeenCalledWith('push_tokens');
    });

    it('should not register token when permissions are denied', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      await NotificationService.registerPushToken('user-123');

      const mockSupabase = require('@/shared/lib/supabase/client');
      expect(mockSupabase.supabase.from).not.toHaveBeenCalled();
    });

    it('should not register token when token retrieval fails', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValue(
        new Error('Token error')
      );

      await NotificationService.registerPushToken('user-123');

      const mockSupabase = require('@/shared/lib/supabase/client');
      expect(mockSupabase.supabase.from).not.toHaveBeenCalled();
    });
  });

  describe('sendMessageNotification', () => {
    const mockChat = {
      id: 'chat-123',
      name: 'Test Chat',
      is_group: true,
    };

    const mockMessage = {
      id: 'message-123',
      text: 'Hello world',
      author_id: 'user-456',
      type: 'text' as const,
    };

    const mockSender = {
      id: 'user-456',
      full_name: 'John Doe',
      avatar_url: 'https://example.com/avatar.jpg',
    };

    it('should send message notification successfully', async () => {
      const mockSupabase = require('@/shared/lib/supabase/client');
      mockSupabase.supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() =>
            Promise.resolve({
              data: [{ user_id: 'user-789', push_token: 'ExponentPushToken[xyz789]' }],
              error: null,
            })
          ),
        })),
      });

      await NotificationService.sendMessageNotification(mockChat, mockMessage, mockSender);

      expect(mockSupabase.supabase.from).toHaveBeenCalledWith('chat_participants');
    });
  });

  describe('sendEventNotification', () => {
    const mockEvent = {
      id: 'event-123',
      title: 'Test Event',
      date: new Date().toISOString(),
      location: 'Test Location',
    };

    const mockRecipients = ['user-456', 'user-789'];

    it('should send event notification successfully', async () => {
      const mockSupabase = require('@/shared/lib/supabase/client');
      mockSupabase.supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          in: jest.fn(() =>
            Promise.resolve({
              data: [
                { id: 'user-456', push_token: 'ExponentPushToken[abc123]' },
                { id: 'user-789', push_token: 'ExponentPushToken[xyz789]' },
              ],
              error: null,
            })
          ),
        })),
      });

      await NotificationService.sendEventNotification(mockEvent, mockRecipients, 'new_event');

      expect(mockSupabase.supabase.from).toHaveBeenCalledWith('profiles');
    });
  });

  describe('scheduleLocalNotification', () => {
    it('should schedule local notification successfully', async () => {
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('notification-id');

      const result = await NotificationService.scheduleLocalNotification(
        'Test Title',
        'Test Body',
        new Date(Date.now() + 3600000) // 1 hour from now
      );

      expect(result).toBe('notification-id');
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Test Title',
          body: 'Test Body',
          sound: true,
        },
        trigger: {
          date: expect.any(Date),
        },
      });
    });

    it('should return null when scheduling fails', async () => {
      (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValue(
        new Error('Schedule error')
      );

      const result = await NotificationService.scheduleLocalNotification(
        'Test Title',
        'Test Body',
        new Date(Date.now() + 3600000)
      );

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Erreur lors de la planification:',
        expect.any(Error)
      );
    });
  });

  describe('cancelNotification', () => {
    it('should cancel notification successfully', async () => {
      (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockResolvedValue(undefined);

      await NotificationService.cancelNotification('notification-id');

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
        'notification-id'
      );
    });

    it('should handle cancellation errors gracefully', async () => {
      (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockRejectedValue(
        new Error('Cancel error')
      );

      await NotificationService.cancelNotification('notification-id');

      expect(console.error).toHaveBeenCalledWith("Erreur lors de l'annulation:", expect.any(Error));
    });
  });

  describe('clearAllNotifications', () => {
    it('should clear all notifications successfully', async () => {
      (Notifications.dismissAllNotificationsAsync as jest.Mock).mockResolvedValue(undefined);

      await NotificationService.clearAllNotifications();

      expect(Notifications.dismissAllNotificationsAsync).toHaveBeenCalled();
    });

    it('should handle clear errors gracefully', async () => {
      (Notifications.dismissAllNotificationsAsync as jest.Mock).mockRejectedValue(
        new Error('Clear error')
      );

      await NotificationService.clearAllNotifications();

      expect(console.error).toHaveBeenCalledWith(
        'Erreur lors de la suppression:',
        expect.any(Error)
      );
    });
  });
});
