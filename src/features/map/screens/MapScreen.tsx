import React from 'react';
import { useRef, useState, useCallback, useEffect, useMemo } from 'react';

console.log('🚀 [MapScreen] File loaded');
console.log('🔍 [MapScreen] React:', typeof React);
console.log('🔍 [MapScreen] useRef:', typeof useRef);
console.log('🔍 [MapScreen] useState:', typeof useState);
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  SafeAreaView,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { create } from 'react-native-pixel-perfect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { useNetworkQuality } from '@/shared/hooks/useNetworkQuality';
// import { useTranslation } from 'react-i18next';

import CategoryTabs from '@/features/home/components/CategoryTabs';
import { useEventsAdvanced } from '@/hooks/useEventsAdvanced';
import { useMapStore } from '@/store/mapStore';
import ChatButton from '@/assets/svg/chat-button.svg';
import NotificationButton from '@/assets/svg/notification-button.svg';
import SearchIcon from '@/assets/svg/search.svg';
import NotificationBadge from '@/features/notifications/components/NotificationBadge';
import { useNotifications } from '@/shared/providers/NotificationProvider';
import { EVENT_CATEGORIES } from '@/features/events/utils/categoryHelpers';
import { useProfile } from '@/hooks/useProfile';
import { clusterPoints, getClusterZoom, type ClusterPoint, type Cluster } from '../utils/clustering';
import { TEMPLATES } from '@/features/events/data/eventTemplates';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const designResolution = { width: 375, height: 812 };
const perfectSize = create(designResolution);

const getCategories = (t: any) => [
  { id: 'all', label: t ? t('common.all') : 'All' },
  { id: 'sports', label: 'Sports' },
  { id: 'music', label: 'Music' },
  { id: 'art', label: 'Arts' },
];

const getCategoryColor = (category?: string): string => {
  const colors: { [key: string]: string } = {
    'party': '#FF6B00',
    'music': '#9B51E0',
    'sports': '#16DB93',
    'food': '#E71D36',
    'art': '#2EC4B6',
    'tech': '#011627',
    'social': '#F77F00',
    'education': '#3A86FF',
    'outdoor': '#06FFA5',
    'default': '#FF6B00',
  };
  return colors[category || 'default'] || colors.default;
};

const getCategoryEmoji = (category?: string): string => {
  const emojis: { [key: string]: string } = {
    'party': '🎉',
    'music': '🎵',
    'sports': '⚽',
    'food': '🍴',
    'art': '🎨',
    'tech': '💻',
    'social': '👥',
    'education': '📚',
    'outdoor': '🏕️',
    'default': '📍',
  };
  return emojis[category || 'default'] || emojis.default;
};

const formatEventDate = (date: string, time?: string): string => {
  try {
    const eventDate = new Date(date);
    const dateStr = format(eventDate, 'MMM d');
    if (time) {
      return `${dateStr}, ${time}`;
    }
    return dateStr;
  } catch {
    return date;
  }
};

const getLocationName = (location: any): string => {
  if (typeof location === 'object' && location?.name) {
    return location.name;
  }
  if (typeof location === 'string') {
    const parts = location.split(',');
    if (parts.length > 2) {
      return parts.slice(2).join(',').trim();
    }
    return location;
  }
  return 'Unknown Location';
};

const getTemplateImage = (templateId: string) => {
  for (const category of TEMPLATES) {
    const template = category.templates.find(t => t.id === templateId);
    if (template) {
      return template.image;
    }
  }
  return null;
};

