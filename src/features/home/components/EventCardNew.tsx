import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';


import type { EventAdvanced } from '@/hooks/useEventsAdvanced';

type Props = {
  event: EventAdvanced | any;
  style?: ViewStyle;
  onPress?: () => void;
};

export default function EventCardNew({ event, style, onPress }: Props) {
  const eventDate = event.startTime || event.start_time || event.date;
  const formattedDate = eventDate ? format(new Date(eventDate), 'MMM d') : '';
  const formattedTime = eventDate ? format(new Date(eventDate), 'h:mm a') : '';

  return (
    <TouchableOpacity 
      style={[styles.container, style]} 
      onPress={onPress}
      activeOpacity={0.9}
    >
      {event.coverData?.media?.url || event.cover_image || event.image_url ? (
        <Image 
          source={{ uri: event.coverData?.media?.url || event.cover_image || event.image_url }} 
          style={styles.image}
        />
      ) : (
        <LinearGradient
          colors={['#FF6B6B', '#FF8787']}
          style={styles.imagePlaceholder}
        >
          <Ionicons name="calendar" size={40} color="white" />
        </LinearGradient>
      )}

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            {event.title}
          </Text>
          {event.category && (
            <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(event.category) }]}>
              <Text style={styles.categoryText}>{event.category}</Text>
            </View>
          )}
        </View>

        {event.subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {event.subtitle}
          </Text>
        )}

        <View style={styles.info}>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              {formattedDate} • {formattedTime}
            </Text>
          </View>

          {(event.address || event.location) && (
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={styles.infoText} numberOfLines={1}>
                {event.address || event.location}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            {(event.currentAttendees !== undefined || event.participants_count !== undefined) && (
              <View style={styles.participantsInfo}>
                <Ionicons name="people-outline" size={18} color="#666" />
                <Text style={styles.participantsText}>
                  {event.currentAttendees || event.participants_count || 0} going
                </Text>
              </View>
            )}
          </View>

          <View style={styles.footerRight}>
            {event.playlists && event.playlists.length > 0 && (
              <View style={styles.playlistIndicator}>
                <Ionicons name="musical-notes" size={16} color="#FF6B6B" />
                <Text style={styles.playlistText}>Playlist</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function getCategoryColor(category: string): string {
  const colors: { [key: string]: string } = {
    sports: '#4CAF50',
    music: '#FF6B6B',
    arts: '#9C27B0',
    food: '#FF9800',
    gaming: '#2196F3',
    social: '#45B7D1',
  };
  return colors[category.toLowerCase()] || '#666';
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  image: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    textTransform: 'capitalize',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  info: {
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerLeft: {
    flex: 1,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  participantsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  participantsText: {
    fontSize: 14,
    color: '#666',
  },
  rsvpBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rsvpText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    textTransform: 'capitalize',
  },
  playlistIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  playlistText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B6B',
  },
});