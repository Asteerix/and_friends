import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import 'react-native-get-random-values'; // Pour uuid

import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { v4 as uuidv4 } from 'uuid';

import { supabase } from '@/shared/lib/supabase/client';
import { getDeviceLanguage, t } from '@/shared/locales';
import ScreenLayout from '@/shared/ui/ScreenLayout';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { useAuthNavigation } from '@/shared/hooks/useAuthNavigation';
import { useRegistrationStep } from '@/shared/hooks/useRegistrationStep';

// RestaurantPickerScreen.tsx
// ---------------------------------------------------------------------------
interface Place {
  id: string;
  name: string;
  address: string;
  distKm: number; // distKm peut être MAX_VALUE si pas de coords
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------
const COLORS = {
  white: '#FFFFFF',
  black: '#000000',
  grey0: '#E5E5E5',
  grey1: '#AEB0B4',
  grey2: '#666666',
  grey3: '#555555',
  error: '#D32F2F',
};
// Removed - using getProgress() from useAuthNavigation
// const NEXT_REGISTRATION_STEP_VALUE = "hobby_picker"; // Supprimé
const GEOAPIFY_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_KEY;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function RestaurantPickerScreen() {
  const router = useRouter();
  const { navigateBack, navigateNext, getProgress } = useAuthNavigation('restaurant-picker');
  const lang = getDeviceLanguage();
  const { currentStep, loading: onboardingLoading } = useOnboardingStatus();

  // Save registration step
  useRegistrationStep('restaurant_picker');

  const handleBackPress = () => {
    navigateBack();
  };

  const [query, setQuery] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingInitialData, setIsFetchingInitialData] = useState(true);

  React.useEffect(() => {
    if (!onboardingLoading && currentStep && currentStep !== 'RestaurantPicker') {
      // Si ce n'est pas l'étape RestaurantPicker, on redirige vers la bonne étape
      const stepToRoute: Record<string, string> = {
        HobbyPicker: '/hobby-picker',
      };
      const route = stepToRoute[currentStep] || '/hobby-picker';
      router.replace(route);
    }
  }, [onboardingLoading, currentStep, router]);

