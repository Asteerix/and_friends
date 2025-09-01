import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { getEventImage } from '@/features/events/utils/getEventImage';

const W = Dimensions.get('window').width;
const CARD_W = W - 24 * 2;
const THUMB = 96;
const AVATAR = 32;
const AVATAR_OVERLAP = -12;
const MAX_AVATARS = 4;
const PLACEHOLDER = require('@/assets/default_avatar.png');

export type EventRowProps = {
  event: {
    id: string;
    title: string;
    date: string;
    location?: string;
    cover_image?: string;
    participants?: { id: string; avatar_url?: string }[];
    going_count?: number;
    extra_data?: any; // For template data
    image_url?: string; // Alternative image source
  };
  onPress?: () => void;
};

export default function EventRow({ event, onPress }: EventRowProps) {
  const avatars = (event.participants || []).slice(0, MAX_AVATARS);
  const badge =
    event.going_count && event.going_count > MAX_AVATARS
      ? `+${event.going_count - MAX_AVATARS} going`
      : null;

  const eventImage = getEventImage(event);

  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.85} onPress={onPress}>
      {eventImage.hasImage ? (
        eventImage.source ? (
          <Image source={eventImage.source} style={styles.thumb} resizeMode="cover" />
        ) : (
          <Image source={{ uri: eventImage.uri }} style={styles.thumb} resizeMode="cover" />
        )
      ) : (
        <Image
          source={event.cover_image ? { uri: event.cover_image } : PLACEHOLDER}
          style={styles.thumb}
          resizeMode="cover"
        />
      )}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        <Text style={styles.info} numberOfLines={1}>
          {formatEventDate(event.date)}
          {event.location ? ` • ${event.location}` : ''}
        </Text>
        <View style={styles.avatarsRow}>
          {avatars.map((p, i) => (
            <Image
              key={p.id}
              source={p.avatar_url ? { uri: p.avatar_url } : PLACEHOLDER}
              style={[styles.avatar, { left: i * AVATAR_OVERLAP, zIndex: MAX_AVATARS - i }]}
            />
          ))}
          {badge && <Text style={styles.badge}>{badge}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function formatEventDate(date: string) {
  const d = new Date(date);
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: CARD_W,
    height: 96,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    alignItems: 'center',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 12,
    backgroundColor: '#F6F6F6',
  },
  content: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  info: {
    fontSize: 13,
    color: '#6E6E6E',
    marginBottom: 8,
    lineHeight: 18,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    minHeight: AVATAR,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 2,
    borderColor: '#fff',
    position: 'absolute',
    backgroundColor: '#eee',
  },
  badge: {
    marginLeft: AVATAR + 8,
    fontSize: 13,
    color: '#6E6E6E',
    marginTop: 2,
    marginRight: 8,
  },
});
