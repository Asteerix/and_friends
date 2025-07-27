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
  TextInput,
  Platform,
  Keyboard,
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { useEventsAdvanced } from '@/hooks/useEventsAdvanced';
import { useMapStore } from '@/store/mapStore';
import { TEMPLATES } from '@/features/events/data/eventTemplates';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ChatButtonIcon from '@/assets/svg/chat-button.svg';
import NotificationButtonIcon from '@/assets/svg/notification-button.svg';
import SearchIcon from '@/assets/svg/search.svg';
import BackButtonIcon from '@/assets/svg/back-button.svg';
import { useNotifications } from '@/shared/providers/NotificationProvider';
import ClusterModal from '../components/ClusterModal';
import { useSession } from '@/shared/providers/SessionContext';
import EventThumbnail from '@/shared/components/EventThumbnail';
import { EVENT_CATEGORIES } from '@/features/events/utils/categoryHelpers';
import { create } from 'react-native-pixel-perfect';
import NotificationBadge from '@/features/notifications/components/NotificationBadge';
import { getCountryFlag, getCityInfo } from '@/features/map/data/placesData';
import { getCityColor } from '@/features/map/data/cityColors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const designResolution = { width: 375, height: 812 };
const perfectSize = create(designResolution);

// Format date with French locale
export const formatEventDate = (date: string, startTime?: string): string => {
  try {
    const eventDate = new Date(date);
    const now = new Date();
    const isToday = eventDate.toDateString() === now.toDateString();
    const isTomorrow =
      eventDate.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();

    let dateStr;
    if (isToday) {
      dateStr = "Aujourd'hui";
    } else if (isTomorrow) {
      dateStr = 'Demain';
    } else {
      // Format: "Jeudi 25 janvier"
      dateStr = format(eventDate, 'EEEE d MMMM', { locale: fr });
      // Capitalize first letter
      dateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    }

    if (startTime) {
      return `${dateStr} à ${startTime}`;
    }
    return dateStr;
  } catch {
    return date;
  }
};

// Use categories from categoryHelpers with "All" as first option
const CATEGORIES = [
  { id: 'all', label: 'All', icon: '🌍' },
  ...EVENT_CATEGORIES.slice(0, 5) // Take first 5 categories for the tab bar
];

// Get template image by ID
const getTemplateImage = (templateId: string) => {
  for (const category of TEMPLATES) {
    const template = category.templates.find((t) => t.id === templateId);
    if (template) {
      return template.image;
    }
  }
  return null;
};

// Get category color
const getCategoryColor = (category?: string | null): string => {
  const colors: Record<string, string> = {
    nightlife: '#FF6B00',
    apartment: '#9B51E0',
    outdoor: '#16DB93',
    activities: '#F72585',
    cultural: '#007AFF',
    meetup: '#FF006E',
    casual: '#8338EC',
    dining: '#FB5607',
    entertainment: '#FFBE0B',
    party: '#FF6B00',
    wedding: '#F72585',
    seasonal: '#277DA1',
    sports: '#4ECDC4',
    corporate: '#003566',
    travel: '#06FFA5',
    wellness: '#7209B7',
    music: '#9B51E0',
    arts: '#F72585',
    food: '#FFD60A',
    gaming: '#3A86FF',
    social: '#7209B7',
    default: '#007AFF',
  };
  
  if (!category) return colors['default']!;
  
  const key = category.toLowerCase();
  return colors[key] || colors['default']!;
};

