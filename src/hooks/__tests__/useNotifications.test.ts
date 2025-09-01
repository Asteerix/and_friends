import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/shared/lib/supabase/client';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getBadgeCountAsync: jest.fn(),
  setBadgeCountAsync: jest.fn()
}));

jest.mock('@/shared/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis()
    })),
    auth: {
      getUser: jest.fn()
    },
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn()
    }))
  }
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
}));

describe('useNotifications', () => {
  const mockNotifications = [
    {
      id: '1',
      title: 'New Event',
      body: 'You have been invited to an event',
      type: 'event_invitation',
      read: false,
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      title: 'Friend Request',
      body: 'John Doe sent you a friend request',
      type: 'friend_request',
      read: false,
      created_at: new Date().toISOString()
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should request notification permissions', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
      granted: true
    });

    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
      data: 'ExponentPushToken[xxxxx]'
    });

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      const token = await result.current.requestPermissions();
      expect(token).toBe('ExponentPushToken[xxxxx]');
    });

    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalled();
  });

  it('should handle permission denied', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
      granted: false
    });

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      const token = await result.current.requestPermissions();
      expect(token).toBeNull();
    });

    expect(result.current.permissionStatus).toBe('denied');
  });

  it('should fetch notifications successfully', async () => {
    const mockFrom = supabase.from as jest.Mock;
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: mockNotifications,
        error: null
      })
    });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.notifications).toEqual(mockNotifications);
    expect(result.current.unreadCount).toBe(2);
  });

  it('should mark notification as read', async () => {
    const mockFrom = supabase.from as jest.Mock;
    mockFrom.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: { ...mockNotifications[0], read: true },
        error: null
      })
    });

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.markAsRead('1');
    });

    expect(mockFrom).toHaveBeenCalledWith('notifications');
  });

  it('should mark all notifications as read', async () => {
    const mockFrom = supabase.from as jest.Mock;
    mockFrom.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: mockNotifications.map(n => ({ ...n, read: true })),
        error: null
      })
    });

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(result.current.unreadCount).toBe(0);
  });

  it('should schedule local notification', async () => {
    const notificationContent = {
      title: 'Reminder',
      body: 'Event starts in 1 hour',
      data: { eventId: '123' }
    };

    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('notification-id');

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      const id = await result.current.scheduleNotification(notificationContent, {
        seconds: 3600
      });
      expect(id).toBe('notification-id');
    });

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: notificationContent,
      trigger: { seconds: 3600 }
    });
  });

  it('should handle real-time notification updates', async () => {
    const newNotification = {
      id: '3',
      title: 'New Message',
      body: 'You have a new message',
      type: 'message',
      read: false,
      created_at: new Date().toISOString()
    };

    const mockChannel = {
      on: jest.fn((event, callback) => {
        if (event === 'INSERT') {
          setTimeout(() => callback({ new: newNotification }), 100);
        }
        return mockChannel;
      }),
      subscribe: jest.fn()
    };

    (supabase.channel as jest.Mock).mockReturnValue(mockChannel);

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.notifications).toContainEqual(newNotification);
    });
  });

  it('should update badge count', async () => {
    (Notifications.setBadgeCountAsync as jest.Mock).mockResolvedValue(true);

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.updateBadgeCount(5);
    });

    expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(5);
  });

  it('should clear all notifications', async () => {
    const mockFrom = supabase.from as jest.Mock;
    mockFrom.mockReturnValue({
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        error: null
      })
    });

    (Notifications.cancelAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue();
    (Notifications.setBadgeCountAsync as jest.Mock).mockResolvedValue(true);

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.clearAllNotifications();
    });

    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
    expect(result.current.notifications).toEqual([]);
  });

  it('should handle notification settings', async () => {
    const settings = {
      eventReminders: true,
      friendRequests: true,
      messages: false,
      soundEnabled: true,
      vibrationEnabled: true
    };

    (AsyncStorage.setItem as jest.Mock).mockResolvedValue();

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.updateSettings(settings);
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'notification_settings',
      JSON.stringify(settings)
    );
    expect(result.current.settings).toEqual(settings);
  });

  it('should handle push notification received', async () => {
    const mockListener = jest.fn();
    (Notifications.addNotificationReceivedListener as jest.Mock).mockImplementation(
      (callback) => {
        mockListener.mockImplementation(callback);
        return { remove: jest.fn() };
      }
    );

    const { result } = renderHook(() => useNotifications());

    const notification = {
      request: {
        content: {
          title: 'Test',
          body: 'Test notification',
          data: { type: 'test' }
        }
      }
    };

    act(() => {
      mockListener(notification);
    });

    expect(result.current.lastNotification).toEqual(notification);
  });
});