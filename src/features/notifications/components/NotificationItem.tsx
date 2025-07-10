import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Notification } from '@/shared/providers/NotificationProvider';

interface NotificationItemProps {
  notification: Notification;
  onPress: () => void;
}

const DEFAULT_AVATAR = require('../../../assets/default_avatar.png');

export default function NotificationItem({ notification, onPress }: NotificationItemProps) {
  const getIcon = () => {
    switch (notification.type) {
      case 'event_invite':
      case 'event_join':
      case 'event_accepted':
      case 'event_removed':
        return 'calendar-outline';
      case 'new_message':
        return 'chatbubble-outline';
      case 'friend_request':
      case 'friend_accepted':
        return 'person-add-outline';
      case 'rsvp_update':
        return 'checkmark-circle-outline';
      case 'new_rating':
        return 'star';
      case 'story_like':
        return 'heart';
      case 'story_comment':
        return 'chatbubble';
      default:
        return 'notifications-outline';
    }
  };

  const getIconColor = () => {
    switch (notification.type) {
      case 'new_rating':
        return '#FFD700';
      case 'story_like':
        return '#FF1744';
      case 'story_comment':
        return '#007AFF';
      case 'friend_request':
      case 'friend_accepted':
        return '#4CAF50';
      case 'event_removed':
        return '#FF5252';
      default:
        return '#000';
    }
  };

  const getIconBgColor = () => {
    switch (notification.type) {
      case 'new_rating':
        return '#FFF8DC';
      case 'story_like':
        return '#FFE4E8';
      case 'story_comment':
        return '#E3F2FD';
      case 'friend_request':
      case 'friend_accepted':
        return '#E8F5E9';
      case 'event_removed':
        return '#FFEBEE';
      default:
        return '#F5F5F5';
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

  // Get avatar URL based on notification type
  const getAvatarUrl = () => {
    if (notification.data) {
      const data = notification.data as any;
      // For notifications with user avatars in data
      if (data.sender_avatar_url) return data.sender_avatar_url;
      if (data.accepter_avatar_url) return data.accepter_avatar_url;
      if (data.rater_avatar_url) return data.rater_avatar_url;
      if (data.liker_avatar_url) return data.liker_avatar_url;
      if (data.commenter_avatar_url) return data.commenter_avatar_url;
      if (data.participant_avatar_url) return data.participant_avatar_url;
    }
    
    // Fallback to user avatar from joined data
    if (notification.user?.avatar_url) return notification.user.avatar_url;
    
    return null;
  };

  const avatarUrl = getAvatarUrl();

  return (
    <TouchableOpacity 
      style={[
        styles.container,
        !notification.read && styles.unreadContainer
      ]} 
      onPress={onPress}
    >
      <View style={[
        styles.iconContainer,
        { backgroundColor: getIconBgColor() }
      ]}>
        <Ionicons 
          name={getIcon() as any} 
          size={24} 
          color={getIconColor()} 
        />
      </View>
      
      <View style={styles.content}>
        <Text style={[
          styles.title,
          !notification.read && styles.unreadText
        ]}>
          {notification.title}
        </Text>
        <Text style={[
          styles.description,
          !notification.read && styles.unreadDescription
        ]}>
          {notification.body}
        </Text>
        <Text style={styles.time}>{formatTime(notification.created_at)}</Text>
      </View>

      {avatarUrl ? (
        <Image 
          source={{ uri: avatarUrl }} 
          style={styles.avatar} 
          defaultSource={DEFAULT_AVATAR}
        />
      ) : notification.type.includes('event') ? (
        <View style={[styles.avatar, styles.eventImagePlaceholder]}>
          <Ionicons name="calendar" size={20} color="#999" />
        </View>
      ) : null}

      {!notification.read && (
        <View style={styles.unreadDot} />
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
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  unreadContainer: {
    backgroundColor: '#F8F9FA',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  unreadText: {
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18,
  },
  unreadDescription: {
    color: '#333',
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
    backgroundColor: '#F5F5F5',
  },
  eventImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
});