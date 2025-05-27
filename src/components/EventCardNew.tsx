import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Event } from "@/hooks/useEvents";
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  event: Event;
  style?: ViewStyle;
  onPress?: () => void;
};

export default function EventCardNew({ event, style, onPress }: Props) {
  const formattedDate = event.date ? format(new Date(event.date), 'MMM d') : '';
  const formattedTime = event.time || format(new Date(event.date), 'h:mm a');

  return (
    <TouchableOpacity 
      style={[styles.container, style]} 
      onPress={onPress}
      activeOpacity={0.9}
    >
      {event.cover_url || event.image_url ? (
        <Image 
          source={{ uri: event.cover_url || event.image_url }} 
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

          {event.location && (
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={styles.infoText} numberOfLines={1}>
                {event.location}
              </Text>
            </View>
          )}
        </View>

        {event.participants_count !== undefined && (
          <View style={styles.footer}>
            <View style={styles.participantsInfo}>
              <Ionicons name="people-outline" size={18} color="#666" />
              <Text style={styles.participantsText}>
                {event.participants_count} going
              </Text>
            </View>

            {event.userRSVP && (
              <View style={[styles.rsvpBadge, { backgroundColor: getRSVPColor(event.userRSVP) }]}>
                <Text style={styles.rsvpText}>{event.userRSVP}</Text>
              </View>
            )}
          </View>
        )}
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

function getRSVPColor(status: string): string {
  const colors: { [key: string]: string } = {
    going: '#4CAF50',
    maybe: '#FF9800',
    'not-going': '#F44336',
  };
  return colors[status.toLowerCase()] || '#666';
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
});