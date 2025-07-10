import React from 'react';
import {
  TouchableOpacity,
  Image,
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { useResponsive } from '@/shared/hooks/useResponsive';
import { getCategoryIcon } from '@/features/events/utils/categoryHelpers';
import EventCoverPreview from '@/features/events/components/EventCoverPreview';

type Props = {
  thumbnail: string;
  title: string;
  date: string;
  location: string;
  participants: string[];
  goingText: string;
  onPress?: () => void;
  category?: string;
  event?: any; // Full event object for cover preview
};

export default function EventCard({
  thumbnail,
  title,
  date,
  location,
  participants,
  goingText,
  onPress,
  category,
  event,
}: Props) {
  const responsive = useResponsive();
  const styles = createStyles(responsive);
  
  // Format date to be more readable
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };
  
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.container}
    >
      <View style={styles.thumbnailContainer}>
        {event && event.cover_data ? (
          <EventCoverPreview 
            event={event}
            style={styles.thumbnail}
            showTitle={false}
            showOverlay={true}
          />
        ) : (
          <Image 
            source={{ uri: thumbnail || 'https://via.placeholder.com/400x400/f0f0f0/666666?text=Event' }} 
            style={styles.thumbnail} 
          />
        )}
        {(category || event?.event_category) && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryIcon}>{getCategoryIcon(category || event?.event_category)}</Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.date}>{formatDate(date)}</Text>
        <Text style={styles.location} numberOfLines={1}>{location}</Text>
        <View style={styles.participantsRow}>
          <View style={styles.avatarsStack}>
            {participants.slice(0, 3).map((uri, idx) => (
              <Image
                key={uri + idx}
                source={{ uri }}
                style={[styles.avatar, { marginLeft: idx === 0 ? 0 : responsive.scaleWidth(-8) }]}
              />
            ))}
          </View>
          <Text style={styles.goingText}>{goingText}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (responsive: ReturnType<typeof useResponsive>) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: responsive.scaleHeight(16),
    backgroundColor: '#FFF',
  },
  thumbnailContainer: {
    position: 'relative',
  },
  thumbnail: {
    width: responsive.getResponsiveValue({
      small: responsive.width * 0.35,
      medium: responsive.width * 0.4,
      large: 160,
      default: responsive.width * 0.4,
    }),
    aspectRatio: 1,
    borderRadius: responsive.scaleWidth(16),
    backgroundColor: '#EEE',
  },
  categoryBadge: {
    position: 'absolute',
    top: responsive.scaleHeight(8),
    right: responsive.scaleWidth(8),
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: responsive.scaleWidth(12),
    padding: responsive.scaleWidth(6),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryIcon: {
    fontSize: responsive.scaleFontSize(20),
  },
  body: {
    flex: 1,
    marginLeft: responsive.scaleWidth(16),
    paddingVertical: responsive.scaleHeight(8),
  },
  title: {
    fontSize: responsive.scaleFontSize(20),
    fontWeight: '600',
    color: '#000',
    fontFamily: Platform.select({
      ios: 'SF Pro Display',
      android: 'Roboto',
      default: 'System',
    }),
    marginBottom: responsive.scaleHeight(8),
    lineHeight: responsive.scaleHeight(24),
  },
  date: {
    fontSize: responsive.scaleFontSize(16),
    color: '#666',
    marginBottom: responsive.scaleHeight(4),
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'Roboto',
      default: 'System',
    }),
  },
  location: {
    fontSize: responsive.scaleFontSize(16),
    color: '#666',
    marginBottom: responsive.scaleHeight(12),
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'Roboto',
      default: 'System',
    }),
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: responsive.scaleHeight(8),
  },
  avatarsStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: responsive.scaleWidth(32),
    height: responsive.scaleWidth(32),
    borderRadius: responsive.scaleWidth(16),
    borderWidth: 2,
    borderColor: '#FFF',
    backgroundColor: '#EEE',
  },
  goingText: {
    fontSize: responsive.scaleFontSize(16),
    color: '#666',
    marginLeft: responsive.scaleWidth(12),
    fontWeight: '500',
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'Roboto',
      default: 'System',
    }),
  },
});