const MapScreen: React.FC = () => {
  console.log('🏁 [MapScreen] Component rendering started');
  
  try {
    const router = useRouter();
    console.log('✅ [MapScreen] Router loaded');
    
    // Temporarily disable translation to debug the map
    const t = (key: string) => {
      const translations: { [key: string]: string } = {
        'common.all': 'All',
      };
      return translations[key] || key;
    };
    console.log('✅ [MapScreen] Translation function created');
    
    let mapRef: any;
    try {
      mapRef = useRef<MapView>(null);
      console.log('✅ [MapScreen] MapRef created');
    } catch (error) {
      console.error('❌ [MapScreen] MapRef error:', error);
      mapRef = { current: null };
    }
    
    let region, setRegion;
    try {
      const mapStore = useMapStore();
      region = mapStore.region;
      setRegion = mapStore.setRegion;
      console.log('✅ [MapScreen] MapStore loaded', { region });
    } catch (error) {
      console.error('❌ [MapScreen] MapStore error:', error);
      region = { latitude: 48.8566, longitude: 2.3522, latitudeDelta: 0.1, longitudeDelta: 0.1 };
      setRegion = () => {};
    }
    
    let events = [], loading = false;
    try {
      const eventsData = useEventsAdvanced();
      events = eventsData.events || [];
      loading = eventsData.loading || false;
      console.log('✅ [MapScreen] Events loaded:', events.length);
    } catch (error) {
      console.error('❌ [MapScreen] Events error:', error);
    }
    
    let profile = null;
    try {
      const profileData = useProfile();
      profile = profileData.profile;
      console.log('✅ [MapScreen] Profile loaded');
    } catch (error) {
      console.error('❌ [MapScreen] Profile error:', error);
    }
  
  console.log('🔄 [MapScreen] Component state:', {
    eventsCount: events.length,
    loading,
    hasProfile: !!profile,
    currentRegion: region
  });
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [bottomSheetAnimation] = useState(new Animated.Value(0));
  
  const CATEGORIES = getCategories(t);
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState('');
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotifications();
  const { isOffline, isSlowConnection } = useNetworkQuality();

  const getUserLocationCoordinates = useCallback(() => {
    if (!profile?.location) return null;
    
    const location = profile.location;
    const coords = location.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
    if (coords && coords[1] && coords[2]) {
      return {
        latitude: parseFloat(coords[1]),
        longitude: parseFloat(coords[2]),
      };
    }
    
    const cityCoordinates: { [key: string]: { latitude: number; longitude: number } } = {
      'paris': { latitude: 48.8566, longitude: 2.3522 },
      'new york': { latitude: 40.7128, longitude: -74.0060 },
      'london': { latitude: 51.5074, longitude: -0.1278 },
      'tokyo': { latitude: 35.6762, longitude: 139.6503 },
    };
    
    const locationLower = location.toLowerCase();
    for (const [city, coords] of Object.entries(cityCoordinates)) {
      if (locationLower.includes(city)) {
        return coords;
      }
    }
    
    return null;
  }, [profile]);

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

  useEffect(() => {
    if (selectedEventId) {
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
  }, [selectedEventId, bottomSheetAnimation]);

  const getCoordinates = (event: any) => {
    if (event.location_details?.coordinates) {
      return {
        latitude: event.location_details.coordinates.latitude,
        longitude: event.location_details.coordinates.longitude,
      };
    }
    
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
    
    return null;
  };

  const eventsWithCoordinates = useMemo(() => {
    console.log('🗺️ [MapScreen] Processing events:', events.length);
    
    const processed = events
      .map((event) => {
        const coords = getCoordinates(event);
        console.log('📍 [MapScreen] Event:', {
          id: event.id,
          title: event.title,
          hasCoords: !!coords,
          location: event.location,
          coverImage: event.extra_data?.coverData?.coverImage,
          uploadedImage: event.extra_data?.coverData?.uploadedImage,
          oldCoverImage: event.cover_image,
          imageUrl: event.image_url,
          extraData: event.extra_data
        });
        return {
          ...event,
          coordinates: coords,
        };
      })
      .filter((event) => event.coordinates !== null);
    
    console.log('✅ [MapScreen] Events with coordinates:', processed.length);
    return processed;
  }, [events]);

  // Center map on events when they are loaded
  useEffect(() => {
    if (eventsWithCoordinates.length > 0 && mapRef.current) {
      console.log('🎯 [MapScreen] Centering map on events:', eventsWithCoordinates.length);
      
      // If there's only one event, center on it
      if (eventsWithCoordinates.length === 1) {
        const event = eventsWithCoordinates[0];
        if (event && event.coordinates) {
          const newRegion = {
            latitude: event.coordinates.latitude,
            longitude: event.coordinates.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          };
          console.log('📍 [MapScreen] Centering on single event:', newRegion);
          setTimeout(() => {
            mapRef.current?.animateToRegion(newRegion, 1000);
          }, 500);
        }
      } else {
        // Fit to all markers
        const coordinates = eventsWithCoordinates
          .filter(e => e.coordinates)
          .map(e => ({
            latitude: e.coordinates!.latitude,
            longitude: e.coordinates!.longitude,
          }));
        if (coordinates.length > 0) {
          setTimeout(() => {
            mapRef.current?.fitToCoordinates(coordinates, {
              edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
              animated: true,
            });
          }, 500);
        }
      }
    }
  }, [eventsWithCoordinates]);

  const filteredEvents = useMemo(() => {
    console.log('🔍 [MapScreen] Filtering events, activeCategory:', activeCategory);
    const filtered = activeCategory === 0
      ? eventsWithCoordinates
      : eventsWithCoordinates.filter((event) => {
          const selectedCategory = CATEGORIES[activeCategory];
          return selectedCategory && event.event_category === selectedCategory.id;
        });
    console.log('📊 [MapScreen] Filtered events count:', filtered.length);
    return filtered;
  }, [activeCategory, eventsWithCoordinates, CATEGORIES]);

  // Convert events to cluster points
  const clusterData = useMemo(() => {
    console.log('🎨 [MapScreen] Creating cluster data from filtered events:', filteredEvents.length);
    
    const points: ClusterPoint[] = filteredEvents.map(event => ({
      id: event.id,
      latitude: event.coordinates!.latitude,
      longitude: event.coordinates!.longitude,
      data: event,
    }));
    
    console.log('📍 [MapScreen] Points for clustering:', points.length);
    const clusters = clusterPoints(points, region, 80); // Increased radius for more grouping
    console.log('🎯 [MapScreen] Clusters created:', {
      totalItems: clusters.length,
      clusters: clusters.filter(c => 'count' in c).length,
      individual: clusters.filter(c => !('count' in c)).length
    });
    
    return clusters;
  }, [filteredEvents, region]);

  const handleChat = useCallback(() => {
    router.push('/screens/chat');
  }, [router]);
  
  const handleNotif = useCallback(() => {
    router.push('/screens/notifications');
  }, [router]);

  const renderClusterMarker = (cluster: Cluster) => {
    const firstEvents = cluster.points.slice(0, 2).map(p => p.data);
    
    return (
      <Marker
        key={cluster.id}
        coordinate={{
          latitude: cluster.latitude,
          longitude: cluster.longitude,
        }}
        onPress={() => {
          const zoomRegion = getClusterZoom(cluster, region);
          mapRef.current?.animateToRegion(zoomRegion, 500);
        }}
        tracksViewChanges={false}
      >
        <View style={styles.clusterContainer}>
          <View style={styles.clusterImages}>
            {firstEvents.map((event, index) => {
              let imageSource = null;
              let imageUri = null;
              
              // Check for template image first
              if (event.extra_data?.coverData?.selectedTemplate?.id) {
                const templateImage = getTemplateImage(event.extra_data.coverData.selectedTemplate.id);
                if (templateImage) {
                  imageSource = templateImage;
                }
              }
              
              // If no template, check for uploaded image
              if (!imageSource) {
                const coverImage = event.extra_data?.coverData?.coverImage || event.extra_data?.coverData?.uploadedImage;
                const hasValidImage = coverImage && coverImage !== '';
                imageUri = hasValidImage ? coverImage : (event.cover_image || event.image_url || null);
              }
              
              if (imageSource) {
                return (
                  <Image
                    key={event.id}
                    source={imageSource}
                    style={[
                      styles.clusterImage,
                      index === 1 && styles.clusterImageOverlay
                    ]}
                    onError={(e) => console.error('❌ [MapScreen] Cluster template image error:', event.id, e.nativeEvent.error)}
                  />
                );
              } else if (imageUri) {
                return (
                  <Image
                    key={event.id}
                    source={{ uri: imageUri }}
                    style={[
                      styles.clusterImage,
                      index === 1 && styles.clusterImageOverlay
                    ]}
                    onError={(e) => console.error('❌ [MapScreen] Cluster image error:', event.id, e.nativeEvent.error)}
                  />
                );
              } else {
                return (
                  <View 
                    key={event.id}
                    style={[
                      styles.clusterImage, 
                      { backgroundColor: getCategoryColor(event.event_category || event.extra_data?.eventCategory || 'social'), justifyContent: 'center', alignItems: 'center' },
                      index === 1 && styles.clusterImageOverlay
                    ]}
                  >
                    <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>
                      {event.title.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                );
              }
            })}
          </View>
          <View style={styles.clusterLabelContainer}>
            <Text style={styles.clusterLabel}>+ {cluster.count - 1} more</Text>
          </View>
        </View>
      </Marker>
    );
  };

  const renderEventMarker = (point: ClusterPoint) => {
    const event = point.data;
    const isSelected = selectedEventId === event.id;
    
    // Check for template image first
    let imageSource = null;
    let imageUri = null;
    
    if (event.extra_data?.coverData?.selectedTemplate?.id) {
      const templateImage = getTemplateImage(event.extra_data.coverData.selectedTemplate.id);
      if (templateImage) {
        imageSource = templateImage;
      }
    }
    
    // If no template, check for uploaded image
    if (!imageSource) {
      const coverImage = event.extra_data?.coverData?.coverImage || event.extra_data?.coverData?.uploadedImage;
      const hasValidCoverImage = coverImage && coverImage !== '';
      imageUri = hasValidCoverImage ? coverImage : (event.cover_image || event.image_url || null);
    }
    
    console.log('📍 [MapScreen] Rendering marker:', {
      id: event.id,
      title: event.title,
      isSelected,
      hasTemplateImage: !!imageSource,
      imageUri,
      templateId: event.extra_data?.coverData?.selectedTemplate?.id,
      selectedTemplate: event.extra_data?.coverData?.selectedTemplate,
      category: event.event_category,
      lat: point.latitude,
      lng: point.longitude
    });
    
    return (
      <Marker
        key={event.id}
        coordinate={{
          latitude: point.latitude,
          longitude: point.longitude,
        }}
        onPress={() => {
          console.log('🖐️ [MapScreen] Marker pressed:', event.id);
          setSelectedEventId(event.id);
        }}
        tracksViewChanges={false}
      >
        <View style={[styles.markerContainer, isSelected && styles.selectedMarker]}>
          {imageSource ? (
            <Image
              source={imageSource}
              style={styles.markerImage}
              onError={(e) => console.error('❌ [MapScreen] Template image load error:', event.id, e.nativeEvent.error)}
              onLoad={() => console.log('✅ [MapScreen] Template image loaded:', event.id)}
            />
          ) : imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.markerImage}
              onError={(e) => console.error('❌ [MapScreen] Marker image load error:', event.id, e.nativeEvent.error)}
              onLoad={() => console.log('✅ [MapScreen] Marker image loaded:', event.id)}
            />
          ) : (
            <View style={[styles.markerImage, { backgroundColor: getCategoryColor(event.event_category || event.extra_data?.eventCategory || 'social'), justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold' }}>
                {event.title.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.markerLabelContainer}>
            <Text style={styles.markerTitle} numberOfLines={1}>{event.title}</Text>
            <Text style={styles.markerSubtitle}>+ {event.participants_count || 1} more</Text>
          </View>
        </View>
      </Marker>
    );
  };

  const renderMapMarker = (item: Cluster | ClusterPoint) => {
    if ('count' in item) {
      return renderClusterMarker(item);
    } else {
      return renderEventMarker(item);
    }
  };

  const selectedEvent = selectedEventId 
    ? clusterData.find(item => !('count' in item) && item.data.id === selectedEventId)?.data
    : null;
  
  console.log('🎯 [MapScreen] Selected event:', {
    selectedEventId,
    selectedEvent: selectedEvent ? { id: selectedEvent.id, title: selectedEvent.title } : null,
    clusterDataLength: clusterData.length
  });

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>{t('map.title', 'Map')}</Text>
        
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleChat}>
            <ChatButton width={24} height={24} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNotif} style={styles.notifButton}>
            <NotificationButton width={24} height={24} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <SearchIcon width={20} height={20} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('map.searchPlaceholder', 'Search for an event or friend')}
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
          />
        </View>
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
              style={[
                styles.tab,
                activeCategory === index && styles.activeTab
              ]}
              onPress={() => setActiveCategory(index)}
            >
              <Text style={[
                styles.tabText,
                activeCategory === index && styles.activeTabText
              ]}>
                {category.label}
              </Text>
              {activeCategory === index && (
                <View style={styles.tabIndicator} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          onRegionChangeComplete={setRegion}
          provider={PROVIDER_GOOGLE}
          showsUserLocation={true}
          showsMyLocationButton={true}
          showsCompass={false}
        >
          {clusterData.map(item => renderMapMarker(item))}
        </MapView>

        {/* Bottom Sheet */}
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
                let previewUri = null;
                
                // Check for template image first
                if (selectedEvent.extra_data?.coverData?.selectedTemplate?.id) {
                  const templateImage = getTemplateImage(selectedEvent.extra_data.coverData.selectedTemplate.id);
                  if (templateImage) {
                    imageSource = templateImage;
                  }
                }
                
                // If no template, check for uploaded image
                if (!imageSource) {
                  const coverImage = selectedEvent.extra_data?.coverData?.coverImage || selectedEvent.extra_data?.coverData?.uploadedImage;
                  const hasValidImage = coverImage && coverImage !== '';
                  previewUri = hasValidImage ? coverImage : (selectedEvent.cover_image || selectedEvent.image_url || null);
                }
                
                console.log('🖼️ [MapScreen] Event preview image:', {
                  eventId: selectedEvent.id,
                  title: selectedEvent.title,
                  hasTemplateImage: !!imageSource,
                  uri: previewUri,
                  templateId: selectedEvent.extra_data?.coverData?.selectedTemplate?.id,
                  extraData: selectedEvent.extra_data,
                  coverData: selectedEvent.extra_data?.coverData
                });
                
                if (imageSource) {
                  return (
                    <Image
                      source={imageSource}
                      style={styles.eventImage}
                      onError={(e) => console.error('❌ [MapScreen] Preview template image load error:', selectedEvent.id, e.nativeEvent.error)}
                      onLoad={() => console.log('✅ [MapScreen] Preview template image loaded:', selectedEvent.id)}
                    />
                  );
                } else if (previewUri) {
                  return (
                    <Image
                      source={{ uri: previewUri }}
                      style={styles.eventImage}
                      onError={(e) => console.error('❌ [MapScreen] Preview image load error:', selectedEvent.id, e.nativeEvent.error)}
                      onLoad={() => console.log('✅ [MapScreen] Preview image loaded:', selectedEvent.id)}
                    />
                  );
                } else {
                  return (
                    <View style={[styles.eventImage, { backgroundColor: getCategoryColor(selectedEvent.event_category || selectedEvent.extra_data?.eventCategory || 'social'), justifyContent: 'center', alignItems: 'center' }]}>
                      <Text style={{ color: '#FFF', fontSize: 36, fontWeight: 'bold' }}>
                        {selectedEvent.title.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  );
                }
              })()}
              <View style={styles.eventContent}>
                <Text style={styles.eventTitle}>{selectedEvent.title}</Text>
                <Text style={styles.eventDate}>
                  {formatEventDate(selectedEvent.date, selectedEvent.start_time)} - {selectedEvent.end_time || '9:00 PM'}
                </Text>
                <Text style={styles.eventLocation}>
                  {getLocationName(selectedEvent.location_details || selectedEvent.location)}
                </Text>
                <View style={styles.eventFooter}>
                  <View style={styles.attendees}>
                    {(selectedEvent.participants || []).slice(0, 3).map((p, idx) => (
                      <Image
                        key={idx}
                        source={{ uri: p.avatar_url || `https://i.pravatar.cc/150?img=${idx}` }}
                        style={[
                          styles.attendeeAvatar,
                          { marginLeft: idx === 0 ? 0 : -12 }
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={styles.attendeeCount}>
                    +{selectedEvent.participants_count || 10} going
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Loading */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
  
  } catch (error) {
    console.error('❌ [MapScreen] Fatal error:', error);
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, color: 'red', marginBottom: 10 }}>Error loading map</Text>
        <Text style={{ fontSize: 14, color: '#666' }}>{error?.toString()}</Text>
      </SafeAreaView>
    );
  }
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: perfectSize(20),
    paddingVertical: perfectSize(16),
  },
  backButton: {
    width: perfectSize(32),
    height: perfectSize(32),
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: perfectSize(24),
    color: '#000000',
  },
  headerTitle: {
    fontSize: perfectSize(17),
    fontWeight: '600',
    color: '#000000',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: perfectSize(16),
  },
  notifButton: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -perfectSize(4),
    right: -perfectSize(4),
    backgroundColor: '#FF3B30',
    borderRadius: perfectSize(8),
    minWidth: perfectSize(16),
    height: perfectSize(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: perfectSize(10),
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: perfectSize(20),
    marginBottom: perfectSize(16),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: perfectSize(12),
    paddingHorizontal: perfectSize(16),
    height: perfectSize(40),
  },
  searchIcon: {
    opacity: 0.5,
  },
  searchInput: {
    flex: 1,
    marginLeft: perfectSize(8),
    fontSize: perfectSize(16),
    color: '#000000',
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
  },
  activeTabText: {
    color: '#007AFF',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#007AFF',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  clusterContainer: {
    alignItems: 'center',
  },
  clusterImages: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clusterImage: {
    width: perfectSize(60),
    height: perfectSize(60),
    borderRadius: perfectSize(8),
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  clusterImageOverlay: {
    marginLeft: -perfectSize(20),
  },
  clusterLabelContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: perfectSize(8),
    paddingVertical: perfectSize(4),
    borderRadius: perfectSize(4),
    marginTop: perfectSize(4),
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  clusterLabel: {
    fontSize: perfectSize(12),
    fontWeight: '500',
    color: '#000000',
  },
  markerContainer: {
    alignItems: 'center',
  },
  selectedMarker: {
    transform: [{ scale: 1.1 }],
  },
  markerImage: {
    width: perfectSize(80),
    height: perfectSize(80),
    borderRadius: perfectSize(8),
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  markerLabelContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: perfectSize(8),
    paddingVertical: perfectSize(4),
    borderRadius: perfectSize(4),
    marginTop: perfectSize(4),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  markerTitle: {
    fontSize: perfectSize(12),
    fontWeight: '600',
    color: '#000000',
    maxWidth: perfectSize(80),
  },
  markerSubtitle: {
    fontSize: perfectSize(11),
    color: '#666666',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: perfectSize(20),
    borderTopRightRadius: perfectSize(20),
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -5 },
    elevation: 10,
    paddingBottom: perfectSize(34),
  },
  eventCard: {
    flexDirection: 'row',
    padding: perfectSize(16),
  },
  eventImage: {
    width: perfectSize(100),
    height: perfectSize(100),
    borderRadius: perfectSize(12),
    backgroundColor: '#F5F5F5',
  },
  eventContent: {
    flex: 1,
    marginLeft: perfectSize(16),
  },
  eventTitle: {
    fontSize: perfectSize(18),
    fontWeight: '600',
    color: '#000000',
    marginBottom: perfectSize(4),
  },
  eventDate: {
    fontSize: perfectSize(14),
    color: '#666666',
    marginBottom: perfectSize(4),
  },
  eventLocation: {
    fontSize: perfectSize(14),
    color: '#666666',
    marginBottom: perfectSize(12),
  },
  eventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendees: {
    flexDirection: 'row',
    marginRight: perfectSize(8),
  },
  attendeeAvatar: {
    width: perfectSize(28),
    height: perfectSize(28),
    borderRadius: perfectSize(14),
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  attendeeCount: {
    fontSize: perfectSize(14),
    color: '#666666',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MapScreen;