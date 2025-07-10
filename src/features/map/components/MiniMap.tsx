import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
// import { SharedElement } from 'react-navigation-shared-element';

import { useMapStore } from '@/store/mapStore';
import ExpandIcon from './ExpandIcon.svg';
import { useEventsAdvanced } from '@/hooks/useEventsAdvanced';

// Black and white map style
const GRAYSCALE_MAP_STYLE = [
  {
    elementType: "all",
    stylers: [
      {
        saturation: -100
      }
    ]
  },
  {
    elementType: "geometry",
    stylers: [
      {
        lightness: 40
      }
    ]
  },
  {
    featureType: "poi",
    elementType: "all",
    stylers: [
      {
        visibility: "off"
      }
    ]
  },
  {
    featureType: "transit",
    elementType: "all",
    stylers: [
      {
        visibility: "off"
      }
    ]
  },
  {
    featureType: "road",
    elementType: "labels.icon",
    stylers: [
      {
        visibility: "off"
      }
    ]
  },
  {
    featureType: "administrative",
    elementType: "labels",
    stylers: [
      {
        lightness: 30
      }
    ]
  }
];

export default function MiniMap() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { region, setRegion } = useMapStore();
  const { events } = useEventsAdvanced();
  const [isInteracting, setIsInteracting] = useState(false);

  const onExpand = () => {
    void router.push('/screens/map');
  };

  // Parse coordinates from events
  const getEventCoordinates = (event: any) => {
    // First try location_details
    if (event.location_details?.coordinates) {
      return {
        latitude: event.location_details.coordinates.latitude,
        longitude: event.location_details.coordinates.longitude,
      };
    }
    
    // Then try parsing location string
    const location = event.location;
    if (!location) return null;
    
    const coords = location.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
    if (coords && coords[1] && coords[2]) {
      return {
        latitude: parseFloat(coords[1]),
        longitude: parseFloat(coords[2]),
      };
    }
    
    return null;
  };

  const eventsWithCoordinates = events
    .map((event) => ({
      ...event,
      coordinates: getEventCoordinates(event),
    }))
    .filter((event) => event.coordinates !== null)
    .slice(0, 20); // Limit to 20 events for performance

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          region={region}
          onRegionChangeComplete={setRegion}
          liteMode={false}
          showsCompass={false}
          showsScale={false}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsBuildings={false}
          showsTraffic={false}
          showsIndoors={false}
          scrollEnabled={true}
          zoomEnabled={true}
          pitchEnabled={false}
          rotateEnabled={false}
          customMapStyle={GRAYSCALE_MAP_STYLE}
          mapType="standard"
          onTouchStart={() => setIsInteracting(true)}
          onTouchEnd={() => setIsInteracting(false)}
        >
          {eventsWithCoordinates.map((event) => (
            <Marker
              key={event.id}
              coordinate={event.coordinates}
              onPress={() => router.push(`/screens/event-details?eventId=${event.id}`)}
            >
              <View style={styles.markerContainer}>
                <View style={styles.marker}>
                  <View style={styles.markerDot} />
                </View>
              </View>
            </Marker>
          ))}
        </MapView>
        {isInteracting && (
          <View style={styles.interactionOverlay} pointerEvents="none" />
        )}
      </View>
      <Pressable style={styles.expandBtn} onPress={onExpand}>
        <ExpandIcon width={30} height={30} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 2,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 24,
    backgroundColor: '#F5F5F5',
    position: 'relative',
  },
  hero: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    overflow: 'hidden',
  },
  expandBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    zIndex: 2,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF',
  },
  interactionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 16,
  },
});
