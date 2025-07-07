import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from 'react-native';
import 'react-native-get-random-values';
import * as Location from 'expo-location';
import { v4 as uuidv4 } from 'uuid';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SearchIcon from '@/assets/svg/search.svg';

interface Place {
  id: string;
  name: string;
  address: string;
  distKm: number;
}

interface RestaurantPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (place: Place) => void;
  currentPlace?: Place | null;
}

const COLORS = {
  white: '#FFFFFF',
  black: '#000000',
  grey0: '#E5E5E5',
  grey1: '#AEB0B4',
  grey2: '#666666',
  grey3: '#555555',
  error: '#D32F2F',
  primary: '#007AFF',
};

const GEOAPIFY_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_KEY;

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const haversine = (la1: number, lo1: number, la2: number, lo2: number): number => {
  const R = 6371;
  const dφ = toRad(la2 - la1);
  const dλ = toRad(lo2 - lo1);
  const a =
    Math.sin(dφ / 2) ** 2 + Math.cos(toRad(la1)) * Math.cos(toRad(la2)) * Math.sin(dλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const debounce = (fn: (text: string) => void, delay = 400) => {
  let timeout: NodeJS.Timeout;
  return (text: string) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(text), delay);
  };
};

export default function RestaurantPickerModal({
  visible,
  onClose,
  onSelect,
  currentPlace,
}: RestaurantPickerModalProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(currentPlace || null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && currentPlace) {
      setSelectedPlace(currentPlace);
    }
  }, [visible, currentPlace]);

  useEffect(() => {
    const getLocation = async () => {
      if (!visible) return;
      
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setCoords({ lat: loc.coords.latitude, lon: loc.coords.longitude });
        }
      } catch (e) {
        console.warn('GPS permission or fetch error:', e);
      }
    };
    
    getLocation();
  }, [visible]);

  const dedupe = (arr: Place[]): Place[] => {
    const map = new Map<string, Place>();
    arr.forEach((p) => {
      if (!map.has(p.name + p.address)) map.set(p.name + p.address, p);
    });
    return Array.from(map.values());
  };

  const fetchNominatim = useCallback(
    async (text: string): Promise<Place[]> => {
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('format', 'json');
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('limit', '20');
      url.searchParams.set('q', text.trim().length ? `${text.trim()} restaurant` : 'restaurant');
      url.searchParams.set('extratags', '1');
      
      if (coords) {
        url.searchParams.set(
          'viewbox',
          `${coords.lon - 0.2},${coords.lat + 0.2},${coords.lon + 0.2},${coords.lat - 0.2}`
        );
        url.searchParams.set('bounded', '0');
      }
      
      const r = await fetch(url.toString(), {
        headers: { 'User-Agent': 'and_friends/1.0' },
      });
      
      if (!r.ok) throw new Error('nominatim_fail');
      const js: any[] = await r.json();
      
      return js.map((f: any) => {
        const lat = parseFloat(f.lat);
        const lon = parseFloat(f.lon);
        const a = f.address || {};
        const address = [a.road, a.city || a.town || a.village, a.country]
          .filter(Boolean)
          .join(', ');
        return {
          id: f.place_id ? String(f.place_id) : uuidv4(),
          name: f.display_name.split(',')[0] || 'Unnamed',
          address,
          distKm: coords ? haversine(coords.lat, coords.lon, lat, lon) : Number.MAX_VALUE,
        } as Place;
      });
    },
    [coords]
  );

  const fetchGeoapify = useCallback(
    async (text: string): Promise<Place[]> => {
      if (!GEOAPIFY_KEY) return [];
      
      const url = new URL('https://api.geoapify.com/v2/places');
      url.searchParams.set('categories', 'catering.restaurant');
      url.searchParams.set('limit', '20');
      
      if (coords) {
        url.searchParams.set('filter', `circle:${coords.lon},${coords.lat},20000`);
        url.searchParams.set('bias', `proximity:${coords.lon},${coords.lat}`);
      }
      
      url.searchParams.set('text', text.trim() || '');
      url.searchParams.set('apiKey', GEOAPIFY_KEY);
      
      const r = await fetch(url.toString());
      if (!r.ok) throw new Error('geoapify_fail');
      
      const js = await r.json();
      return (js.features || []).map((f: any) => {
        const [lon, lat] = f.geometry.coordinates as [number, number];
        const p = f.properties || {};
        const address = [p.street, p.city, p.country].filter(Boolean).join(', ');
        
        return {
          id: p.place_id ? String(p.place_id) : uuidv4(),
          name: p.name || p.street || 'Unnamed',
          address,
          distKm: coords ? haversine(coords.lat, coords.lon, lat, lon) : Number.MAX_VALUE,
        } as Place;
      });
    },
    [coords]
  );

  const runSearch = useCallback(
    async (text: string): Promise<void> => {
      setIsSearching(true);
      setSearchError(null);
      
      try {
        let combined: Place[] = [];
        
        try {
          combined = await fetchNominatim(text);
        } catch (nominatimError) {
          console.warn('Nominatim failed, trying Geoapify:', nominatimError);
          if (GEOAPIFY_KEY) combined = await fetchGeoapify(text);
          else throw nominatimError;
        }
        
        if (!combined.length && GEOAPIFY_KEY) {
          console.log('Nominatim returned 0, trying Geoapify as primary for this query.');
          combined = await fetchGeoapify(text);
        }

        const unique = dedupe(combined);
        const sorted = coords ? unique.sort((a, b) => a.distKm - b.distKm) : unique;
        
        if (!sorted.length && text.trim()) {
          setSearchError(`No restaurants found for "${text.trim()}"`);
        } else if (!sorted.length && !text.trim()) {
          setSearchError('No restaurants found nearby');
        }
        
        setPlaces(sorted);
      } catch (e: unknown) {
        console.error('Search error:', e instanceof Error ? e.message : e);
        setSearchError('Search service is currently unavailable');
        setPlaces([]);
      } finally {
        setIsSearching(false);
      }
    },
    [coords, fetchNominatim, fetchGeoapify]
  );

  const debouncedSearch = useMemo(() => debounce(runSearch, 400), [runSearch]);

  useEffect(() => {
    if (visible) {
      if (query.trim() || (coords && places.length === 0 && !query.trim())) {
        debouncedSearch(query);
      } else if (!query.trim() && !coords) {
        setPlaces([]);
        setSearchError(null);
      }
    }
  }, [query, coords, debouncedSearch, visible, places.length]);

  const handleConfirm = () => {
    if (selectedPlace) {
      onSelect(selectedPlace);
      onClose();
    }
  };

  const renderItem = ({ item }: { item: Place }) => (
    <Pressable
      onPress={() => setSelectedPlace(item)}
      style={[styles.card, selectedPlace?.id === item.id && styles.sel]}
      disabled={isSearching}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        {!!item.address && (
          <Text style={styles.addr} numberOfLines={2}>
            {item.address}
          </Text>
        )}
        {coords && item.distKm !== Number.MAX_VALUE && (
          <Text style={styles.dist}>{item.distKm.toFixed(1)} km</Text>
        )}
      </View>
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalContent, { paddingBottom: insets.bottom || 20 }]}
          keyboardVerticalOffset={0}
        >
          <View style={styles.handle} />
          
          <View style={styles.header}>
            <Text style={styles.title}>Your Go-To Spot</Text>
            <Text style={styles.subtitle}>Share your favorite local place</Text>
          </View>

          <View style={styles.search}>
            <SearchIcon width={20} height={20} />
            <TextInput
              style={styles.input}
              placeholder="Search restaurants..."
              placeholderTextColor={COLORS.grey1}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />
          </View>

          <View style={styles.listContainer}>
            {isSearching && <ActivityIndicator style={styles.loader} color={COLORS.black} />}
            {searchError && !isSearching && <Text style={styles.error}>{searchError}</Text>}

            {!isSearching &&
              places.length === 0 &&
              query.trim() === '' &&
              !searchError &&
              !selectedPlace && (
                <Text style={styles.infoText}>Search for a restaurant or discover nearby places</Text>
              )}

            <FlatList
              data={places}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContentContainer}
              style={styles.listStyle}
              ListHeaderComponent={
                selectedPlace && !places.find((p) => p.id === selectedPlace.id) && !isSearching ? (
                  <View>
                    <Text style={styles.currentSelectionLabel}>Your Current Selection</Text>
                    {renderItem({ item: selectedPlace })}
                    <View style={styles.separator} />
                  </View>
                ) : null
              }
            />
          </View>

          <View style={styles.footer}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, !selectedPlace && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={!selectedPlace}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    maxHeight: '85%',
    height: '85%',
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: COLORS.grey0,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.grey2,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.grey0,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginHorizontal: 24,
    marginBottom: 20,
    backgroundColor: COLORS.white,
  },
  input: {
    flex: 1,
    fontSize: 17,
    color: COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    marginLeft: 12,
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    marginHorizontal: 24,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingTop: 12,
    borderWidth: 1,
    borderColor: COLORS.grey0,
    overflow: 'hidden',
  },
  loader: { marginVertical: 24 },
  error: {
    color: COLORS.error,
    marginVertical: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  infoText: {
    color: COLORS.grey3,
    marginVertical: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
    fontSize: 16,
  },
  listStyle: { flex: 1 },
  listContentContainer: { 
    paddingTop: 4,
    paddingBottom: 20,
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.grey0,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.white,
  },
  sel: { borderColor: COLORS.black, borderWidth: 2 },
  name: {
    fontSize: 17,
    color: COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    marginBottom: 3,
  },
  addr: { fontSize: 14, color: COLORS.grey3, flexShrink: 1, lineHeight: 18 },
  dist: { fontSize: 13, color: COLORS.grey2, marginTop: 4 },
  currentSelectionLabel: {
    fontSize: 14,
    color: COLORS.grey3,
    fontWeight: 'bold',
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 4,
  },
  separator: { height: 1, backgroundColor: COLORS.grey0, marginVertical: 16 },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.grey0,
    backgroundColor: COLORS.white,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.grey0,
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.black,
  },
  confirmButton: {
    flex: 1,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  confirmButtonDisabled: {
    backgroundColor: '#B3D1FF',
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.white,
  },
});