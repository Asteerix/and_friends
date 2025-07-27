import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { getEventImage } from '@/features/events/utils/getEventImage';
import { format } from 'date-fns';


interface Participant {
  id: string;
  avatar_url?: string;
  name?: string;
}

interface EventThumbnailProps {
  event: {
    id: string;
    title: string;
    date: string;
    start_time?: string;
    location?: string;
    location_details?: {
      name?: string;
      address?: string;
    };
    participants?: Participant[];
    participants_count?: number;
    cover_image?: string;
    extra_data?: any;
    created_by?: string;
  };
  onPress?: () => void;
  style?: any;
  showLocation?: boolean;
  compact?: boolean;
  currentUserId?: string;
}

export default function EventThumbnail({ 
  event, 
  onPress, 
  style,
  showLocation = true,
  compact = false,
  currentUserId
}: EventThumbnailProps) {
  const eventImage = getEventImage(event);

  // Format date and time
  const formatEventDateTime = () => {
    try {
      const eventDate = new Date(event.date);
      const dateStr = format(eventDate, 'MMM d');
      
      if (event.start_time) {
        return `${dateStr}, ${event.start_time}`;
      }
      
      const timeStr = format(eventDate, 'h:mm a');
      return `${dateStr}, ${timeStr}`;
    } catch {
      return event.date;
    }
  };

  // Get location name
  const getLocationName = () => {
    if (event.location_details?.name) {
      return event.location_details.name;
    }
    if (event.location_details?.address) {
      const parts = event.location_details.address.split(',');
      return parts[0];
    }
    if (event.location) {
      const parts = event.location.split(',');
      return parts[0];
    }
    return '';
  };

  const renderParticipants = () => {
    const displayParticipants = event.participants?.slice(0, 3) || [];
    let totalCount = event.participants_count || 0;
    
    // Check if current user is the host
    const isHost = currentUserId && event.created_by === currentUserId;
    
    // If user is host and not in participants list, we should count them
    const isHostInParticipants = isHost && event.participants?.some(p => p.id === currentUserId);
    
    // Adjust count: if host but not in participants, add 1 to the count
    const effectiveCount = isHost && !isHostInParticipants ? totalCount + 1 : totalCount;
    
    // Remaining count after showing first 3 avatars
    const remainingCount = Math.max(0, effectiveCount - displayParticipants.length);

    return (
      <View style={styles.participantsContainer}>
        <View style={styles.avatarsStack}>
          {displayParticipants.map((participant, index) => (
            <View
              key={participant.id}
              style={[
                styles.avatarWrapper,
                { 
                  marginLeft: index === 0 ? 0 : -12,
                  zIndex: displayParticipants.length - index,
                },
              ]}
            >
              {participant.avatar_url ? (
                <Image
                  source={{ uri: participant.avatar_url }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitial}>
                    {participant.name?.[0]?.toUpperCase() || '?'}
                  </Text>
                </View>
              )}
            </View>
          ))}
          
          {remainingCount > 0 && (
            <View style={[styles.remainingCount, { marginLeft: displayParticipants.length > 0 ? -12 : 0 }]}>
              <Text style={styles.remainingCountText}>+{remainingCount}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.goingInfo}>
          <Text style={styles.goingText}>
            {effectiveCount === 0 
              ? 'Be the first' 
              : effectiveCount === 1 && isHost && !isHostInParticipants
              ? 'You\'re going'
              : effectiveCount === 1
              ? '1 going'
              : `${effectiveCount} going`}
          </Text>
          {isHost && (
            <View style={styles.hostBadge}>
              <Text style={styles.hostBadgeText}>HOST</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[styles.container, compact && styles.containerCompact, style]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.imageContainer, compact && styles.imageContainerCompact]}>
        {eventImage && eventImage.hasImage ? (
          eventImage.source ? (
            <Image 
              source={eventImage.source}
              style={styles.eventImage}
              resizeMode="cover"
            />
          ) : (
            <Image 
              source={{ uri: eventImage.uri }}
              style={styles.eventImage}
              resizeMode="cover"
            />
          )
        ) : (
          <View style={[styles.eventImage, styles.imagePlaceholder]}>
            <Text style={styles.imagePlaceholderText}>
              {event.title?.[0]?.toUpperCase() || 'E'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.contentContainer}>
        <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={2}>
          {event.title}
        </Text>
        
        <Text style={[styles.dateTime, compact && styles.dateTimeCompact]}>
          {formatEventDateTime()}
        </Text>
        
        {showLocation && getLocationName() && (
          <Text style={[styles.location, compact && styles.locationCompact]} numberOfLines={1}>
            {getLocationName()}
          </Text>
        )}
        
        {renderParticipants()}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  containerCompact: {
    marginBottom: 12,
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  imageContainerCompact: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#999',
  },
  contentContainer: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    lineHeight: 24,
    letterSpacing: -0.3,
    fontFamily: Platform.select({
      ios: 'SF Pro Display',
      android: 'Roboto',
      default: 'System',
    }),
  },
  titleCompact: {
    fontSize: 16,
    lineHeight: 22,
  },
  dateTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'Roboto',
      default: 'System',
    }),
  },
  dateTimeCompact: {
    fontSize: 13,
    marginTop: 2,
  },
  location: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'Roboto',
      default: 'System',
    }),
  },
  locationCompact: {
    fontSize: 13,
  },
  participantsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  avatarsStack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarWrapper: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  remainingCount: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  remainingCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
  },
  goingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'Roboto',
      default: 'System',
    }),
  },
  goingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hostBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hostBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
});