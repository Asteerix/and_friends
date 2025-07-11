import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Animated,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { useEventsAdvanced } from '@/hooks/useEventsAdvanced';
import { useMapStore } from '@/store/mapStore';
import { useProfile } from '@/hooks/useProfile';
import { EVENT_TEMPLATE_CATEGORIES } from '@/features/events/data/eventTemplates';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Get template image by ID
const getTemplateImage = (templateId: string) => {
  for (const category of EVENT_TEMPLATE_CATEGORIES) {
    const template = category.templates.find(t => t.id === templateId);
    if (template) {
      return template.image;
    }
  }
  return null;
};

// Get category color
const getCategoryColor = (category?: string): string => {
  const colors: { [key: string]: string } = {
    'party': '#FF6B00',
    'music': '#9B51E0',
    'art': '#F72585',
    'sports': '#4ECDC4',
    'food': '#FFD60A',
    'drinks': '#003566',
    'social': '#7209B7',
    'apartment': '#FF6B00',
    'default': '#007AFF',
  };
  return colors[category || 'default'] || colors.default;
};

const MapScreenFixed = () => {
  console.log('🚀 [MapScreenFixed] Rendering');
  
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { region, setRegion } = useMapStore();
  const { events, loading } = useEventsAdvanced();
  const { profile } = useProfile();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [bottomSheetAnimation] = useState(new Animated.Value(0));
  
  console.log('📊 [MapScreenFixed] State:', {
    eventsCount: events.length,
    loading,
    region,
  });

  // Filter events with coordinates
  const eventsWithCoordinates = useMemo(() => {
    return events.filter(event => {
      // Check location_details first
      if (event.location_details?.coordinates) {
        return true;
      }
      // Then check location string
      if (event.location) {
        const coords = event.location.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
        return coords && coords[1] && coords[2];
      }
      return false;
    }).map(event => {
      let coordinates;
      if (event.location_details?.coordinates) {
        coordinates = {
          latitude: event.location_details.coordinates.latitude,
          longitude: event.location_details.coordinates.longitude,
        };
      } else {
        const coords = event.location.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
        coordinates = {
          latitude: parseFloat(coords[1]),
          longitude: parseFloat(coords[2]),
        };
      }
      
      return {
        ...event,
        coordinates,
      };
    });
  }, [events]);

  console.log('📍 [MapScreenFixed] Events with coordinates:', eventsWithCoordinates.length);

  // Center map on events when loaded
  useEffect(() => {
    if (eventsWithCoordinates.length > 0 && mapRef.current) {
      console.log('🎯 [MapScreenFixed] Centering map on events');
      
      if (eventsWithCoordinates.length === 1) {
        const event = eventsWithCoordinates[0];
        const newRegion = {
          latitude: event.coordinates.latitude,
          longitude: event.coordinates.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        };
        setTimeout(() => {
          mapRef.current?.animateToRegion(newRegion, 1000);
        }, 500);
      }
    }
  }, [eventsWithCoordinates]);

  const selectedEvent = selectedEventId 
    ? eventsWithCoordinates.find(e => e.id === selectedEventId)
    : null;

  // Animate bottom sheet when event is selected
  useEffect(() => {
    if (selectedEvent) {
      Animated.spring(bottomSheetAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 20,
        friction: 7,
      }).start();
    } else {
      Animated.timing(bottomSheetAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedEvent, bottomSheetAnimation]);

  const renderEventMarker = (event: any) => {
    const isSelected = selectedEventId === event.id;
    
    // Check for template image
    let imageSource = null;
    let imageUri = null;
    
    if (event.extra_data?.coverData?.selectedTemplate?.id) {
      imageSource = getTemplateImage(event.extra_data.coverData.selectedTemplate.id);
    }
    
    if (!imageSource) {
      const coverImage = event.extra_data?.coverData?.coverImage || event.extra_data?.coverData?.uploadedImage;
      if (coverImage && coverImage !== '') {
        imageUri = coverImage;
      }
    }
    
    const category = event.event_category || event.category || event.extra_data?.eventCategory || 'social';
    
    console.log('🎨 [MapScreenFixed] Rendering marker:', {
      id: event.id,
      title: event.title,
      category,
      hasTemplateImage: !!imageSource,
      hasImageUri: !!imageUri,
    });

    return (
      <Marker
        key={event.id}
        coordinate={event.coordinates}
        onPress={() => {
          setSelectedEventId(isSelected ? selectedEventId : event.id);
        }}
        tracksViewChanges={false}
        zIndex={isSelected ? 999 : 1}
      >
        <View style={[styles.markerContainer, isSelected && styles.selectedMarker]}>
          {imageSource ? (
            <Image source={imageSource} style={styles.markerImage} />
          ) : imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.markerImage} />
          ) : (
            <View style={[styles.markerImage, { backgroundColor: getCategoryColor(category), justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={styles.markerPlaceholderText}>
                {event.title.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.markerLabelContainer}>
            <Text style={styles.markerTitle} numberOfLines={1}>{event.title}</Text>
            <Text style={styles.markerSubtitle}>{event.participants_count || 1} going</Text>
          </View>
        </View>
      </Marker>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Map</Text>
        <View style={{ width: 60 }} />
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        onRegionChangeComplete={setRegion}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {eventsWithCoordinates.map(renderEventMarker)}
      </MapView>

      {selectedEvent && (
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              transform: [{
                translateY: bottomSheetAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [300, 0],
                }),
              }],
              opacity: bottomSheetAnimation,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.eventCard}
            onPress={() => router.push(`/event/${selectedEvent.id}`)}
            activeOpacity={0.95}
          >
            {(() => {
              let imageSource = null;
              let imageUri = null;
              
              if (selectedEvent.extra_data?.coverData?.selectedTemplate?.id) {
                imageSource = getTemplateImage(selectedEvent.extra_data.coverData.selectedTemplate.id);
              }
              
              if (!imageSource) {
                const coverImage = selectedEvent.extra_data?.coverData?.coverImage || selectedEvent.extra_data?.coverData?.uploadedImage;
                if (coverImage && coverImage !== '') {
                  imageUri = coverImage;
                }
              }
              
              const category = selectedEvent.event_category || (selectedEvent as any).category || selectedEvent.extra_data?.eventCategory || 'social';
              
              return imageSource ? (
                <Image source={imageSource} style={styles.eventImage} />
              ) : imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.eventImage} />
              ) : (
                <View style={[styles.eventImage, { backgroundColor: getCategoryColor(category), justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={styles.eventImagePlaceholder}>
                    {selectedEvent.title.charAt(0).toUpperCase()}
                  </Text>
                </View>
              );
            })()}
            <View style={styles.eventContent}>
              <Text style={styles.eventTitle}>{selectedEvent.title}</Text>
              <Text style={styles.eventDate}>
                {selectedEvent.date} {selectedEvent.start_time || ''}
              </Text>
              <Text style={styles.eventLocation}>
                {selectedEvent.location_details?.address || selectedEvent.location}
              </Text>
              <View style={styles.eventFooter}>
                <Text style={styles.eventAttendees}>
                  {selectedEvent.participants_count || 1} attending
                </Text>
                <Text style={styles.viewDetails}>View Details →</Text>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    width: 60,
  },
  backText: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
  },
  selectedMarker: {
    transform: [{ scale: 1.15 }],
    zIndex: 999,
  },
  markerImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  markerPlaceholderText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  markerLabelContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 80,
    alignItems: 'center',
  },
  markerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  markerSubtitle: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  eventCard: {
    flexDirection: 'row',
    padding: 16,
  },
  eventImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  eventImagePlaceholder: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  eventContent: {
    flex: 1,
    marginLeft: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  eventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventAttendees: {
    fontSize: 14,
    color: '#666',
  },
  viewDetails: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MapScreenFixed;