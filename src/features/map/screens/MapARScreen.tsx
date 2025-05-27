import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as Location from 'expo-location';
import { DeviceMotion } from 'expo-sensors';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useNearbyEvents } from "@/hooks/useNearbyEvents";
import { Event } from '@/entities/event/types';
import AREventMarker from "@/components/AREventMarker";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AREvent extends Event {
  distance: number;
  bearing: number;
  x?: number;
  y?: number;
}

export default function MapARScreen() {
  const navigation = useNavigation();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [userHeading, setUserHeading] = useState(0);
  const [arEvents, setArEvents] = useState<AREvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AREvent | null>(null);
  const [showRadar, setShowRadar] = useState(true);
  
  const cameraRef = useRef<Camera>(null);
  const deviceMotionSubscription = useRef<any>(null);
  
  const { events, loading } = useNearbyEvents(userLocation?.coords.latitude, userLocation?.coords.longitude);

  useEffect(() => {
    (async () => {
      // Request camera permission
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      
      // Request location permission
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      
      setHasPermission(cameraStatus === 'granted' && locationStatus === 'granted');
      
      if (locationStatus === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location);
        
        // Watch user location
        Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
            distanceInterval: 5,
          },
          (newLocation) => {
            setUserLocation(newLocation);
          }
        );
      }
    })();

    // Subscribe to device motion for AR positioning
    deviceMotionSubscription.current = DeviceMotion.addListener((motion) => {
      if (motion.rotation) {
        // Calculate heading from device rotation
        const heading = Math.atan2(motion.rotation.gamma || 0, motion.rotation.beta || 0) * (180 / Math.PI);
        setUserHeading(heading);
      }
    });

    return () => {
      if (deviceMotionSubscription.current) {
        deviceMotionSubscription.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (userLocation && events.length > 0) {
      // Calculate AR positions for events
      const arEventsData = events.map(event => {
        const eventLat = event.location?.latitude || 0;
        const eventLng = event.location?.longitude || 0;
        
        // Calculate distance and bearing
        const distance = calculateDistance(
          userLocation.coords.latitude,
          userLocation.coords.longitude,
          eventLat,
          eventLng
        );
        
        const bearing = calculateBearing(
          userLocation.coords.latitude,
          userLocation.coords.longitude,
          eventLat,
          eventLng
        );
        
        // Calculate screen position based on bearing and heading
        const relativeBearing = (bearing - userHeading + 360) % 360;
        const x = (relativeBearing / 60) * SCREEN_WIDTH; // 60 degree field of view
        const y = SCREEN_HEIGHT / 2 - (distance < 100 ? 100 : distance < 500 ? 200 : 300);
        
        return {
          ...event,
          distance,
          bearing,
          x: relativeBearing < 30 || relativeBearing > 330 ? x : undefined,
          y: relativeBearing < 30 || relativeBearing > 330 ? y : undefined,
        } as AREvent;
      });
      
      setArEvents(arEventsData);
    }
  }, [userLocation, events, userHeading]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const θ = Math.atan2(y, x);

    return (θ * 180 / Math.PI + 360) % 360;
  };

  const formatDistance = (distance: number): string => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
  };

  if (hasPermission === null) {
    return <View style={styles.container} />;
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <MaterialIcons name="location-off" size={64} color="#999" />
          <Text style={styles.permissionText}>
            Camera and location access required for AR view
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.permissionButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={CameraType.back}
      >
        {/* AR Event Markers */}
        {arEvents.map((event) => 
          event.x !== undefined && event.y !== undefined ? (
            <AREventMarker
              key={event.id}
              event={event}
              x={event.x}
              y={event.y}
              distance={event.distance}
              onPress={() => setSelectedEvent(event)}
              isSelected={selectedEvent?.id === event.id}
            />
          ) : null
        )}

        {/* Header */}
        <SafeAreaView style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>AR View</Text>
          
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowRadar(!showRadar)}
          >
            <MaterialIcons 
              name={showRadar ? "radar" : "radar"} 
              size={28} 
              color={showRadar ? "white" : "#666"} 
            />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Radar View */}
        {showRadar && (
          <View style={styles.radar}>
            <View style={styles.radarCircle}>
              {/* User position (center) */}
              <View style={styles.userDot} />
              
              {/* Event dots on radar */}
              {arEvents.map((event) => {
                const angle = (event.bearing - userHeading) * Math.PI / 180;
                const distance = Math.min(event.distance / 1000, 1); // Normalize to radar size
                const x = Math.sin(angle) * distance * 80;
                const y = -Math.cos(angle) * distance * 80;
                
                return (
                  <View
                    key={event.id}
                    style={[
                      styles.radarDot,
                      {
                        transform: [
                          { translateX: x },
                          { translateY: y },
                        ],
                      },
                      selectedEvent?.id === event.id && styles.selectedRadarDot,
                    ]}
                  />
                );
              })}
              
              {/* Direction indicator */}
              <View style={styles.directionIndicator} />
            </View>
            
            <Text style={styles.radarText}>
              {arEvents.length} events nearby
            </Text>
          </View>
        )}

        {/* Selected Event Details */}
        {selectedEvent && (
          <TouchableOpacity
            style={styles.eventDetails}
            onPress={() => navigation.navigate('EventDetailsScreen', { eventId: selectedEvent.id })}
            activeOpacity={0.9}
          >
            <Text style={styles.eventTitle}>{selectedEvent.title}</Text>
            <Text style={styles.eventSubtitle}>{selectedEvent.subtitle}</Text>
            <View style={styles.eventInfo}>
              <Text style={styles.eventDistance}>
                {formatDistance(selectedEvent.distance)}
              </Text>
              <Text style={styles.eventTime}>
                {new Date(selectedEvent.startTime).toLocaleDateString()}
              </Text>
            </View>
            <Text style={styles.eventAction}>Tap to view details →</Text>
          </TouchableOpacity>
        )}

        {/* Distance Grid Overlay */}
        <View style={styles.gridOverlay} pointerEvents="none">
          <View style={styles.gridLine} />
          <Text style={styles.gridText}>100m</Text>
          <View style={[styles.gridLine, { top: '50%' }]} />
          <Text style={[styles.gridText, { top: '50%' }]}>500m</Text>
          <View style={[styles.gridLine, { top: '75%' }]} />
          <Text style={[styles.gridText, { top: '75%' }]}>1km+</Text>
        </View>
      </Camera>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 22,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  radar: {
    position: 'absolute',
    top: 100,
    right: 16,
    width: 180,
    height: 180,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,255,0,0.3)',
  },
  radarCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: 'rgba(0,255,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00FF00',
    position: 'absolute',
  },
  radarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.8)',
    position: 'absolute',
  },
  selectedRadarDot: {
    backgroundColor: '#007AFF',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  directionIndicator: {
    position: 'absolute',
    top: -80,
    width: 2,
    height: 80,
    backgroundColor: 'rgba(0,255,0,0.4)',
  },
  radarText: {
    position: 'absolute',
    bottom: -24,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  eventDetails: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 20,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  eventInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  eventDistance: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  eventTime: {
    fontSize: 14,
    color: '#666',
  },
  eventAction: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
  },
  gridOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: '25%',
  },
  gridText: {
    position: 'absolute',
    left: 16,
    top: '25%',
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    marginTop: 4,
  },
});