  // Ask GPS once & Fetch initial restaurant
  useEffect(() => {
    const initialize = async () => {
      setIsFetchingInitialData(true);
      // GPS
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

      // Initial restaurant
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('selected_restaurant_id, selected_restaurant_name, selected_restaurant_address')
            .eq('id', user.id)
            .single();
          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching initial restaurant:', error);
          } else if (data && data.selected_restaurant_id) {
            setSelectedPlace({
              id: data.selected_restaurant_id,
              name: data.selected_restaurant_name || '',
              address: data.selected_restaurant_address || '',
              distKm: Number.MAX_VALUE, // distKm inconnu sans recherche
            });
          }
        } catch (e) {
          console.error('Unexpected error fetching initial restaurant:', e);
        }
      }
      setIsFetchingInitialData(false);
    };
    void initialize();
  }, []);

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
        url.searchParams.set('bounded', '0'); // Allow results outside viewbox if more relevant
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
        url.searchParams.set('filter', `circle:${coords.lon},${coords.lat},20000`); // 20km radius
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
      if (isFetchingInitialData) return;
      setIsSearching(true);
      setSearchError(null); // setSelectedPlace(null); // Keep selection during search for better UX
      try {
        let combined: Place[] = [];
        try {
          combined = await fetchNominatim(text);
        } catch (nominatimError) {
          console.warn('Nominatim failed, trying Geoapify:', nominatimError);
          if (GEOAPIFY_KEY) combined = await fetchGeoapify(text);
          else throw nominatimError; // Re-throw if no fallback
        }
        if (!combined.length && GEOAPIFY_KEY) {
          // If Nominatim returned nothing, try Geoapify
          console.log('Nominatim returned 0, trying Geoapify as primary for this query.');
          combined = await fetchGeoapify(text);
        }

        const unique = dedupe(combined);
        const sorted = coords ? unique.sort((a, b) => a.distKm - b.distKm) : unique;
        if (!sorted.length && text.trim())
          setSearchError(t('restaurant_picker_no_results', lang, { query: text.trim() }));
        else if (!sorted.length && !text.trim())
          setSearchError(t('restaurant_picker_no_results_generic', lang)); // Clé à ajouter
        setPlaces(sorted);
      } catch (e: unknown) {
        console.error('Search error:', e instanceof Error ? e.message : e);
        setSearchError(t('error_service_unavailable', lang)); // Clé à ajouter
        setPlaces([]);
      } finally {
        setIsSearching(false);
      }
    },
    [coords, fetchNominatim, fetchGeoapify, isFetchingInitialData, lang]
  );

  const debouncedSearch = useMemo(() => debounce(runSearch, 400), [runSearch]);
  useEffect(() => {
    // Trigger search on query change or if coords become available and query is empty (for initial nearby search)
    if (!isFetchingInitialData) {
      if (query.trim() || (coords && places.length === 0 && !query.trim())) {
        // Search if query or if coords available and no results yet
        debouncedSearch(query);
      } else if (!query.trim() && !coords) {
        // No query, no coords, clear list
        setPlaces([]);
        setSearchError(null);
      }
    }
  }, [query, coords, debouncedSearch, isFetchingInitialData, places.length]);

  const updateProfileRestaurant = async (placeData: Place | null) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert(t('error_session_expired_title', lang), t('error_session_expired_message', lang));
      return false;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          selected_restaurant_id: placeData?.id || null,
          selected_restaurant_name: placeData?.name || null,
          selected_restaurant_address: placeData?.address || null,
          current_registration_step: 'hobby_picker',
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving restaurant to profile:', error);
        Alert.alert(t('error_saving_profile', lang), error.message);
        return false;
      }
      return true;
    } catch (e: unknown) {
      console.error('Unexpected error saving restaurant:', e);
      Alert.alert(t('unexpected_error', lang), e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinue = async () => {
    if (!selectedPlace || isSaving) return; // Must have a selection to "Continue"
    const success = await updateProfileRestaurant(selectedPlace);
    if (success) {
      // La navigation vers HobbyPicker ne nécessite plus de restaurantId comme paramètre
      // si on suit le principe que chaque écran sauvegarde ses propres données.
      // Si HobbyPicker a besoin de l'ID du restaurant pour une raison quelconque (ce qui ne devrait pas être le cas
      // s'il est indépendant), il devrait le récupérer de la DB.
      // Pour l'instant, on navigue simplement.
      navigateNext('hobby-picker');
    }
  };

  const handleSkip = async () => {
    if (isSaving) return;
    const success = await updateProfileRestaurant(null); // Pass null to clear restaurant fields
    if (success) {
      navigateNext('hobby-picker');
    }
  };

  const isLoading = isSearching || isSaving || isFetchingInitialData;

  const renderItem = ({ item }: { item: Place }) => (
    <Pressable
      onPress={() => setSelectedPlace(item)}
      style={[st.card, selectedPlace?.id === item.id && st.sel]}
      disabled={isLoading}
    >
      <View style={{ flex: 1 }}>
        <Text style={st.name} numberOfLines={1}>
          {item.name}
        </Text>
        {!!item.address && (
          <Text style={st.addr} numberOfLines={2}>
            {item.address}
          </Text>
        )}
        {coords && item.distKm !== Number.MAX_VALUE && (
          <Text style={st.dist}>{item.distKm.toFixed(1)} km</Text>
        )}
      </View>
    </Pressable>
  );

  if (isFetchingInitialData && !isSaving) {
    return (
      <View style={st.loadingScreenContainer}>
        <ActivityIndicator size="large" color={COLORS.black} />
      </View>
    );
  }

  return (
    <>
      <ScreenLayout
        title={t('restaurant_picker_title', lang)}
        subtitle={t('restaurant_picker_subtitle', lang)}
        progress={getProgress()}
        onContinue={handleContinue}
        continueDisabled={!selectedPlace || isLoading}
        showAltLink={true}
        altLinkText={t('skip', lang)}
        onAltLinkPress={handleSkip}
        showBackButton={true}
        onBackPress={handleBackPress}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
          <View style={st.search}>
            <Text style={st.icon}>🔍</Text>
            <TextInput
              style={st.input}
              placeholder={t('restaurant_picker_placeholder', lang)}
              placeholderTextColor={COLORS.grey1}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              editable={!isLoading}
            />
          </View>

          {isSearching && <ActivityIndicator style={st.loader} color={COLORS.black} />}
          {searchError && !isSearching && <Text style={st.error}>{searchError}</Text>}

          {!isSearching &&
            places.length === 0 &&
            query.trim() === '' &&
            !searchError &&
            !selectedPlace && (
              <Text style={st.infoText}>{t('restaurant_picker_initial_prompt', lang)}</Text>
            )}

          <FlatList
            data={places}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={st.listContentContainer}
            style={st.listStyle}
            ListHeaderComponent={
              selectedPlace && !places.find((p) => p.id === selectedPlace.id) && !isSearching ? (
                <View>
                  <Text style={st.currentSelectionLabel}>
                    {t('restaurant_picker_current_selection', lang)}
                  </Text>
                  {renderItem({ item: selectedPlace })}
                  <View style={st.separator} />
                </View>
              ) : null
            }
          />
        </KeyboardAvoidingView>
      </ScreenLayout>
    </>
  );
}

const st = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.grey0,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 16,
  },
  icon: { fontSize: 18, color: COLORS.grey2, marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 17,
    color: COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
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
  listStyle: { flex: 1, width: '100%' },
  listContentContainer: { paddingTop: 8, paddingBottom: 120 },
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
  loadingScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  currentSelectionLabel: {
    fontSize: 14,
    color: COLORS.grey3,
    fontWeight: 'bold',
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 4,
  },
  separator: { height: 1, backgroundColor: COLORS.grey0, marginVertical: 16 },
});

/*
TODO:
1. Assurez-vous que la table `profiles` dans Supabase a les colonnes:
   - `selected_restaurant_id` (TEXT)
   - `selected_restaurant_name` (TEXT)
   - `selected_restaurant_address` (TEXT)

2. Ajoutez/vérifiez les clés de traduction:
   "restaurant_picker_title": "Got restaurant recs?"
   "restaurant_picker_subtitle": "Share your favorite spot or discover new ones."
   "restaurant_picker_placeholder": "Search restaurants..."
   "restaurant_picker_no_results": "No restaurants found for \"{{query}}\"."
   "restaurant_picker_no_results_generic": "No restaurants found. Try a different search."
   "restaurant_picker_initial_prompt": "Search for a restaurant or let us show you nearby places."
   "restaurant_picker_current_selection": "Your Current Selection:"
   "error_service_unavailable": "Search service is currently unavailable. Please try again later."
   (et les clés génériques)

3. Testez la recherche (avec/sans GPS), la sélection, la sauvegarde, le skip, et le pré-remplissage.
   - Assurez-vous que `EXPO_PUBLIC_GEOAPIFY_KEY` est configuré dans votre environnement si vous comptez sur Geoapify.
*/
