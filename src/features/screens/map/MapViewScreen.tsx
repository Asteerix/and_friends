import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import MapView, { Marker, Callout, Region, MapMarker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useEvents } from "@/hooks/useEvents";
import { useMapStore } from "@/store/mapStore";
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

const categories = [
  { id: 'all', name: 'All', icon: 'grid', color: '#666' },
  { id: 'sports', name: 'Sports', icon: 'basketball', color: '#4CAF50' },
  { id: 'music', name: 'Music', icon: 'musical-notes', color: '#FF6B6B' },
  { id: 'arts', name: 'Arts', icon: 'color-palette', color: '#9C27B0' },
  { id: 'food', name: 'Food', icon: 'restaurant', color: '#FF9800' },
  { id: 'gaming', name: 'Gaming', icon: 'game-controller', color: '#2196F3' },
];

export default function MapViewScreen() {
  const navigation = useNavigation();
  const mapRef = useRef<MapView>(null);
  const { events } = useEvents();
  const { mapRegion, setMapRegion } = useMapStore();
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showEventCard, setShowEventCard] = useState(false);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    if (showEventCard) {
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showEventCard]);

  const getUserLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    const location = await Location.getCurrentPositionAsync({});
    setUserLocation(location);
    
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  };

  const handleMarkerPress = (event: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEvent(event);
    setShowEventCard(true);
  };

  const handleEventCardPress = () => {
    navigation.navigate('EventDetails' as never, { eventId: selectedEvent.id } as never);
  };

  const filteredEvents = events.filter(event => {
    if (selectedCategory === 'all') return true;
    return event.category === selectedCategory;
  });

  const getMarkerColor = (category?: string) => {
    const cat = categories.find(c => c.id === category);
    return cat?.color || '#666';
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={mapRegion}
        onRegionChangeComplete={setMapRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {filteredEvents.map((event) => (
          <Marker
            key={event.id}
            coordinate={{
              latitude: event.latitude || 37.78825,
              longitude: event.longitude || -122.4324,
            }}
            onPress={() => handleMarkerPress(event)}
          >
            <View style={[styles.marker, { backgroundColor: getMarkerColor(event.category) }]}>
              <Ionicons 
                name={categories.find(c => c.id === event.category)?.icon as any || 'calendar'} 
                size={20} 
                color="white" 
              />
            </View>
            <Callout tooltip>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{event.title}</Text>
                <Text style={styles.calloutDate}>
                  {format(new Date(event.date), 'MMM d, h:mm a')}
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Header */}
      <View style={styles.header}>
        <BlurView intensity={90} tint="light" style={styles.headerBlur}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Events Near You</Text>
          <TouchableOpacity onPress={getUserLocation}>
            <Ionicons name="locate" size={24} color="#333" />
          </TouchableOpacity>
        </BlurView>
      </View>

      {/* Category Filter */}
      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                selectedCategory === category.id && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <BlurView
                intensity={80}
                tint={selectedCategory === category.id ? 'dark' : 'light'}
                style={styles.categoryBlur}
              >
                <Ionicons
                  name={category.icon as any}
                  size={20}
                  color={selectedCategory === category.id ? 'white' : '#333'}
                />
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === category.id && styles.categoryTextActive,
                  ]}
                >
                  {category.name}
                </Text>
              </BlurView>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Event Count */}
      <View style={styles.eventCount}>
        <BlurView intensity={80} tint="light" style={styles.eventCountBlur}>
          <Text style={styles.eventCountText}>
            {filteredEvents.length} events nearby
          </Text>
        </BlurView>
      </View>

      {/* Selected Event Card */}
      <Animated.View
        style={[
          styles.eventCardContainer,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {selectedEvent && (
          <TouchableOpacity
            style={styles.eventCard}
            onPress={handleEventCardPress}
            activeOpacity={0.9}
          >
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowEventCard(false)}
            >
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>

            {selectedEvent.cover_url ? (
              <Image
                source={{ uri: selectedEvent.cover_url }}
                style={styles.eventImage}
              />
            ) : (
              <LinearGradient
                colors={['#FF6B6B', '#FF8787']}
                style={styles.eventImagePlaceholder}
              >
                <Ionicons name="calendar" size={40} color="white" />
              </LinearGradient>
            )}

            <View style={styles.eventInfo}>
              <View style={styles.eventHeader}>
                <Text style={styles.eventTitle} numberOfLines={2}>
                  {selectedEvent.title}
                </Text>
                {selectedEvent.category && (
                  <View
                    style={[
                      styles.eventCategory,
                      { backgroundColor: getMarkerColor(selectedEvent.category) },
                    ]}
                  >
                    <Text style={styles.eventCategoryText}>
                      {selectedEvent.category}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.eventDetails}>
                <View style={styles.eventDetailItem}>
                  <Ionicons name="calendar-outline" size={16} color="#666" />
                  <Text style={styles.eventDetailText}>
                    {format(new Date(selectedEvent.date), 'EEEE, MMMM d')}
                  </Text>
                </View>
                <View style={styles.eventDetailItem}>
                  <Ionicons name="time-outline" size={16} color="#666" />
                  <Text style={styles.eventDetailText}>
                    {format(new Date(selectedEvent.date), 'h:mm a')}
                  </Text>
                </View>
                {selectedEvent.location && (
                  <View style={styles.eventDetailItem}>
                    <Ionicons name="location-outline" size={16} color="#666" />
                    <Text style={styles.eventDetailText} numberOfLines={1}>
                      {selectedEvent.location}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.eventFooter}>
                <View style={styles.attendees}>
                  <Ionicons name="people-outline" size={18} color="#666" />
                  <Text style={styles.attendeesText}>
                    {selectedEvent.participants_count || 0} going
                  </Text>
                </View>
                <View style={styles.viewButton}>
                  <Text style={styles.viewButtonText}>View Details</Text>
                  <Ionicons name="arrow-forward" size={18} color="#45B7D1" />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
  },
  headerBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  categoryContainer: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
  },
  categoryScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryChip: {
    marginRight: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  categoryChipActive: {
    transform: [{ scale: 1.05 }],
  },
  categoryBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  categoryText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: 'white',
  },
  eventCount: {
    position: 'absolute',
    top: 180,
    alignSelf: 'center',
  },
  eventCountBlur: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  eventCountText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  callout: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  calloutDate: {
    fontSize: 12,
    color: '#666',
  },
  eventCardContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  eventCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  eventImagePlaceholder: {
    width: '100%',
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventInfo: {
    padding: 20,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  eventCategory: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  eventCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    textTransform: 'capitalize',
  },
  eventDetails: {
    gap: 8,
    marginBottom: 20,
  },
  eventDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventDetailText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendees: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attendeesText: {
    fontSize: 14,
    color: '#666',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#45B7D1',
  },
});