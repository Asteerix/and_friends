import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Event } from '@/entities/event/types';

interface AREventMarkerProps {
  event: Event & { distance: number };
  x: number;
  y: number;
  distance: number;
  onPress: () => void;
  isSelected: boolean;
}

export default function AREventMarker({
  event,
  x,
  y,
  distance,
  onPress,
  isSelected,
}: AREventMarkerProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entry animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();

    // Pulse animation for selected marker
    if (isSelected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isSelected]);

  const getMarkerSize = () => {
    if (distance < 100) return 80;
    if (distance < 500) return 60;
    return 40;
  };

  const getMarkerOpacity = () => {
    if (distance < 100) return 1;
    if (distance < 500) return 0.8;
    return 0.6;
  };

  const formatDistance = (dist: number): string => {
    if (dist < 1000) {
      return `${Math.round(dist)}m`;
    }
    return `${(dist / 1000).toFixed(1)}km`;
  };

  const getEventIcon = () => {
    switch (event.category) {
      case 'party':
        return 'party-mode';
      case 'sports':
        return 'sports-basketball';
      case 'music':
        return 'music-note';
      case 'food':
        return 'restaurant';
      case 'outdoor':
        return 'terrain';
      default:
        return 'event';
    }
  };

  const markerSize = getMarkerSize();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          left: x - markerSize / 2,
          top: y - markerSize / 2,
          width: markerSize,
          height: markerSize,
          opacity: getMarkerOpacity(),
          transform: [
            { scale: scaleAnim },
            { scale: isSelected ? pulseAnim : 1 },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.marker, isSelected && styles.selectedMarker]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {/* Background gradient effect */}
        <View style={[styles.gradientBackground, isSelected && styles.selectedGradient]} />
        
        {/* Icon */}
        <MaterialIcons
          name={getEventIcon() as any}
          size={markerSize * 0.4}
          color={isSelected ? '#007AFF' : 'white'}
        />
        
        {/* Distance badge */}
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceText}>{formatDistance(distance)}</Text>
        </View>
        
        {/* Event info (shown for close events) */}
        {distance < 500 && (
          <View style={styles.infoContainer}>
            <Text style={styles.eventTitle} numberOfLines={1}>
              {event.title}
            </Text>
            <View style={styles.attendeesContainer}>
              <Ionicons name="people" size={12} color="#666" />
              <Text style={styles.attendeesText}>{event.currentAttendees}</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
      
      {/* Direction line (for distant events) */}
      {distance > 500 && (
        <View style={styles.directionLine} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1,
  },
  marker: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
  },
  selectedMarker: {
    borderColor: '#007AFF',
    backgroundColor: 'white',
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  selectedGradient: {
    backgroundColor: 'rgba(0,122,255,0.1)',
  },
  distanceBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  infoContainer: {
    position: 'absolute',
    bottom: -30,
    left: -20,
    right: -20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  attendeesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  attendeesText: {
    fontSize: 10,
    color: '#666',
  },
  directionLine: {
    position: 'absolute',
    bottom: -100,
    left: '50%',
    width: 1,
    height: 100,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginLeft: -0.5,
  },
});