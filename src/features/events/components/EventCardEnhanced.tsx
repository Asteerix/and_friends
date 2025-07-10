import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

interface EventCardEnhancedProps {
  event: {
    id: string;
    title: string;
    subtitle?: string;
    description?: string;
    date: string;
    location?: string;
    cover_image?: string;
    cover_bg_color?: string;
    created_by?: string;
    participants_count?: number;
    is_private?: boolean;
    distance?: number;
    playlists?: Array<{ id: string; playlist_name?: string; spotify_link?: string; }>;
  };
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
  showDistance?: boolean;
}
export default function EventCardEnhanced({
  event,
  onPress,
  size = 'medium',
  showDistance = false,
}: EventCardEnhancedProps) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      void router.push(`/screens/event-details?id=${event.id}`);
    }
  };

  const sizes = {
    small: {
      width: screenWidth * 0.42,
      height: 200,
      titleSize: 16,
      subtitleSize: 12,
      padding: 12,
    },
    medium: {
      width: screenWidth - 32,
      height: 240,
      titleSize: 20,
      subtitleSize: 14,
      padding: 16,
    },
    large: {
      width: screenWidth - 32,
      height: 300,
      titleSize: 24,
      subtitleSize: 16,
      padding: 20,
    },
  };

  const currentSize = sizes[size];
  const eventDate = new Date(event.date);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.container,
          {
            width: currentSize.width,
            height: currentSize.height,
          },
        ]}
      >
        {/* Background Image or Gradient */}
        {event.cover_image ? (
          <Image
            source={{ uri: event.cover_image }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={event.cover_bg_color ? [event.cover_bg_color, '#000'] : ['#667eea', '#764ba2']}
            style={StyleSheet.absoluteFillObject}
          />
        )}

        {/* Dark overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Content */}
        <View style={[styles.content, { padding: currentSize.padding }]}>
          {/* Top badges */}
          <View style={styles.topRow}>
            {event.is_private && (
              <BlurView intensity={80} style={styles.badge}>
                <Ionicons name="lock-closed" size={12} color="#fff" />
                <Text style={styles.badgeText}>Privé</Text>
              </BlurView>
            )}

            {showDistance && event.distance && (
              <BlurView intensity={80} style={styles.badge}>
                <Ionicons name="location" size={12} color="#fff" />
                <Text style={styles.badgeText}>
                  {event.distance < 1
                    ? `${Math.round(event.distance * 1000)}m`
                    : `${event.distance.toFixed(1)}km`}
                </Text>
              </BlurView>
            )}

            {event.playlists && event.playlists.length > 0 && (
              <BlurView intensity={80} style={styles.badge}>
                <Ionicons name="musical-notes" size={12} color="#fff" />
                <Text style={styles.badgeText}>Playlist</Text>
              </BlurView>
            )}
          </View>

          {/* Bottom content */}
          <View style={styles.bottomContent}>
            {/* Date */}
            <View style={styles.dateContainer}>
              <Text style={styles.dateDay}>{format(eventDate, 'dd', { locale: fr })}</Text>
              <Text style={styles.dateMonth}>
                {format(eventDate, 'MMM', { locale: fr }).toUpperCase()}
              </Text>
            </View>

            <View style={styles.textContent}>
              <Text style={[styles.title, { fontSize: currentSize.titleSize }]} numberOfLines={2}>
                {event.title}
              </Text>

              {event.subtitle && (
                <Text
                  style={[styles.subtitle, { fontSize: currentSize.subtitleSize }]}
                  numberOfLines={1}
                >
                  {event.subtitle}
                </Text>
              )}

              <View style={styles.infoRow}>
                {event.location && (
                  <View style={styles.infoItem}>
                    <Ionicons name="location-outline" size={14} color="#fff" />
                    <Text style={styles.infoText} numberOfLines={1}>
                      {event.location}
                    </Text>
                  </View>
                )}

                {event.participants_count !== undefined && (
                  <View style={styles.infoItem}>
                    <Ionicons name="people-outline" size={14} color="#fff" />
                    <Text style={styles.infoText}>{event.participants_count}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#222',
    marginBottom: 16,
    // Shadow
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    overflow: 'hidden',
    gap: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  dateContainer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    minWidth: 56,
  },
  dateDay: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  dateMonth: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
  },
  textContent: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#fff',
    opacity: 0.8,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
  },
});
