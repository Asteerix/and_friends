import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface FriendCardProps {
  friend: {
    id: string;
    full_name: string;
    username: string;
    avatar_url?: string;
    bio?: string;
    last_seen?: string;
    friendship_date?: string;
    mutual_friends_count?: number;
  };
  onPress?: () => void;
  showActions?: boolean;
  onMessage?: () => void;
  onRemove?: () => void;
}
export default function FriendCard({
  friend,
  onPress,
  showActions = false,
  onMessage,
  onRemove,
}: FriendCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [imageError, setImageError] = useState(false);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (onPress) {
      onPress();
    } else {
      void router.push(`/screens/person-card?id=${friend.id}`);
    }
  };

  const isOnline =
    friend.last_seen && new Date(friend.last_seen) > new Date(Date.now() - 5 * 60 * 1000);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity onPress={handlePress} style={styles.container} activeOpacity={0.7}>
        <View style={styles.content}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {friend.avatar_url && !imageError ? (
              <Image
                source={{ uri: friend.avatar_url }}
                style={styles.avatar}
                onError={() => setImageError(true)}
              />
            ) : (
              <LinearGradient colors={['#667eea', '#764ba2']} style={styles.avatar}>
                <Text style={styles.avatarText}>{friend.full_name.charAt(0).toUpperCase()}</Text>
              </LinearGradient>
            )}

            {isOnline && <View style={styles.onlineIndicator} />}
          </View>

          {/* Info */}
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {friend.full_name}
              </Text>
              {friend.username && (
                <Text style={styles.username} numberOfLines={1}>
                  @{friend.username}
                </Text>
              )}
            </View>

            {friend.bio && (
              <Text style={styles.bio} numberOfLines={2}>
                {friend.bio}
              </Text>
            )}

            <View style={styles.metaRow}>
              {friend.mutual_friends_count && friend.mutual_friends_count > 0 && (
                <View style={styles.metaItem}>
                  <Ionicons name="people-outline" size={12} color="#666" />
                  <Text style={styles.metaText}>
                    {friend.mutual_friends_count} ami{friend.mutual_friends_count > 1 ? 's' : ''} en
                    commun
                  </Text>
                </View>
              )}

              {friend.last_seen && !isOnline && (
                <Text style={styles.lastSeen}>
                  Vu{' '}
                  {formatDistanceToNow(new Date(friend.last_seen), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </Text>
              )}
            </View>
          </View>

          {/* Actions */}
          {showActions && (
            <View style={styles.actions}>
              {onMessage && (
                <TouchableOpacity onPress={onMessage} style={styles.actionButton}>
                  <BlurView intensity={80} style={styles.actionButtonContent}>
                    <Ionicons name="chatbubble-outline" size={18} color="#fff" />
                  </BlurView>
                </TouchableOpacity>
              )}

              {onRemove && (
                <TouchableOpacity onPress={onRemove} style={styles.actionButton}>
                  <BlurView intensity={80} style={styles.actionButtonContent}>
                    <Ionicons name="person-remove-outline" size={18} color="#ff4444" />
                  </BlurView>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  content: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CD964',
    borderWidth: 2,
    borderColor: '#000',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  name: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  username: {
    color: '#666',
    fontSize: 14,
  },
  bio: {
    color: '#999',
    fontSize: 14,
    marginTop: 4,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: '#666',
    fontSize: 12,
  },
  lastSeen: {
    color: '#666',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  actionButtonContent: {
    padding: 10,
  },
});
