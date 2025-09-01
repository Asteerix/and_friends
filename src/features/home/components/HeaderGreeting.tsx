import { useRouter } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import ChatButtonIcon from '@/assets/svg/chat-button.svg';
import NotificationButtonIcon from '@/assets/svg/notification-button.svg';
import NotificationBadge from '@/features/notifications/components/NotificationBadge';
import { useNotifications } from '@/shared/providers/NotificationProvider';
import { useProfile } from '@/hooks/useProfile';

export default function HeaderGreeting() {
  const router = useRouter();
  const { profile } = useProfile();
  const { unreadCount } = useNotifications();

  const handleNotificationsPress = () => {
    void router.push('/screens/notifications');
  };

  const handleChatPress = () => {
    void router.push('/screens/chat');
  };

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={styles.greeting}>Plans brewing,</Text>
        <Text style={styles.name}>
          {profile?.first_name || profile?.full_name?.split(' ')[0] || 'User'}?
        </Text>
      </View>
      <View style={styles.iconsRow}>
        <TouchableOpacity onPress={handleChatPress}>
          <ChatButtonIcon width={48} height={48} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleNotificationsPress} style={styles.notificationButton}>
          <NotificationButtonIcon width={48} height={48} />
          <NotificationBadge count={unreadCount} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
  },
  textContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 36,
    fontWeight: '300',
    color: '#FFFFFF',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    lineHeight: 42,
  },
  name: {
    fontSize: 36,
    fontWeight: '300',
    fontStyle: 'italic',
    color: '#FFFFFF',
    fontFamily: Platform.select({
      ios: 'Georgia-Italic',
      android: 'serif',
      default: 'serif',
    }),
    lineHeight: 42,
  },
  iconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    position: 'relative',
  },
});
