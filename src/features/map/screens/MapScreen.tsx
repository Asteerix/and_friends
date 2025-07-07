import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  SafeAreaView as SafeAreaViewRN,
  Pressable,
  AccessibilityRole,
} from 'react-native';
import { create } from 'react-native-pixel-perfect';
import {
  SafeAreaView as SafeAreaViewContext,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import MapView, { Region, Marker, Callout } from 'react-native-maps';
import Ionicons from 'react-native-vector-icons/Ionicons';
// import { SharedElement } from 'react-navigation-shared-element';
import { useRouter } from 'expo-router';

import SearchBar from '@/features/home/components/SearchBar';
import CategoryTabs from '@/features/home/components/CategoryTabs';
import EventCard from '@/features/home/components/EventCard';
import { useEventsAdvanced } from '@/hooks/useEventsAdvanced';
import { useMapStore } from '@/store/mapStore';
import ChatButtonIcon from '@/assets/svg/chat-button.svg';
import NotificationButtonIcon from '@/assets/svg/notification-button.svg';
import NotificationBadge from '@/features/notifications/components/NotificationBadge';
import { useNotifications } from '@/hooks/useNotifications';
import BackButtonIcon from '@/assets/svg/back-button.svg';

const designResolution = { width: 375, height: 812 };
const perfectSize = create(designResolution);
const CATEGORIES = ['All', 'Sports', 'Music', 'Arts', 'Food', 'Gaming'];

const MapScreen: React.FC = React.memo(() => {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { region } = useMapStore();
  const { events, loading } = useEventsAdvanced();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState(0);
  const insets = useSafeAreaInsets();
  const [sheetOpen, setSheetOpen] = useState(true);
  const { unread } = useNotifications();

  // Parse coordinates from location string
  const getCoordinates = (location: string | undefined) => {
    if (!location) {
      return {
        latitude: 40.729,
        longitude: -73.997,
      };
    }
    const coords = location.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
    if (coords && coords[1] && coords[2]) {
      return {
        latitude: parseFloat(coords[1]),
        longitude: parseFloat(coords[2]),
      };
    }
    return {
      latitude: 40.729 + (Math.random() - 0.5) * 0.05,
      longitude: -73.997 + (Math.random() - 0.5) * 0.05,
    };
  };

  const eventsWithCoordinates = events
    .filter((event) => event.location)
    .map((event) => ({
      ...event,
      coordinates: getCoordinates(event.location || ''),
    }));

  // Filtrage par catégorie (robuste si pas de category)
  const filteredEvents =
    activeCategory === 0
      ? eventsWithCoordinates
      : eventsWithCoordinates.filter((e) => {
          // fallback: si pas de category, tout dans All
          const cat = (e as any).category;
          if (!cat) return false;
          return String(cat).toLowerCase() === CATEGORIES[activeCategory].toLowerCase();
        });

  // Header buttons
  const handleChat = useCallback(() => {
    router.push('/screens/chat');
  }, [router]);
  const handleNotif = useCallback(() => {
    router.push('/screens/notifications');
  }, [router]);

  // Bottom sheet height
  const SHEET_HEIGHT = perfectSize(320) + insets.bottom;
  const windowHeight = Dimensions.get('window').height;

  return (
    <SafeAreaViewContext style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* Header avec titre centré, back SVG, chat/notif SVGs */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backBtnMinimal}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <BackButtonIcon width={perfectSize(24)} height={perfectSize(24)} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} accessibilityRole="header">
              Map
            </Text>
          </View>
          <View style={styles.iconsRow}>
            <TouchableOpacity
              onPress={handleChat}
              accessibilityLabel="Open chat"
              accessibilityRole="button"
            >
              <ChatButtonIcon width={48} height={48} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNotif}
              accessibilityLabel="Open notifications"
              accessibilityRole="button"
              style={styles.notificationButton}
            >
              <NotificationButtonIcon width={48} height={48} />
              <NotificationBadge count={unread.length} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.searchBarRow}>
          <SearchBar />
        </View>
        <CategoryTabs
          categories={CATEGORIES}
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
                    <View
                      style={[styles.marker, selectedEventId === event.id && styles.selectedMarker]}
                    >
                      <Text style={styles.markerText}>{event.participants_count || 0}</Text>
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
        {/* Bottom sheet overlay */}
        <View
          style={[
            styles.bottomSheet,
            {
              height: SHEET_HEIGHT,
              bottom: 0,
              paddingBottom: insets.bottom + perfectSize(8),
            },
          ]}
          accessibilityLabel="Events list"
          accessibilityRole="summary"
        >
          <View style={styles.sheetHandle} />
          <Text style={styles.sectionTitle}>All Events</Text>
          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetScrollContent}
            showsVerticalScrollIndicator={false}
            accessibilityLabel="Scrollable list of events"
          >
            {filteredEvents.slice(0, 5).map((event) => (
              <EventCard
                key={event.id}
                title={event.title}
                date={event.date}
                location={event.location || ''}
                thumbnail={event.image_url || ''}
                participants={(event.participants || []).map(
                  (p) =>
                    p.avatar_url ||
                    `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`
                )}
                goingText={`+${event.participants_count || 10} going`}
                onPress={() => router.push(`/screens/event-details?eventId=${event.id}`)}
              />
            ))}
            {filteredEvents.length === 0 && <Text style={styles.emptyText}>No events found.</Text>}
          </ScrollView>
        </View>
        {/* Loading overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <Text>Loading events...</Text>
          </View>
        )}
      </View>
    </SafeAreaViewContext>
  );
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFF',
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: perfectSize(16),
    marginTop: perfectSize(8),
    marginBottom: perfectSize(0),
    height: perfectSize(56),
  },
  backBtnMinimal: {
    padding: 0,
    margin: 0,
    backgroundColor: 'transparent',
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: perfectSize(32),
    height: perfectSize(32),
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: perfectSize(22),
    fontWeight: '600',
    color: '#161616',
    textAlign: 'center',
  },
  searchBarRow: {
    paddingHorizontal: perfectSize(16),
    marginTop: perfectSize(0),
    marginBottom: perfectSize(0),
  },
  iconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: perfectSize(8),
    gap: 12,
  },
  notificationButton: {
    position: 'relative',
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
  marker: {
    backgroundColor: '#1E1F2B',
    borderRadius: perfectSize(16),
    paddingHorizontal: perfectSize(12),
    paddingVertical: perfectSize(6),
    minWidth: perfectSize(32),
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 3,
      },
    }),
  },
  selectedMarker: {
    backgroundColor: '#FF684D',
    transform: [{ scale: 1.1 }],
  },
  markerText: {
    color: '#FFF',
    fontSize: perfectSize(14),
    fontWeight: '600',
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
});

export default MapScreen;