const MapScreenFixed = () => {
  console.log('🚀 [MapScreenFixed] Rendering');

  const router = useRouter();
  const { session } = useSession();
  const mapRef = useRef<MapView>(null);
  const { region, setRegion } = useMapStore();
  const { events, loading } = useEventsAdvanced();
  const { unreadCount } = useNotifications();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<any[]>([]);
  const [bottomSheetAnimation] = useState(new Animated.Value(0));
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);
  const [showClusterModal, setShowClusterModal] = useState(false);
  const [showAutoComplete, setShowAutoComplete] = useState(false);
  const [autoCompleteResults, setAutoCompleteResults] = useState<{
    events: any[];
    cities: { name: string; eventCount: number }[];
    countries: { name: string; eventCount: number }[];
  }>({ events: [], cities: [], countries: [] });
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  console.log('📊 [MapScreenFixed] State:', {
    eventsCount: events.length,
    loading,
    region,
  });

  const handleChat = () => {
    router.push('/screens/chat');
  };

  const handleNotif = () => {
    router.push('/screens/notifications');
  };

  // Get user location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          
          // Update map region to user location
          if (mapRef.current) {
            mapRef.current.animateToRegion({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }, 1000);
          }
        }
      } catch (error) {
        console.log('Error getting location:', error);
      }
    })();
  }, []);

  // Get user's current location (prefer real location over map center)
  const getUserLocation = () => {
    return userLocation || {
      latitude: region.latitude,
      longitude: region.longitude,
    };
  };

  // Calculate distance between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Get popular events near user
  const getPopularNearbyEvents = () => {
    const userLocation = getUserLocation();
    
    // Calculate events with distance and sort by participants
    const eventsWithDistance = eventsWithCoordinates.map(event => ({
      ...event,
      distance: calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        event.coordinates.latitude,
        event.coordinates.longitude
      )
    }));
    
    // Filter nearby events (within 50km) and sort by popularity
    return eventsWithDistance
      .filter(event => event.distance <= 50)
      .sort((a, b) => {
        // First sort by participant count (popularity)
        const countDiff = (b.participants_count || 0) - (a.participants_count || 0);
        if (countDiff !== 0) return countDiff;
        // Then by distance if same participant count
        return a.distance - b.distance;
      })
      .slice(0, 5); // Show top 5
  };

  // Get cities and countries that have events
  const getCitiesAndCountriesWithEvents = () => {
    const citiesMap = new Map<string, number>();
    const countriesMap = new Map<string, number>();
    
    eventsWithCoordinates.forEach(event => {
      if (event.location_details) {
        const { city, country } = event.location_details;
        if (city) {
          citiesMap.set(city, (citiesMap.get(city) || 0) + 1);
        }
        if (country) {
          countriesMap.set(country, (countriesMap.get(country) || 0) + 1);
        }
      }
    });
    
    // Sort by event count and return with counts
    const sortedCities = Array.from(citiesMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([city, count]) => ({ name: city, eventCount: count }));
    
    const sortedCountries = Array.from(countriesMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([country, count]) => ({ name: country, eventCount: count }));
    
    return { cities: sortedCities, countries: sortedCountries };
  };

  // Enhanced search functionality for cities, countries, and events
  const handleSearch = (text: string) => {
    setSearch(text);
    
    if (text.trim().length > 0) {
      // Generate autocomplete results for search query
      const query = text.toLowerCase().trim();
      
      // Search ALL events for autocomplete
      const matchingEvents = events.filter(event => {
        if (!event.title) return false;
        
        // Search in title
        if (event.title.toLowerCase().includes(query)) return true;
        
        // Search in description
        if (event.description && event.description.toLowerCase().includes(query)) return true;
        
        // Search in location
        if (event.location && event.location.toLowerCase().includes(query)) return true;
        
        // Search in location details
        if (event.location_details) {
          const { name, address, city } = event.location_details;
          if (name && name.toLowerCase().includes(query)) return true;
          if (address && address.toLowerCase().includes(query)) return true;
          if (city && city.toLowerCase().includes(query)) return true;
        }
        
        return false;
      }).map(event => {
        // Add coordinates if available for distance calculation
        const eventWithCoords = eventsWithCoordinates.find(e => e.id === event.id);
        if (eventWithCoords) {
          const userLoc = getUserLocation();
          return {
            ...event,
            coordinates: eventWithCoords.coordinates,
            distance: calculateDistance(
              userLoc.latitude,
              userLoc.longitude,
              eventWithCoords.coordinates.latitude,
              eventWithCoords.coordinates.longitude
            )
          };
        }
        // Return event even without coordinates for search results
        return {
          ...event,
          distance: undefined
        };
      }).slice(0, 5);
      
      // Get cities and countries with events
      const { cities: allCities, countries: allCountries } = getCitiesAndCountriesWithEvents();
      
      // Filter cities and countries by query
      const matchingCities = allCities.filter(city => 
        city.name.toLowerCase().includes(query)
      ).slice(0, 3);
      
      const matchingCountries = allCountries.filter(country => 
        country.name.toLowerCase().includes(query)
      ).slice(0, 3);
      
      setAutoCompleteResults({
        events: matchingEvents,
        cities: matchingCities,
        countries: matchingCountries,
      });
      
      setShowAutoComplete(true);
    } else {
      // Show popular nearby events when search is empty
      const popularEvents = getPopularNearbyEvents();
      const { cities, countries } = getCitiesAndCountriesWithEvents();
      
      // If no nearby events, show any events
      const eventsToShow = popularEvents.length > 0 ? popularEvents : events.slice(0, 5).map(event => {
        const eventWithCoords = eventsWithCoordinates.find(e => e.id === event.id);
        if (eventWithCoords) {
          const userLoc = getUserLocation();
          return {
            ...event,
            coordinates: eventWithCoords.coordinates,
            distance: calculateDistance(
              userLoc.latitude,
              userLoc.longitude,
              eventWithCoords.coordinates.latitude,
              eventWithCoords.coordinates.longitude
            )
          };
        }
        return { ...event, distance: undefined };
      });
      
      setAutoCompleteResults({
        events: eventsToShow,
        cities: cities.slice(0, 3),
        countries: countries.slice(0, 2),
      });
      
      setShowAutoComplete(true);
    }
  };

  // Handle autocomplete selection
  const handleAutoCompleteSelect = (type: 'event' | 'city' | 'country', value: any) => {
    Keyboard.dismiss();
    
    if (type === 'event') {
      setSearch(value.title);
      setSelectedEventId(value.id);
      // Zoom to event
      if (mapRef.current && value.coordinates) {
        mapRef.current.animateToRegion({
          latitude: value.coordinates.latitude,
          longitude: value.coordinates.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 500);
      }
    } else {
      setSearch(value);
    }
    setShowAutoComplete(false);
  };

  // Filter events with coordinates
  const eventsWithCoordinates = useMemo(() => {
    if (!events || !Array.isArray(events)) return [];
    
    return events
      .filter((event) => {
        // Check location_details first
        if (event.location_details?.coordinates) {
          return true;
        }
        // Then check location string
        const location = event.location;
        if (location && typeof location === 'string') {
          const coords = location.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
          return coords && coords[1] && coords[2];
        }
        return false;
      })
      .map((event) => {
        let coordinates = null;
        if (event.location_details?.coordinates) {
          coordinates = {
            latitude: event.location_details.coordinates.latitude,
            longitude: event.location_details.coordinates.longitude,
          };
        } else {
          const location = event.location;
          if (location && typeof location === 'string') {
            const coords = location.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
            if (coords && coords[1] && coords[2]) {
              coordinates = {
                latitude: parseFloat(coords[1]),
                longitude: parseFloat(coords[2]),
              };
            }
          }
        }

        if (coordinates) {
          return {
            ...event,
            coordinates,
          };
        }
        return null;
      })
      .filter((event): event is any => event !== null);
  }, [events]);

  console.log('📍 [MapScreenFixed] Events with coordinates:', eventsWithCoordinates.length);

  // Filter events by search query (events, cities, countries)
  const searchFilteredEvents = useMemo(() => {
    if (!search.trim()) return eventsWithCoordinates;
    
    const query = search.toLowerCase().trim();
    
    return eventsWithCoordinates.filter(event => {
      // Search in event title
      if (event.title && event.title.toLowerCase().includes(query)) return true;
      
      // Search in location details
      if (event.location_details) {
        const { address, name, city, country } = event.location_details;
        if (name && name.toLowerCase().includes(query)) return true;
        if (address && address.toLowerCase().includes(query)) return true;
        if (city && city.toLowerCase().includes(query)) return true;
        if (country && country.toLowerCase().includes(query)) return true;
      }
      
      // Search in location string
      if (event.location && event.location.toLowerCase().includes(query)) return true;
      
      // Search in description
      if (event.description && event.description.toLowerCase().includes(query)) return true;
      
      return false;
    });
  }, [search, eventsWithCoordinates]);

  // Filter by category and search (same logic as HomeScreen)
  const filteredEvents = useMemo(() => {
    // First apply search filter
    const searchFiltered = searchFilteredEvents;
    
    // Then apply category filter
    if (activeCategory === 0) return searchFiltered; // Show all
    
    const selectedCategory = CATEGORIES[activeCategory];
    if (!selectedCategory) return searchFiltered;
    
    return searchFiltered.filter(event => {
      // Match by category ID directly (same as HomeScreen)
      return event.event_category === selectedCategory.id;
    });
  }, [activeCategory, searchFilteredEvents]);

  // Center map on search results
  useEffect(() => {
    if (searchFilteredEvents.length > 0 && mapRef.current && search.trim()) {
      // Calculate bounds for all filtered events
      const coordinates = searchFilteredEvents.map(e => e.coordinates);
      
      if (coordinates.length === 1) {
        // Single result - zoom in on it
        const coord = coordinates[0];
        mapRef.current.animateToRegion({
          latitude: coord.latitude,
          longitude: coord.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 500);
      } else if (coordinates.length > 1) {
        // Multiple results - fit all markers
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 200, left: 50 },
          animated: true,
        });
      }
    }
  }, [searchFilteredEvents, search]);

  // Calculate if we should cluster based on zoom level
  const shouldCluster = (latitudeDelta: number): boolean => {
    return latitudeDelta > 0.002; // Only cluster when zoomed out enough
  };

  // Convert lat/lng to screen pixels
  const latLngToScreen = (lat: number, lng: number) => {
    const x =
      ((lng - region.longitude + region.longitudeDelta / 2) / region.longitudeDelta) * SCREEN_WIDTH;
    const y =
      ((region.latitude + region.latitudeDelta / 2 - lat) / region.latitudeDelta) * SCREEN_WIDTH;
    return { x, y };
  };

  // Group nearby events based on screen distance
  const groupedEvents = useMemo(() => {
    if (!shouldCluster(region.latitudeDelta)) {
      // When zoomed in, show all markers individually
      const individualGroups = new Map();
      filteredEvents.forEach((event) => {
        const key = `${event.id}`;
        individualGroups.set(key, [event]);
      });
      return individualGroups;
    }

    const groups: Map<string, any[]> = new Map();
    const processed = new Set<string>();

    // Cluster radius in screen pixels
    const pixelRadius = 60;

    filteredEvents.forEach((event) => {
      if (processed.has(event.id)) return;

      if (!event.coordinates) return;
      const eventScreen = latLngToScreen(event.coordinates.latitude, event.coordinates.longitude);
      const cluster = [event];
      processed.add(event.id);

      // Find all events within pixel radius
      filteredEvents.forEach((otherEvent) => {
        if (processed.has(otherEvent.id)) return;

        if (!otherEvent.coordinates) return;
        const otherScreen = latLngToScreen(
          otherEvent.coordinates.latitude,
          otherEvent.coordinates.longitude
        );
        const screenDistance = Math.sqrt(
          Math.pow(eventScreen.x - otherScreen.x, 2) + Math.pow(eventScreen.y - otherScreen.y, 2)
        );

        if (screenDistance <= pixelRadius) {
          cluster.push(otherEvent);
          processed.add(otherEvent.id);
        }
      });

      if (cluster.length === 1) {
        // Single event, use its ID as key
        groups.set(event.id, cluster);
      } else {
        // Multiple events, create cluster key
        const centerLat =
          cluster.reduce((sum, e) => sum + (e.coordinates?.latitude || 0), 0) / cluster.length;
        const centerLng =
          cluster.reduce((sum, e) => sum + (e.coordinates?.longitude || 0), 0) / cluster.length;
        const key = `cluster-${centerLat.toFixed(6)}-${centerLng.toFixed(6)}`;
        groups.set(key, cluster);
      }
    });

    return groups;
  }, [filteredEvents, region, shouldCluster]);

  // Center map on events when loaded
  useEffect(() => {
    if (eventsWithCoordinates.length > 0 && mapRef.current) {
      console.log('🎯 [MapScreenFixed] Centering map on events');

      if (eventsWithCoordinates.length === 1) {
        const event = eventsWithCoordinates[0];
        if (event && event.coordinates) {
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
    }
  }, [eventsWithCoordinates]);

  const selectedEvent = selectedEventId
    ? filteredEvents.find((e) => e.id === selectedEventId)
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

  const renderClusterMarker = (key: string, events: any[]) => {
    // Calculate cluster center
    const centerLat = events.reduce((sum, e) => sum + e.coordinates.latitude, 0) / events.length;
    const centerLng = events.reduce((sum, e) => sum + e.coordinates.longitude, 0) / events.length;
    const isSelected = selectedCluster.length > 0 && selectedCluster === events;

    return (
      <Marker
        key={`cluster-${key}`}
        coordinate={{ latitude: centerLat, longitude: centerLng }}
        onPress={() => {
          setSelectedCluster(events);
          setShowClusterModal(true);
        }}
        tracksViewChanges={false}
        zIndex={isSelected ? 999 : 1}
      >
        <View style={[styles.clusterContainer, isSelected && styles.selectedMarker]}>
          <View style={styles.clusterImagesContainer}>
            {/* Show count overlay for more than 3 events */}
            {events.length > 3 && (
              <View style={styles.clusterCountOverlay}>
                <Text style={styles.clusterCountText}>+{events.length - 3}</Text>
              </View>
            )}
            <View style={styles.clusterMainImage}>
              {(() => {
                const mainEvent = events[0];
                let imageSource = null;
                let imageUri = null;

                if (mainEvent.extra_data?.coverData?.selectedTemplate?.id) {
                  imageSource = getTemplateImage(
                    mainEvent.extra_data.coverData.selectedTemplate.id
                  );
                }

                if (!imageSource) {
                  const coverImage =
                    mainEvent.extra_data?.coverData?.coverImage ||
                    mainEvent.extra_data?.coverData?.uploadedImage;
                  if (coverImage && coverImage !== '') {
                    imageUri = coverImage;
                  }
                }

                const category =
                  mainEvent.event_category || mainEvent.extra_data?.eventCategory || 'social';

                return imageSource ? (
                  <Image source={imageSource} style={styles.clusterImageInner} />
                ) : imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.clusterImageInner} />
                ) : (
                  <View
                    style={[
                      styles.clusterImageInner,
                      {
                        backgroundColor: getCategoryColor(category),
                        justifyContent: 'center',
                        alignItems: 'center',
                      },
                    ]}
                  >
                    <Text style={styles.clusterImageText}>
                      {mainEvent.title.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                );
              })()}
            </View>
            {events.slice(1, 3).map((event, index) => {
              let imageSource = null;
              let imageUri = null;

              if (event.extra_data?.coverData?.selectedTemplate?.id) {
                imageSource = getTemplateImage(event.extra_data.coverData.selectedTemplate.id);
              }

              if (!imageSource) {
                const coverImage =
                  event.extra_data?.coverData?.coverImage ||
                  event.extra_data?.coverData?.uploadedImage;
                if (coverImage && coverImage !== '') {
                  imageUri = coverImage;
                }
              }

              const category = event.event_category || event.extra_data?.eventCategory || 'social';

              return (
                <View
                  key={event.id}
                  style={[
                    styles.clusterSmallImage,
                    {
                      position: 'absolute',
                      bottom: -2,
                      right: -5 - index * 12,
                      zIndex: 3 - index,
                    },
                  ]}
                >
                  {imageSource ? (
                    <Image source={imageSource} style={styles.clusterImageInner} />
                  ) : imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.clusterImageInner} />
                  ) : (
                    <View
                      style={[
                        styles.clusterImageInner,
                        {
                          backgroundColor: getCategoryColor(category),
                          justifyContent: 'center',
                          alignItems: 'center',
                        },
                      ]}
                    >
                      <Text style={styles.clusterImageText}>
                        {event.title.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
          <View style={styles.markerLabelContainer}>
            <Text style={styles.markerTitle} numberOfLines={1}>
              {events.length} événements
            </Text>
            <Text style={styles.markerSubtitle}>Toucher pour détails</Text>
          </View>
        </View>
      </Marker>
    );
  };

  const renderEventMarker = (event: any) => {
    const isSelected = selectedEventId === event.id;

    // Check for template image
    let imageSource = null;
    let imageUri = null;

    if (event.extra_data?.coverData?.selectedTemplate?.id) {
      imageSource = getTemplateImage(event.extra_data.coverData.selectedTemplate.id);
    }

    if (!imageSource) {
      const coverImage =
        event.extra_data?.coverData?.coverImage || event.extra_data?.coverData?.uploadedImage;
      if (coverImage && coverImage !== '') {
        imageUri = coverImage;
      }
    }

    const category = event.event_category || event.extra_data?.eventCategory || 'social';

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
            <View
              style={[
                styles.markerImage,
                {
                  backgroundColor: getCategoryColor(category),
                  justifyContent: 'center',
                  alignItems: 'center',
                },
              ]}
            >
              <Text style={styles.markerPlaceholderText}>
                {event.title.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.markerLabelContainer}>
            <Text style={styles.markerTitle} numberOfLines={1}>
              {event.title}
            </Text>
            <Text style={styles.markerSubtitle} numberOfLines={1}>
              {event.participants_count || 1} participant
              {(event.participants_count || 1) > 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </Marker>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtnMinimal}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <BackButtonIcon width={perfectSize(24)} height={perfectSize(24)} />
        </TouchableOpacity>
        <View style={styles.headerTitleAbsolute} pointerEvents="none">
          <Text style={styles.headerTitle} accessibilityRole="header">
            Map
          </Text>
        </View>
        <View style={styles.iconsRow}>
          <TouchableOpacity
            onPress={handleChat}
            accessibilityLabel="Open chat"
            accessibilityRole="button"
            style={styles.iconBtn}
          >
            <ChatButtonIcon width={perfectSize(40)} height={perfectSize(40)} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleNotif}
            accessibilityLabel="Open notifications"
            accessibilityRole="button"
            style={styles.iconBtn}
          >
            <NotificationButtonIcon width={perfectSize(40)} height={perfectSize(40)} />
            <NotificationBadge count={unreadCount} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <SearchIcon width={perfectSize(22)} height={perfectSize(22)} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events, cities, or countries..."
            placeholderTextColor="#8E8E93"
            value={search}
            onChangeText={handleSearch}
            onFocus={() => {
              if (search.trim().length === 0) {
                handleSearch(''); // Show popular suggestions
              } else {
                setShowAutoComplete(true);
              }
            }}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearch('');
                setShowAutoComplete(false);
                Keyboard.dismiss();
              }}
              style={styles.clearButton}
            >
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Autocomplete dropdown */}
        {showAutoComplete && (
          <View style={styles.autocompleteContainer}>
            <ScrollView 
              style={styles.autocompleteScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Events */}
              {autoCompleteResults.events.length > 0 && (
                <>
                  <Text style={styles.autocompleteSection}>
                    {search.trim() ? 'Events' : 'Popular Nearby'}
                  </Text>
                  {autoCompleteResults.events.map((event) => (
                    <View key={event.id} style={styles.autocompleteEventContainer}>
                      <EventThumbnail
                        event={event}
                        onPress={() => handleAutoCompleteSelect('event', event)}
                        currentUserId={session?.user?.id}
                        style={styles.autocompleteEventThumbnail}
                      />
                      {event.distance !== undefined && (
                        <View style={styles.autocompleteDistanceBadge}>
                          <Text style={styles.autocompleteDistanceText}>
                            {event.distance < 1 
                              ? `${Math.round(event.distance * 1000)}m`
                              : `${event.distance.toFixed(1)}km`}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </>
              )}
              
              {/* Cities */}
              {autoCompleteResults.cities.length > 0 && (
                <>
                  <Text style={styles.autocompleteSection}>
                    {search.trim() ? 'Cities' : 'Top Cities'}
                  </Text>
                  {autoCompleteResults.cities.map((city, index) => {
                    const cityInfo = getCityInfo(city.name);
                    return (
                      <TouchableOpacity
                        key={`city-${index}`}
                        style={styles.autocompleteCityItem}
                        onPress={() => handleAutoCompleteSelect('city', city.name)}
                      >
                        <View style={styles.autocompleteItem}>
                          <View style={[styles.autocompleteCityImageContainer, { backgroundColor: getCityColor(city.name) }]}>
                            <Text style={styles.autocompleteCityInitial}>
                              {city.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.autocompleteCityContent}>
                            <View style={styles.autocompleteCityHeader}>
                              <Text style={styles.autocompleteCityName}>{city.name}</Text>
                              {cityInfo && (
                                <Text style={styles.autocompleteCityFlag}>{cityInfo.flag}</Text>
                              )}
                            </View>
                            <View style={styles.autocompleteCityMeta}>
                              {cityInfo && (
                                <Text style={styles.autocompleteCityCountry}>
                                  {cityInfo.country}
                                </Text>
                              )}
                              <View style={styles.autocompleteCityEventBadge}>
                                <Text style={styles.autocompleteCityEventCount}>
                                  {city.eventCount} event{city.eventCount > 1 ? 's' : ''}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}
              
              {/* Countries */}
              {autoCompleteResults.countries.length > 0 && (
                <>
                  <Text style={styles.autocompleteSection}>Countries</Text>
                  {autoCompleteResults.countries.map((country, index) => (
                    <TouchableOpacity
                      key={`country-${index}`}
                      style={styles.autocompleteCountryItem}
                      onPress={() => handleAutoCompleteSelect('country', country.name)}
                    >
                      <View style={styles.autocompleteItem}>
                        <View style={styles.autocompleteCountryFlagContainer}>
                          <Text style={styles.autocompleteCountryFlag}>{getCountryFlag(country.name)}</Text>
                        </View>
                        <View style={styles.autocompleteCountryContent}>
                          <Text style={styles.autocompleteCountryName}>{country.name}</Text>
                          <View style={styles.autocompleteCountryEventBadge}>
                            <Text style={styles.autocompleteCountryEventCount}>
                              {country.eventCount} event{country.eventCount > 1 ? 's' : ''}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
              
              {autoCompleteResults.events.length === 0 && 
               autoCompleteResults.cities.length === 0 && 
               autoCompleteResults.countries.length === 0 && (
                <View style={styles.noResultsContainer}>
                  <Text style={styles.noResultsIcon}>🔍</Text>
                  <Text style={styles.noResults}>No results found{search.trim() ? ` for "${search}"` : ''}</Text>
                  <Text style={styles.noResultsSubtext}>Try searching for a different event, city, or country</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Category Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {CATEGORIES.map((category, index) => (
            <TouchableOpacity
              key={category.id}
              style={[styles.tab, activeCategory === index && styles.activeTab]}
              onPress={() => setActiveCategory(index)}
            >
              <Text style={[styles.tabText, activeCategory === index && styles.activeTabText]}>
                {category.label}
              </Text>
              {activeCategory === index && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        onRegionChangeComplete={(newRegion) => {
          setRegion(newRegion);
          console.log('🗺️ [MapScreenFixed] Region changed:', {
            latitudeDelta: newRegion.latitudeDelta,
            shouldCluster: shouldCluster(newRegion.latitudeDelta),
          });
        }}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={true}
        showsMyLocationButton={true}
        zoomEnabled={true}
        pitchEnabled={false}
        rotateEnabled={false}
        scrollEnabled={true}
        mapPadding={{ top: 0, right: 0, bottom: 100, left: 0 }}
        onPress={() => setShowAutoComplete(false)}
      >
        {Array.from(groupedEvents.entries()).map(([key, events]) => {
          if (events.length === 1) {
            return renderEventMarker(events[0]);
          } else {
            // Render cluster for multiple events at same location
            return renderClusterMarker(key, events);
          }
        })}
      </MapView>

      {selectedEvent && (
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              transform: [
                {
                  translateY: bottomSheetAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0],
                  }),
                },
              ],
              opacity: bottomSheetAnimation,
            },
          ]}
        >
          <EventThumbnail
            event={selectedEvent}
            onPress={() => router.push(`/event/${selectedEvent.id}`)}
            currentUserId={session?.user?.id}
            style={styles.bottomSheetContent}
          />
        </Animated.View>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}

      {/* Cluster Modal */}
      <ClusterModal
        visible={showClusterModal}
        events={selectedCluster}
        onClose={() => setShowClusterModal(false)}
        onSelectEvent={(eventId) => {
          setSelectedEventId(eventId);
        }}
        currentUserId={session?.user?.id}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: perfectSize(16),
    marginTop: perfectSize(8),
    height: perfectSize(56),
    position: 'relative',
  },
  headerTitleAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  headerTitle: {
    fontSize: perfectSize(22),
    color: '#222',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
    }),
    fontWeight: '400',
    textAlign: 'center',
  },
  iconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    marginLeft: perfectSize(12),
    position: 'relative',
  },
  backBtnMinimal: {
    width: perfectSize(40),
    height: perfectSize(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: perfectSize(20),
    paddingTop: perfectSize(12),
    paddingBottom: perfectSize(12),
    zIndex: 999,
  },
  searchBar: {
    height: perfectSize(48),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: perfectSize(24),
    paddingHorizontal: perfectSize(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  searchIcon: {
    opacity: 0.5,
    marginRight: perfectSize(2),
  },
  searchInput: {
    flex: 1,
    marginLeft: perfectSize(12),
    fontSize: perfectSize(16),
    color: '#1C1C1E',
    fontWeight: '500',
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'System',
    }),
    letterSpacing: -0.3,
  },
  clearButton: {
    padding: perfectSize(8),
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: perfectSize(14),
    marginLeft: perfectSize(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  clearButtonText: {
    fontSize: perfectSize(14),
    color: '#3C3C43',
    fontWeight: '700',
  },
  autocompleteContainer: {
    position: 'absolute',
    top: perfectSize(56),
    left: -perfectSize(4),
    right: -perfectSize(4),
    backgroundColor: '#FFFFFF',
    borderRadius: perfectSize(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 16,
    maxHeight: perfectSize(420),
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    overflow: 'hidden',
  },
  autocompleteScroll: {
    padding: perfectSize(16),
    paddingTop: perfectSize(8),
  },
  autocompleteSection: {
    fontSize: perfectSize(13),
    fontWeight: '700',
    color: '#8E8E93',
    marginTop: perfectSize(20),
    marginBottom: perfectSize(12),
    marginLeft: perfectSize(16),
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    opacity: 0.8,
  },
  autocompleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: perfectSize(14),
    paddingHorizontal: perfectSize(16),
    borderRadius: perfectSize(12),
    backgroundColor: '#F8F9FB',
  },
  autocompleteEventContainer: {
    marginBottom: perfectSize(12),
    position: 'relative',
  },
  autocompleteEventThumbnail: {
    borderRadius: perfectSize(16),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  autocompleteDistanceBadge: {
    position: 'absolute',
    top: perfectSize(12),
    right: perfectSize(12),
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: perfectSize(12),
    paddingVertical: perfectSize(6),
    borderRadius: perfectSize(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  autocompleteDistanceText: {
    fontSize: perfectSize(13),
    fontWeight: '700',
    color: '#007AFF',
  },
  autocompleteCityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: perfectSize(8),
  },
  autocompleteCityImageContainer: {
    width: perfectSize(56),
    height: perfectSize(56),
    borderRadius: perfectSize(14),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: perfectSize(14),
  },
  autocompleteCityInitial: {
    fontSize: perfectSize(24),
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  autocompleteCityContent: {
    flex: 1,
  },
  autocompleteCityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: perfectSize(4),
  },
  autocompleteCityName: {
    fontSize: perfectSize(17),
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.4,
  },
  autocompleteCityFlag: {
    fontSize: perfectSize(20),
    marginLeft: perfectSize(8),
  },
  autocompleteCityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  autocompleteCityCountry: {
    fontSize: perfectSize(14),
    color: '#8E8E93',
    fontWeight: '500',
    marginRight: perfectSize(8),
  },
  autocompleteCityEventBadge: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: perfectSize(10),
    paddingVertical: perfectSize(4),
    borderRadius: perfectSize(8),
  },
  autocompleteCityEventCount: {
    fontSize: perfectSize(13),
    color: '#007AFF',
    fontWeight: '600',
  },
  autocompleteCountryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: perfectSize(8),
  },
  autocompleteCountryFlagContainer: {
    width: perfectSize(56),
    height: perfectSize(56),
    borderRadius: perfectSize(28),
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: perfectSize(14),
  },
  autocompleteCountryFlag: {
    fontSize: perfectSize(32),
  },
  autocompleteCountryContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  autocompleteCountryName: {
    fontSize: perfectSize(17),
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.4,
    flex: 1,
  },
  autocompleteCountryEventBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    paddingHorizontal: perfectSize(10),
    paddingVertical: perfectSize(4),
    borderRadius: perfectSize(8),
    marginLeft: perfectSize(8),
  },
  autocompleteCountryEventCount: {
    fontSize: perfectSize(13),
    color: '#34C759',
    fontWeight: '600',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: perfectSize(32),
  },
  noResultsIcon: {
    fontSize: perfectSize(48),
    marginBottom: perfectSize(12),
    opacity: 0.5,
  },
  noResults: {
    textAlign: 'center',
    color: '#1C1C1E',
    fontSize: perfectSize(16),
    fontWeight: '600',
    marginBottom: perfectSize(8),
  },
  noResultsSubtext: {
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: perfectSize(14),
    paddingHorizontal: perfectSize(32),
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tabsContent: {
    paddingHorizontal: perfectSize(20),
  },
  tab: {
    paddingHorizontal: perfectSize(16),
    paddingVertical: perfectSize(12),
    marginRight: perfectSize(8),
    position: 'relative',
  },
  activeTab: {
    // Active styles applied via tabText and tabIndicator
  },
  tabText: {
    fontSize: perfectSize(15),
    color: '#8E8E93',
    fontWeight: '500',
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'System',
    }),
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#007AFF',
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
  bottomSheetContent: {
    padding: 16,
    marginBottom: 0,
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
  clusterContainer: {
    alignItems: 'center',
  },
  clusterImagesContainer: {
    width: 60,
    height: 60,
    marginBottom: 6,
    position: 'relative',
  },
  clusterMainImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#fff',
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  clusterSmallImage: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  clusterImageInner: {
    width: '100%',
    height: '100%',
  },
  clusterImageText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  clusterCountOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 10,
  },
  clusterCountText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});

export default MapScreenFixed;
