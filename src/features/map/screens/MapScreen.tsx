import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { create } from 'react-native-pixel-perfect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Callout } from 'react-native-maps';
// import { SharedElement } from 'react-navigation-shared-element';
import { useRouter } from 'expo-router';

import CategoryTabs from '@/features/home/components/CategoryTabs';
import { useEventsAdvanced } from '@/hooks/useEventsAdvanced';
import { useMapStore } from '@/store/mapStore';
import ChatButton from '@/assets/svg/chat-button.svg';
import NotificationButton from '@/assets/svg/notification-button.svg';
import BackButton from '@/assets/svg/back-button.svg';
import SearchIcon from '@/assets/svg/search.svg';
import NotificationBadge from '@/features/notifications/components/NotificationBadge';
import { useNotifications } from '@/shared/providers/NotificationProvider';
import { EVENT_CATEGORIES } from '@/features/events/utils/categoryHelpers';
import { useProfile } from '@/hooks/useProfile';

const designResolution = { width: 375, height: 812 };
const perfectSize = create(designResolution);
const CATEGORIES = [
  { id: 'all', label: 'All' },
  ...EVENT_CATEGORIES.slice(0, 5) // Take first 5 categories for map view
];

const MapScreen: React.FC = React.memo(() => {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { region, setRegion } = useMapStore();
  const { events, loading } = useEventsAdvanced();
  const { profile } = useProfile();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState<Array<{
    type: 'event' | 'city';
    id?: string;
    title: string;
    subtitle?: string;
    distance?: number;
    coordinates?: { latitude: number; longitude: number };
  }>>([]);
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotifications();
  
  // Get user's location from profile
  const getUserLocationCoordinates = useCallback(() => {
    if (!profile?.location) return null;
    
    // Try to parse coordinates from location string
    const location = profile.location;
    
    // Check if it's a coordinate string
    const coords = location.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
    if (coords && coords[1] && coords[2]) {
      return {
        latitude: parseFloat(coords[1]),
        longitude: parseFloat(coords[2]),
      };
    }
    
    // If it's a city/country name, we'd need a geocoding service
    // For now, return some default coordinates based on common cities
    const cityCoordinates: { [key: string]: { latitude: number; longitude: number } } = {
      'paris': { latitude: 48.8566, longitude: 2.3522 },
      'new york': { latitude: 40.7128, longitude: -74.0060 },
      'london': { latitude: 51.5074, longitude: -0.1278 },
      'tokyo': { latitude: 35.6762, longitude: 139.6503 },
      'los angeles': { latitude: 34.0522, longitude: -118.2437 },
      'san francisco': { latitude: 37.7749, longitude: -122.4194 },
      'berlin': { latitude: 52.5200, longitude: 13.4050 },
      'madrid': { latitude: 40.4168, longitude: -3.7038 },
      'rome': { latitude: 41.9028, longitude: 12.4964 },
      'montreal': { latitude: 45.5017, longitude: -73.5673 },
      'toronto': { latitude: 43.6532, longitude: -79.3832 },
    };
    
    const locationLower = location.toLowerCase();
    for (const [city, coords] of Object.entries(cityCoordinates)) {
      if (locationLower.includes(city)) {
        return coords;
      }
    }
    
    return null;
  }, [profile]);
  
  // Update map region based on user location
  useEffect(() => {
    const userCoords = getUserLocationCoordinates();
    if (userCoords) {
      setRegion({
        ...userCoords,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  }, [getUserLocationCoordinates, setRegion]);

  // Search for a city
  const searchCity = useCallback((cityName: string) => {
    if (!cityName.trim()) return;
    
    // Extended city coordinates database
    const cityCoordinates: { [key: string]: { latitude: number; longitude: number } } = {
      // Major cities
      'paris': { latitude: 48.8566, longitude: 2.3522 },
      'new york': { latitude: 40.7128, longitude: -74.0060 },
      'london': { latitude: 51.5074, longitude: -0.1278 },
      'tokyo': { latitude: 35.6762, longitude: 139.6503 },
      'los angeles': { latitude: 34.0522, longitude: -118.2437 },
      'san francisco': { latitude: 37.7749, longitude: -122.4194 },
      'berlin': { latitude: 52.5200, longitude: 13.4050 },
      'madrid': { latitude: 40.4168, longitude: -3.7038 },
      'rome': { latitude: 41.9028, longitude: 12.4964 },
      'montreal': { latitude: 45.5017, longitude: -73.5673 },
      'toronto': { latitude: 43.6532, longitude: -79.3832 },
      'vancouver': { latitude: 49.2827, longitude: -123.1207 },
      'sydney': { latitude: -33.8688, longitude: 151.2093 },
      'melbourne': { latitude: -37.8136, longitude: 144.9631 },
      'dubai': { latitude: 25.2048, longitude: 55.2708 },
      'singapore': { latitude: 1.3521, longitude: 103.8198 },
      'hong kong': { latitude: 22.3193, longitude: 114.1694 },
      'beijing': { latitude: 39.9042, longitude: 116.4074 },
      'shanghai': { latitude: 31.2304, longitude: 121.4737 },
      'mumbai': { latitude: 19.0760, longitude: 72.8777 },
      'bangkok': { latitude: 13.7563, longitude: 100.5018 },
      'istanbul': { latitude: 41.0082, longitude: 28.9784 },
      'moscow': { latitude: 55.7558, longitude: 37.6173 },
      'rio de janeiro': { latitude: -22.9068, longitude: -43.1729 },
      'são paulo': { latitude: -23.5505, longitude: -46.6333 },
      'buenos aires': { latitude: -34.6037, longitude: -58.3816 },
      'mexico city': { latitude: 19.4326, longitude: -99.1332 },
      'miami': { latitude: 25.7617, longitude: -80.1918 },
      'chicago': { latitude: 41.8781, longitude: -87.6298 },
      'boston': { latitude: 42.3601, longitude: -71.0589 },
      'seattle': { latitude: 47.6062, longitude: -122.3321 },
      'atlanta': { latitude: 33.7490, longitude: -84.3880 },
      'amsterdam': { latitude: 52.3676, longitude: 4.9041 },
      'barcelona': { latitude: 41.3851, longitude: 2.1734 },
      'lisbon': { latitude: 38.7223, longitude: -9.1393 },
      'dublin': { latitude: 53.3498, longitude: -6.2603 },
      'stockholm': { latitude: 59.3293, longitude: 18.0686 },
      'copenhagen': { latitude: 55.6761, longitude: 12.5683 },
      'oslo': { latitude: 59.9139, longitude: 10.7522 },
      'vienna': { latitude: 48.2082, longitude: 16.3738 },
      'prague': { latitude: 50.0755, longitude: 14.4378 },
      'warsaw': { latitude: 52.2297, longitude: 21.0122 },
      'athens': { latitude: 37.9838, longitude: 23.7275 },
      'tel aviv': { latitude: 32.0853, longitude: 34.7818 },
      'cairo': { latitude: 30.0444, longitude: 31.2357 },
      'cape town': { latitude: -33.9249, longitude: 18.4241 },
      'johannesburg': { latitude: -26.2041, longitude: 28.0473 },
      'nairobi': { latitude: -1.2921, longitude: 36.8219 },
      'seoul': { latitude: 37.5665, longitude: 126.9780 },
      'jakarta': { latitude: -6.2088, longitude: 106.8456 },
      'manila': { latitude: 14.5995, longitude: 120.9842 },
      'kuala lumpur': { latitude: 3.1390, longitude: 101.6869 },
      'ho chi minh city': { latitude: 10.8231, longitude: 106.6297 },
      'taipei': { latitude: 25.0330, longitude: 121.5654 },
    };
    
    const searchLower = cityName.toLowerCase().trim();
    
    // Find exact match or partial match
    let cityCoords = null;
    for (const [city, coords] of Object.entries(cityCoordinates)) {
      if (city === searchLower || city.includes(searchLower) || searchLower.includes(city)) {
        cityCoords = coords;
        break;
      }
    }
    
    if (cityCoords) {
      const newRegion = {
        ...cityCoords,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
    }
  }, [setRegion]);

  // Calculate distance between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  };

  // Search handler with autocomplete
  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    
    if (text.length < 2) {
      setShowAutocomplete(false);
      setAutocompleteResults([]);
      return;
    }

    const searchLower = text.toLowerCase();
    const results: typeof autocompleteResults = [];
    
    // Search cities
    const cityCoordinates: { [key: string]: { latitude: number; longitude: number } } = {
      'paris': { latitude: 48.8566, longitude: 2.3522 },
      'new york': { latitude: 40.7128, longitude: -74.0060 },
      'london': { latitude: 51.5074, longitude: -0.1278 },
      'tokyo': { latitude: 35.6762, longitude: 139.6503 },
      'los angeles': { latitude: 34.0522, longitude: -118.2437 },
      'san francisco': { latitude: 37.7749, longitude: -122.4194 },
      'berlin': { latitude: 52.5200, longitude: 13.4050 },
      'madrid': { latitude: 40.4168, longitude: -3.7038 },
      'rome': { latitude: 41.9028, longitude: 12.4964 },
      'montreal': { latitude: 45.5017, longitude: -73.5673 },
      'toronto': { latitude: 43.6532, longitude: -79.3832 },
    };
    
    Object.entries(cityCoordinates).forEach(([city, coords]) => {
      if (city.includes(searchLower)) {
        results.push({
          type: 'city',
          title: city.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          subtitle: 'City',
          coordinates: coords,
        });
      }
    });
    
    // Search events within 50km
    const userCoords = getUserLocationCoordinates() || region;
    eventsWithCoordinates.forEach(event => {
      if (event.title.toLowerCase().includes(searchLower) || 
          event.location?.toLowerCase().includes(searchLower)) {
        const distance = calculateDistance(
          userCoords.latitude,
          userCoords.longitude,
          event.coordinates.latitude,
          event.coordinates.longitude
        );
        
        if (distance <= 50) { // Within 50km
          results.push({
            type: 'event',
            id: event.id,
            title: event.title,
            subtitle: `${event.location} • ${distance.toFixed(1)}km away`,
            distance,
            coordinates: event.coordinates,
          });
        }
      }
    });
    
    // Sort events by distance
    results.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'city' ? -1 : 1;
      return (a.distance || 0) - (b.distance || 0);
    });
    
    setAutocompleteResults(results.slice(0, 8));
    setShowAutocomplete(true);
  }, [eventsWithCoordinates, getUserLocationCoordinates, region]);

  // Select autocomplete item
  const selectAutocompleteItem = useCallback((item: typeof autocompleteResults[0]) => {
    setSearch('');
    setShowAutocomplete(false);
    
    if (item.coordinates) {
      const newRegion = {
        ...item.coordinates,
        latitudeDelta: item.type === 'city' ? 0.05 : 0.02,
        longitudeDelta: item.type === 'city' ? 0.05 : 0.02,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
      
      if (item.type === 'event' && item.id) {
        setSelectedEventId(item.id);
      }
    }
  }, [setRegion]);

  // Parse coordinates from location details or location string
  const getCoordinates = (event: any) => {
    // First try location_details
    if (event.location_details?.coordinates) {
      return {
        latitude: event.location_details.coordinates.latitude,
        longitude: event.location_details.coordinates.longitude,
      };
    }
    
    // Then try parsing location string
    const location = event.location;
    if (!location) {
      return null;
    }
    
    const coords = location.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
    if (coords && coords[1] && coords[2]) {
      return {
        latitude: parseFloat(coords[1]),
        longitude: parseFloat(coords[2]),
      };
    }
    
    // No valid coordinates found
    return null;
  };

  const eventsWithCoordinates = events
    .map((event) => ({
      ...event,
      coordinates: getCoordinates(event),
    }))
    .filter((event) => event.coordinates !== null);

  // Filtrage par catégorie
  const filteredEvents =
    activeCategory === 0
      ? eventsWithCoordinates
      : eventsWithCoordinates.filter((event) => {
          const selectedCategory = CATEGORIES[activeCategory];
          return selectedCategory && event.event_category === selectedCategory.id;
        });

  // Header buttons
  const handleChat = useCallback(() => {
    router.push('/screens/chat');
  }, [router]);
  const handleNotif = useCallback(() => {
    router.push('/screens/notifications');
  }, [router]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.headerWrapper}>
        <TouchableOpacity
          style={styles.headerIconLeft}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
        >
          <BackButton width={perfectSize(22)} height={perfectSize(22)} fill="#000" color="#000" stroke="#000" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrapper} pointerEvents="none">
          <Text style={styles.headerTitle} accessibilityRole="header" accessibilityLabel="Map">
            Map
          </Text>
        </View>
        <View style={styles.headerIconsRight}>
          <TouchableOpacity
            style={styles.headerCircleButton}
            accessibilityRole="button"
            accessibilityLabel="Open chat"
            activeOpacity={0.7}
            onPress={handleChat}
          >
            <ChatButton width={perfectSize(41)} height={perfectSize(41)} />
          </TouchableOpacity>
          <View style={styles.headerNotificationWrapper}>
            <TouchableOpacity
              style={styles.headerCircleButton}
              accessibilityRole="button"
              accessibilityLabel="Open notifications"
              activeOpacity={0.7}
              onPress={handleNotif}
            >
              <NotificationButton width={perfectSize(41)} height={perfectSize(41)} />
              <NotificationBadge count={unreadCount} size="small" position="top-right" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {/* SearchBar */}
      <View style={styles.searchBarWrapper}>
        <SearchIcon width={perfectSize(21)} height={perfectSize(20)} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a city or place"
          placeholderTextColor="#BDBDBD"
          accessibilityLabel="Search for a city or place"
          returnKeyType="search"
          value={search}
          onChangeText={handleSearch}
          onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
        />
      </View>
      
      {/* Autocomplete dropdown */}
      {showAutocomplete && autocompleteResults.length > 0 && (
        <View style={styles.autocompleteContainer}>
          {autocompleteResults.map((item, index) => (
            <TouchableOpacity
              key={`${item.type}-${item.id || item.title}-${index}`}
              style={styles.autocompleteItem}
              onPress={() => selectAutocompleteItem(item)}
            >
              {item.type === 'city' ? (
                <>
                  <View style={styles.cityIcon}>
                    <Text style={styles.cityIconText}>🏙️</Text>
                  </View>
                  <View style={styles.autocompleteContent}>
                    <Text style={styles.autocompleteTitle}>{item.title}</Text>
                    <Text style={styles.autocompleteSubtitle}>{item.subtitle}</Text>
                  </View>
                </>
              ) : (
                <>
                  <Image
                    source={{ uri: eventsWithCoordinates.find(e => e.id === item.id)?.cover_image || eventsWithCoordinates.find(e => e.id === item.id)?.image_url || 'https://via.placeholder.com/60/FF6B00/FFFFFF?text=' + encodeURIComponent(item.title.charAt(0)) }}
                    style={styles.eventThumbnail}
                  />
                  <View style={styles.autocompleteContent}>
                    <Text style={styles.autocompleteTitle}>{item.title}</Text>
                    <Text style={styles.autocompleteSubtitle}>{item.subtitle}</Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
      
      <View style={styles.container}>
        <CategoryTabs
          categories={CATEGORIES.map(cat => cat.label)}
          activeIndex={activeCategory}
          onPress={setActiveCategory}
        />
        {/* Map background */}
        <View style={styles.hero}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={region}
            region={region}
            showsCompass={false}
            showsScale={false}
            showsUserLocation={true}
            showsMyLocationButton={false}
            showsBuildings={false}
            showsTraffic={false}
            showsIndoors={false}
            customMapStyle={[]}
            mapType="standard"
            accessibilityLabel="Map with events"
            accessibilityRole="image"
          >
            {filteredEvents
              .filter(
                (
                  event
                ): event is typeof event & {
                  coordinates: { latitude: number; longitude: number };
                } => !!event.coordinates
              )
              .map((event) => (
                <Marker
                  key={event.id}
                  coordinate={event.coordinates}
                  onPress={() => setSelectedEventId(event.id)}
                  accessibilityLabel={`Event marker: ${event.title}`}
                  accessibilityRole="button"
                >
                  <View style={styles.markerContainer}>
                    <View style={styles.markerWrapper}>
                      {/* Event thumbnail */}
                      <Image
                        source={{ uri: event.cover_image || event.image_url || 'https://via.placeholder.com/150/FF6B00/FFFFFF?text=' + encodeURIComponent(event.title.charAt(0)) }}
                        style={styles.markerImage}
                      />
                      {/* Participant avatars */}
                      <View style={styles.participantAvatars}>
                        {(event.participants || []).slice(0, 3).map((p, idx) => (
                          <Image
                            key={idx}
                            source={{ uri: p.avatar_url || `https://i.pravatar.cc/150?img=${idx}` }}
                            style={[styles.participantAvatar, { marginLeft: idx === 0 ? 0 : -8 }]}
                          />
                        ))}
                      </View>
                      {/* More count */}
                      {(event.participants_count || 0) > 3 && (
                        <View style={styles.moreCount}>
                          <Text style={styles.moreCountText}>+{(event.participants_count || 0) - 3} more</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Callout
                    onPress={() => router.push(`/screens/event-details?eventId=${event.id}`)}
                  >
                    <View style={styles.callout}>
                      <Text style={styles.calloutTitle}>{event.title}</Text>
                      <Text style={styles.calloutDate}>{event.date}</Text>
                      <Text style={styles.calloutLocation}>{event.location}</Text>
                    </View>
                  </Callout>
                </Marker>
              ))}
          </MapView>
        </View>
        {/* Bottom sheet with selected event */}
        {selectedEventId && (
          <View
            style={[
              styles.bottomSheet,
              {
                height: perfectSize(200),
                bottom: 0,
                paddingBottom: insets.bottom + perfectSize(8),
              },
            ]}
            accessibilityLabel="Event details"
            accessibilityRole="summary"
          >
            <View style={styles.sheetHandle} />
            {(() => {
              const selectedEvent = filteredEvents.find(e => e.id === selectedEventId);
              if (!selectedEvent) return null;
              
              return (
                <TouchableOpacity
                  style={styles.eventDetailsCard}
                  onPress={() => router.push(`/screens/event-details?eventId=${selectedEvent.id}`)}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: selectedEvent.cover_image || selectedEvent.image_url || 'https://via.placeholder.com/150/FF6B00/FFFFFF?text=' + encodeURIComponent(selectedEvent.title.charAt(0)) }}
                    style={styles.eventDetailsImage}
                  />
                  <View style={styles.eventDetailsContent}>
                    <Text style={styles.eventDetailsTitle}>{selectedEvent.title}</Text>
                    <Text style={styles.eventDetailsDate}>{selectedEvent.date}</Text>
                    <Text style={styles.eventDetailsLocation}>{selectedEvent.location}</Text>
                    <View style={styles.eventDetailsFooter}>
                      <View style={styles.eventDetailsAvatars}>
                        {(selectedEvent.participants || []).slice(0, 3).map((p, idx) => (
                          <Image
                            key={idx}
                            source={{ uri: p.avatar_url || `https://i.pravatar.cc/150?img=${idx}` }}
                            style={[styles.eventDetailsAvatar, { marginLeft: idx === 0 ? 0 : -8 }]}
                          />
                        ))}
                      </View>
                      <Text style={styles.eventDetailsGoing}>+{selectedEvent.participants_count || 0} going</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })()}
          </View>
        )}
        {/* Loading overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <Text>Loading events...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  headerWrapper: {
    paddingTop: perfectSize(0),
    paddingBottom: perfectSize(14),
    paddingHorizontal: perfectSize(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
  },
  headerIconLeft: {
    width: perfectSize(41),
    height: perfectSize(41),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    height: perfectSize(41),
    paddingHorizontal: perfectSize(80),
  },
  headerTitle: {
    fontSize: perfectSize(20),
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  headerIconsRight: {
    flexDirection: 'row',
    gap: perfectSize(8),
  },
  headerCircleButton: {
    width: perfectSize(41),
    height: perfectSize(41),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerNotificationWrapper: {
    position: 'relative',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: perfectSize(20),
    marginBottom: perfectSize(16),
    paddingHorizontal: perfectSize(16),
    paddingVertical: perfectSize(14),
    backgroundColor: '#F9F9F9',
    borderRadius: perfectSize(16),
  },
  searchIcon: {
    marginRight: perfectSize(8),
  },
  searchInput: {
    flex: 1,
    fontSize: perfectSize(16),
    color: '#000',
    paddingVertical: 0,
  },
  hero: {
    flex: 1,
    borderRadius: 0,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: perfectSize(24),
    borderTopRightRadius: perfectSize(24),
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 10,
    zIndex: 20,
    paddingTop: perfectSize(12),
  },
  sheetHandle: {
    width: perfectSize(40),
    height: perfectSize(4),
    backgroundColor: '#E5E5E5',
    borderRadius: perfectSize(2),
    alignSelf: 'center',
    marginBottom: perfectSize(12),
  },
  sheetScroll: {
    flex: 1,
    paddingHorizontal: perfectSize(16),
  },
  sheetScrollContent: {
    paddingBottom: perfectSize(16),
  },
  sectionTitle: {
    fontSize: perfectSize(18),
    fontWeight: '600',
    color: '#161616',
    marginBottom: perfectSize(8),
    marginLeft: perfectSize(16),
    marginTop: perfectSize(4),
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerWrapper: {
    alignItems: 'center',
  },
  markerImage: {
    width: perfectSize(100),
    height: perfectSize(100),
    borderRadius: perfectSize(12),
    backgroundColor: '#FF6B00',
  },
  participantAvatars: {
    flexDirection: 'row',
    marginTop: -perfectSize(15),
    backgroundColor: '#FFF',
    borderRadius: perfectSize(20),
    paddingHorizontal: perfectSize(4),
    paddingVertical: perfectSize(2),
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  participantAvatar: {
    width: perfectSize(28),
    height: perfectSize(28),
    borderRadius: perfectSize(14),
    borderWidth: 2,
    borderColor: '#FFF',
  },
  moreCount: {
    position: 'absolute',
    bottom: perfectSize(5),
    right: perfectSize(5),
    backgroundColor: '#FFF',
    borderRadius: perfectSize(12),
    paddingHorizontal: perfectSize(8),
    paddingVertical: perfectSize(4),
  },
  moreCountText: {
    fontSize: perfectSize(11),
    fontWeight: '600',
    color: '#333',
  },
  callout: {
    width: perfectSize(200),
    padding: perfectSize(12),
  },
  calloutTitle: {
    fontSize: perfectSize(16),
    fontWeight: '600',
    marginBottom: perfectSize(4),
  },
  calloutDate: {
    fontSize: perfectSize(14),
    color: '#666',
    marginBottom: perfectSize(2),
  },
  calloutLocation: {
    fontSize: perfectSize(13),
    color: '#888',
    marginBottom: perfectSize(8),
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    fontSize: perfectSize(16),
    marginTop: perfectSize(32),
  },
  eventDetailsCard: {
    flexDirection: 'row',
    padding: perfectSize(16),
    flex: 1,
  },
  eventDetailsImage: {
    width: perfectSize(120),
    height: perfectSize(120),
    borderRadius: perfectSize(16),
    backgroundColor: '#F5F5F5',
  },
  eventDetailsContent: {
    flex: 1,
    marginLeft: perfectSize(16),
    justifyContent: 'space-between',
  },
  eventDetailsTitle: {
    fontSize: perfectSize(20),
    fontWeight: '600',
    color: '#000',
    marginBottom: perfectSize(4),
  },
  eventDetailsDate: {
    fontSize: perfectSize(14),
    color: '#666',
    marginBottom: perfectSize(2),
  },
  eventDetailsLocation: {
    fontSize: perfectSize(14),
    color: '#666',
    marginBottom: perfectSize(12),
  },
  eventDetailsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventDetailsAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventDetailsAvatar: {
    width: perfectSize(32),
    height: perfectSize(32),
    borderRadius: perfectSize(16),
    borderWidth: 2,
    borderColor: '#FFF',
  },
  eventDetailsGoing: {
    fontSize: perfectSize(14),
    color: '#666',
    fontWeight: '500',
  },
  autocompleteContainer: {
    position: 'absolute',
    top: perfectSize(155),
    left: perfectSize(20),
    right: perfectSize(20),
    backgroundColor: '#FFF',
    borderRadius: perfectSize(12),
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 1000,
    maxHeight: perfectSize(400),
  },
  autocompleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: perfectSize(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cityIcon: {
    width: perfectSize(60),
    height: perfectSize(60),
    borderRadius: perfectSize(12),
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: perfectSize(12),
  },
  cityIconText: {
    fontSize: perfectSize(28),
  },
  eventThumbnail: {
    width: perfectSize(60),
    height: perfectSize(60),
    borderRadius: perfectSize(12),
    backgroundColor: '#F5F5F5',
    marginRight: perfectSize(12),
  },
  autocompleteContent: {
    flex: 1,
  },
  autocompleteTitle: {
    fontSize: perfectSize(16),
    fontWeight: '600',
    color: '#000',
    marginBottom: perfectSize(2),
  },
  autocompleteSubtitle: {
    fontSize: perfectSize(14),
    color: '#666',
  },
});

export default MapScreen;
