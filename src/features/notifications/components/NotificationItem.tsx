import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { Notification } from '@/shared/providers/NotificationProvider';

interface NotificationItemProps {
  notification: Notification;
  onPress: () => void;
};
export default function NotificationItem({ notification, onPress }: NotificationItemProps) {
  const getIcon = () => {
    switch (notification.type) {
    case 'event_invite':
      return 'calendar-outline';
    case 'new_message':
      return 'chatbubble-outline';
    case 'friend_request':
    case 'friend_accepted':
      return 'person-add-outline';
    case 'rsvp_update':
      return 'checkmark-circle-outline';
    default:
      return 'notifications-outline';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Ionicons name={getIcon()} size={24} color="#000" />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{notification.title}</Text>
        <Text style={styles.description}>{notification.body}</Text>
        <Text style={styles.time}>{formatTime(notification.created_at)}</Text>
      </View>
      {notification.user?.avatar_url && (
        <Image source={{ uri: notification.user.avatar_url }} style={styles.avatar} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 12,
  },
});