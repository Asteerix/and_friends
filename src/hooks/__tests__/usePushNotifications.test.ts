import { renderHook, act } from '@testing-library/react-hooks';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { usePushNotifications } from '../usePushNotifications';
import { supabase } from '@/shared/lib/supabase/client';

// Mock external dependencies
jest.mock('expo-notifications');
jest.mock('expo-device');
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));
jest.mock('@/shared/lib/supabase/client');
jest.mock('@/shared/providers/SessionContext', () => ({
  useSession: () => ({
    session: {
      user: { id: 'test-user-id' },
    },
  }),
}));

const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;
const mockDevice = Device as jest.Mocked<typeof Device>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('usePushNotifications', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock default implementations
    mockNotifications.setNotificationHandler.mockImplementation(() => {});
    mockNotifications.addNotificationReceivedListener.mockReturnValue({
      remove: jest.fn(),
    } as any);
    mockNotifications.addNotificationResponseReceivedListener.mockReturnValue({
      remove: jest.fn(),
    } as any);
    mockNotifications.removeNotificationSubscription.mockImplementation(() => {});
    
    mockDevice.isDevice = true;
    
    // Mock Supabase client
    (mockSupabase.from as jest.Mock) = jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
      update: jest.fn().mockReturnThis(),
    }));
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: originalPlatform,
      writable: true,
    });
  });

  it('should initialize notification handler', () => {
    renderHook(() => usePushNotifications());
    
    expect(mockNotifications.setNotificationHandler).toHaveBeenCalledWith({
      handleNotification: expect.any(Function),
    });
  });

  it('should request push notification permissions on iOS', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
    
    mockNotifications.getPermissionsAsync.mockResolvedValue({
      status: 'undetermined',
    } as any);
    
    mockNotifications.requestPermissionsAsync.mockResolvedValue({
      status: 'granted',
    } as any);
    
    mockNotifications.getExpoPushTokenAsync.mockResolvedValue({
      data: 'test-push-token',
    } as any);

    const { result } = renderHook(() => usePushNotifications());
    
    // Wait for async operations
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(mockNotifications.getPermissionsAsync).toHaveBeenCalled();
    expect(mockNotifications.requestPermissionsAsync).toHaveBeenCalled();
  });

  it('should configure Android notification channel', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
    
    mockNotifications.getPermissionsAsync.mockResolvedValue({
      status: 'granted',
    } as any);
    
    mockNotifications.getExpoPushTokenAsync.mockResolvedValue({
      data: 'test-push-token',
    } as any);
    
    mockNotifications.setNotificationChannelAsync.mockResolvedValue();

    renderHook(() => usePushNotifications());
    
    // Wait for async operations
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(mockNotifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({
        name: 'default',
        importance: expect.any(Number),
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      })
    );
  });

  it('should save push token to database', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValue({
      status: 'granted',
    } as any);
    
    mockNotifications.getExpoPushTokenAsync.mockResolvedValue({
      data: 'test-push-token',
    } as any);

    // Mock device info
    mockDevice.brand = 'Apple';
    mockDevice.modelName = 'iPhone 13';
    mockDevice.osName = 'iOS';
    mockDevice.osVersion = '15.0';

    renderHook(() => usePushNotifications());
    
    // Wait for async operations
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('push_tokens');
  });

  it('should handle notification permission denied', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    
    mockNotifications.getPermissionsAsync.mockResolvedValue({
      status: 'denied',
    } as any);
    
    mockNotifications.requestPermissionsAsync.mockResolvedValue({
      status: 'denied',
    } as any);

    renderHook(() => usePushNotifications());
    
    // Wait for async operations
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(consoleLogSpy).toHaveBeenCalledWith('Failed to get push token for push notification!');
    
    consoleLogSpy.mockRestore();
  });

  it('should handle simulator environment', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    mockDevice.isDevice = false;

    renderHook(() => usePushNotifications());
    
    // Wait for async operations
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(consoleLogSpy).toHaveBeenCalledWith('Must use physical device for Push Notifications');
    
    consoleLogSpy.mockRestore();
  });

  it('should send local notification', async () => {
    mockNotifications.scheduleNotificationAsync.mockResolvedValue('notification-id');

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.sendLocalNotification(
        'Test Title',
        'Test Body',
        { test: 'data' }
      );
    });

    expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        title: 'Test Title',
        body: 'Test Body',
        data: { test: 'data' },
        sound: true,
      },
      trigger: null,
    });
  });

  it('should set badge count on iOS', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
    mockNotifications.setBadgeCountAsync.mockResolvedValue();

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.setBadgeCount(5);
    });

    expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(5);
  });

  it('should not set badge count on Android', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.setBadgeCount(5);
    });

    expect(mockNotifications.setBadgeCountAsync).not.toHaveBeenCalled();
  });

  it('should clear badge', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
    mockNotifications.setBadgeCountAsync.mockResolvedValue();

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.clearBadge();
    });

    expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
  });

  it('should check permissions', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValue({
      status: 'granted',
    } as any);

    const { result } = renderHook(() => usePushNotifications());

    let permissionsGranted: boolean;
    await act(async () => {
      permissionsGranted = await result.current.checkPermissions();
    });

    expect(permissionsGranted!).toBe(true);
    expect(mockNotifications.getPermissionsAsync).toHaveBeenCalled();
  });

  it('should request permissions', async () => {
    mockNotifications.requestPermissionsAsync.mockResolvedValue({
      status: 'granted',
    } as any);

    const { result } = renderHook(() => usePushNotifications());

    let permissionsGranted: boolean;
    await act(async () => {
      permissionsGranted = await result.current.requestPermissions();
    });

    expect(permissionsGranted!).toBe(true);
    expect(mockNotifications.requestPermissionsAsync).toHaveBeenCalled();
  });

  it('should clean up listeners on unmount', () => {
    const mockSubscription = {
      remove: jest.fn(),
    };
    
    mockNotifications.addNotificationReceivedListener.mockReturnValue(mockSubscription as any);
    mockNotifications.addNotificationResponseReceivedListener.mockReturnValue(mockSubscription as any);

    const { unmount } = renderHook(() => usePushNotifications());

    unmount();

    expect(mockNotifications.removeNotificationSubscription).toHaveBeenCalledTimes(2);
  });
});