/**
 * @file Notification Service Tests
 * 
 * Tests for the notification service functionality
 */

import { NotificationService } from '../notificationService';

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  getPresentedNotificationsAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  setNotificationCategoryAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  removeNotificationSubscription: jest.fn(),
}));

// Mock React Native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

// Mock Supabase
jest.mock('@/shared/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }),
    })),
  },
}));

import * as Notifications from 'expo-notifications';
import { supabase } from '@/shared/lib/supabase/client';

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Permission Management', () => {
    it('should request permissions successfully', async () => {
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

    it('should return true if permissions already granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const result = await NotificationService.requestPermissions();

      expect(result).toBe(true);
      expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('should return false if permissions denied', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await NotificationService.requestPermissions();

      expect(result).toBe(false);
    });
  });

  describe('Push Token Management', () => {
    it('should get Expo push token successfully', async () => {
      const mockToken = 'ExponentPushToken[test-token-123]';
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
        data: mockToken,
      });

      const token = await NotificationService.getExpoPushToken();

      expect(token).toBe(mockToken);
      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalled();
    });

    it('should handle token fetch error', async () => {
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValue(
        new Error('Token fetch failed')
      );

      const token = await NotificationService.getExpoPushToken();

      expect(token).toBeNull();
    });

    it('should register push token', async () => {
      const mockToken = 'ExponentPushToken[test-token-123]';
      
      // Mock permission request
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      
      // Mock token retrieval
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
        data: mockToken,
      });

      await NotificationService.registerPushToken('user123');

      expect(supabase.from).toHaveBeenCalledWith('profiles');
    });
  });

  describe('Local Notifications', () => {
    it('should send local notification', async () => {
      await NotificationService.sendLocalNotification(
        'Test Title',
        'Test Body',
        { extra: 'data' }
      );

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Test Title',
          body: 'Test Body',
          data: { extra: 'data' },
          sound: true,
          badge: 1,
        },
        trigger: null,
      });
    });

    it('should notify new message for direct chat', async () => {
      const mockMessage = {
        id: 'msg123',
        user_id: 'user456',
        content: 'Hello there!',
        type: 'text',
      };

      const mockChat = {
        id: 'chat123',
        is_group: false,
        name: null,
      };

      const mockSender = {
        id: 'user456',
        username: 'testuser',
        full_name: 'Test User',
      };

      // Mock app state check - return notifications to simulate app not active
      (Notifications.getPresentedNotificationsAsync as jest.Mock).mockResolvedValue([{ id: 'notification' }]);

      await NotificationService.notifyNewMessage(
        mockMessage as any,
        mockChat as any,
        mockSender as any,
        'user123'
      );

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: 'Test User',
            body: 'Hello there!',
            data: {
              chatId: 'chat123',
              messageId: 'msg123',
              type: 'new_message',
            },
          }),
        })
      );
    });

    it('should notify new message for group chat', async () => {
      const mockMessage = {
        id: 'msg123',
        user_id: 'user456',
        content: 'Hello group!',
        type: 'text',
      };

      const mockChat = {
        id: 'chat123',
        is_group: true,
        name: 'Test Group',
      };

      const mockSender = {
        id: 'user456',
        username: 'testuser',
        full_name: 'Test User',
      };

      // Mock app state check - return notifications to simulate app not active
      (Notifications.getPresentedNotificationsAsync as jest.Mock).mockResolvedValue([{ id: 'notification' }]);

      await NotificationService.notifyNewMessage(
        mockMessage as any,
        mockChat as any,
        mockSender as any,
        'user123'
      );

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: 'Test Group',
            body: 'Test User: Hello group!',
          }),
        })
      );
    });

    it('should not notify for own messages', async () => {
      const mockMessage = {
        id: 'msg123',
        user_id: 'user123', // Same as currentUserId
        content: 'My message',
        type: 'text',
      };

      await NotificationService.notifyNewMessage(
        mockMessage as any,
        {} as any,
        {} as any,
        'user123'
      );

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('should notify friend request', async () => {
      await NotificationService.notifyFriendRequest('John Doe', 'request123');

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: "Nouvelle demande d'ami",
          body: 'John Doe souhaite devenir votre ami',
          data: {
            type: 'friend_request',
            requestId: 'request123',
          },
          sound: true,
          badge: 1,
        },
        trigger: null,
      });
    });

    it('should notify event updates', async () => {
      await NotificationService.notifyEventUpdate(
        'Birthday Party',
        'cancelled',
        'event123'
      );

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Événement annulé',
          body: '"Birthday Party" a été annulé',
          data: {
            type: 'event_update',
            eventId: 'event123',
            updateType: 'cancelled',
          },
          sound: true,
          badge: 1,
        },
        trigger: null,
      });
    });
  });

  describe('Message Preview Formatting', () => {
    it('should format different message types correctly', () => {
      const formatMessagePreview = (NotificationService as any).formatMessagePreview;

      // Test different message types
      expect(formatMessagePreview({ type: 'image' })).toBe('📷 Photo');
      expect(formatMessagePreview({ type: 'video' })).toBe('🎥 Vidéo');
      expect(formatMessagePreview({ type: 'audio' })).toBe('🎵 Message vocal');
      expect(formatMessagePreview({ type: 'voice' })).toBe('🎵 Message vocal');
      expect(formatMessagePreview({ type: 'location' })).toBe('📍 Position');
      expect(formatMessagePreview({ type: 'poll' })).toBe('📊 Sondage');
      expect(formatMessagePreview({ type: 'event_share' })).toBe('🎉 Événement partagé');
      
      // Test file with metadata
      expect(formatMessagePreview({ 
        type: 'file', 
        metadata: { file_name: 'document.pdf' } 
      })).toBe('📎 document.pdf');
      
      // Test file without metadata
      expect(formatMessagePreview({ type: 'file' })).toBe('📎 Fichier');
      
      // Test text message
      expect(formatMessagePreview({ 
        type: 'text', 
        content: 'Hello world' 
      })).toBe('Hello world');
      
      // Test default case
      expect(formatMessagePreview({ content: 'Some content' })).toBe('Some content');
    });
  });

  describe('Badge Management', () => {
    it('should update badge count', async () => {
      await NotificationService.updateBadgeCount(5);

      expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(5);
    });

    it('should clear badge', async () => {
      await NotificationService.clearBadge();

      expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
    });
  });

  describe('Notification Categories Setup', () => {
    it('should setup notification categories on iOS', async () => {
      await NotificationService.setupNotificationCategories();

      expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalledWith(
        'message',
        expect.arrayContaining([
          expect.objectContaining({ identifier: 'reply' }),
          expect.objectContaining({ identifier: 'view' }),
        ])
      );
    });

    it('should not setup categories on Android', async () => {
      const { Platform } = require('react-native');
      Platform.OS = 'android';

      await NotificationService.setupNotificationCategories();

      expect(Notifications.setNotificationCategoryAsync).not.toHaveBeenCalled();
    });
  });

  describe('Notification Response Handling', () => {
    it('should handle new message notification response', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const mockResponse = {
        notification: {
          request: {
            content: {
              data: {
                type: 'new_message',
                chatId: 'chat123',
              },
            },
          },
        },
      };

      NotificationService.handleNotificationResponse(mockResponse as any);

      expect(consoleSpy).toHaveBeenCalledWith('Naviguer vers le chat:', 'chat123');
      consoleSpy.mockRestore();
    });

    it('should handle friend request notification response', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const mockResponse = {
        notification: {
          request: {
            content: {
              data: {
                type: 'friend_request',
                requestId: 'request123',
              },
            },
          },
        },
      };

      NotificationService.handleNotificationResponse(mockResponse as any);

      expect(consoleSpy).toHaveBeenCalledWith('Naviguer vers la demande:', 'request123');
      consoleSpy.mockRestore();
    });

    it('should handle event update notification response', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const mockResponse = {
        notification: {
          request: {
            content: {
              data: {
                type: 'event_update',
                eventId: 'event123',
              },
            },
          },
        },
      };

      NotificationService.handleNotificationResponse(mockResponse as any);

      expect(consoleSpy).toHaveBeenCalledWith("Naviguer vers l'événement:", 'event123');
      consoleSpy.mockRestore();
    });
  });

  describe('Notification Cleanup', () => {
    it('should cancel all notifications', async () => {
      await NotificationService.cancelAllNotifications();

      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    });
  });

  describe('Notification Listeners', () => {
    it('should setup notification listeners', () => {
      const mockNotificationListener = jest.fn();
      const mockResponseListener = jest.fn();

      (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue(
        mockNotificationListener
      );
      (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue(
        mockResponseListener
      );

      const cleanup = NotificationService.setupNotificationListeners();

      expect(Notifications.addNotificationReceivedListener).toHaveBeenCalled();
      expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalled();

      // Test cleanup function
      cleanup();

      expect(Notifications.removeNotificationSubscription).toHaveBeenCalledWith(
        mockNotificationListener
      );
      expect(Notifications.removeNotificationSubscription).toHaveBeenCalledWith(
        mockResponseListener
      );
    });
  });
});