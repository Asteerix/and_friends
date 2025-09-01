import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../shared/lib/supabase/client';
import { useSession } from '../shared/providers/SessionContext';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  const { session } = useSession();
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!session?.user) return;

    void registerForPushNotificationsAsync().then((token) => {
      if (token) {
        setExpoPushToken(token);
        savePushToken(token);
      }
    });

    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener((notif) => {
      setNotification(notif);
    });

    // Listen for notification interactions
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response);
    });

    return () => {
      if (notificationListener.current) {
        void Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        void Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [session?.user]);

  const registerForPushNotificationsAsync = async () => {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }

      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
        })
      ).data;
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  };

  const savePushToken = async (token: string) => {
    if (!session?.user) return;

    try {
      // Check if token already exists
      const { data: existing } = await supabase
        .from('push_tokens')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('token', token)
        .single();

      if (existing) {
        // Update existing token
        await supabase
          .from('push_tokens')
          .update({
            updated_at: new Date().toISOString(),
            active: true,
          })
          .eq('id', existing.id);
      } else {
        // Insert new token
        await supabase.from('push_tokens').insert({
          user_id: session.user.id,
          token,
          platform: Platform.OS,
          device_info: {
            brand: Device.brand,
            model: Device.modelName,
            os: Device.osName,
            osVersion: Device.osVersion,
          },
        });
      }
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  };

  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;

    if (!data) return;

    // Navigate based on notification type
    switch (data.type) {
      case 'friend_request':
      case 'friend_accepted':
        void router.push('/screens/friends');
        break;
      case 'event_invite':
      case 'event_update':
      case 'event_reminder':
        if (data.event_id) {
          void router.push(`/screens/event-details?id=${data.event_id}`);
        }
        break;
      case 'new_message':
        if (data.chat_id) {
          void router.push(`/screens/conversation?id=${data.chat_id}`);
        }
        break;
      case 'new_story':
      case 'story_mention':
        if (data.story_id) {
          void router.push(`/screens/stories?id=${data.story_id}`);
        }
        break;
      case 'memory_like':
      case 'memory_comment':
        if (data.memory_id && data.event_id) {
          void router.push(`/screens/event-details?id=${data.event_id}&memory=${data.memory_id}`);
        }
        break;
      case 'event_comment':
      case 'event_like':
        if (data.event_id) {
          void router.push(`/screens/event-details?id=${data.event_id}&tab=comments`);
        }
        break;
      default:
        void router.push('/screens/notifications');
    }
  };

  const sendLocalNotification = async (
    title: string,
    body: string,
    data?: Record<string, unknown>
  ) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // Send immediately
    });
  };

  const setBadgeCount = async (count: number) => {
    if (Platform.OS === 'ios') {
      await Notifications.setBadgeCountAsync(count);
    }
  };

  const clearBadge = async () => {
    await setBadgeCount(0);
  };

  const requestPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  };

  const checkPermissions = async () => {
    const permissionResponse = await Notifications.getPermissionsAsync();
    const { status } = permissionResponse;
    return status === 'granted';
  };

  return {
    expoPushToken,
    notification,
    sendLocalNotification,
    setBadgeCount,
    clearBadge,
    requestPermissions,
    checkPermissions,
  };
}
