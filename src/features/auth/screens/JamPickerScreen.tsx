import { useAudioPlayer } from 'expo-audio';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '@/shared/lib/supabase/client';
import { getDeviceLanguage, t } from '@/shared/locales';
import ScreenLayout from '@/shared/ui/ScreenLayout';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { useAuthNavigation } from '@/shared/hooks/useAuthNavigation';
import { useRegistrationStep } from '@/shared/hooks/useRegistrationStep';
import SearchIcon from '@/assets/svg/search.svg';

// JamPickerScreen.tsx
// ---------------------------------------------------------------------------

interface Song {
  id: string;
  title: string;
  artist: string;
  cover: string;
  preview: string | null;
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
// const NEXT_REGISTRATION_STEP_VALUE = "restaurant_picker"; // Supprimé

// ---------------------------------------------------------------------------
// Hooks & Helpers
// ---------------------------------------------------------------------------
const useDebounce = (value: string, delay = 400) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

const AudioPreviewPlayer: React.FC<{
  uri: string;
  playing: boolean;
  onFinish: () => void;
}> = ({ uri, playing, onFinish }) => {
  const player = useAudioPlayer({ uri });

  useEffect(() => {
    return () => {
      // Clean up player on unmount
      if (player) {
        player.remove();
      }
    };
  }, [player]);

  useEffect(() => {
    const handlePlayback = async () => {
      if (playing && uri) {
        try {
          player.play();
        } catch (error) {
          console.error('Error playing sound:', error);
        }
      } else if (!playing) {
        player.pause();
      }
    };

    handlePlayback();
  }, [playing, uri, player]);

  // Listen for playback completion
  useEffect(() => {
    const checkPlaybackStatus = setInterval(() => {
      if (player.currentTime >= player.duration && player.duration > 0) {
        onFinish();
        clearInterval(checkPlaybackStatus);
      }
    }, 100);

    return () => clearInterval(checkPlaybackStatus);
  }, [player, onFinish]);

  return null;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const JamPickerScreen: React.FC = () => {
  const router = useRouter();
  const { navigateBack, navigateNext, getProgress } = useAuthNavigation('jam-picker');
  const lang = getDeviceLanguage();
  const { currentStep, loading: onboardingLoading } = useOnboardingStatus();

  // Save registration step
  useRegistrationStep('jam_picker');

  const handleBackPress = () => {
    navigateBack();
  };

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query);
  const [tracks, setTracks] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<Song | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingInitialData, setIsFetchingInitialData] = useState(true);

  useEffect(() => {
    if (!onboardingLoading && currentStep && currentStep !== 'JamPicker') {
      // Si ce n'est pas l'étape JamPicker, on redirige vers la bonne étape
      const stepToRoute: Record<string, string> = {
        RestaurantPicker: '/restaurant-picker',
        HobbyPicker: '/hobby-picker',
      };
      const route = stepToRoute[currentStep] || '/restaurant-picker';
      router.replace(route);
    }
  }, [onboardingLoading, currentStep, router]);

  // Fetch initial jam
  useEffect(() => {
    const fetchInitialJam = async () => {
      setIsFetchingInitialData(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('jam_track_id, jam_title, jam_artist, jam_cover_url, jam_preview_url')
            .eq('id', user.id)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching initial jam:', error);
          } else if (data && data.jam_track_id) {
            setSelectedTrack({
              id: data.jam_track_id,
              title: data.jam_title || '',
              artist: data.jam_artist || '',
              cover: data.jam_cover_url || '',
              preview: data.jam_preview_url || null,
            });
            // Optionnel: si le jam initial est sélectionné, on pourrait vouloir l'afficher même si la recherche est vide
            // ou pré-remplir la recherche avec le titre/artiste. Pour l'instant, on le sélectionne juste.
          }
        } catch (e) {
          console.error('Unexpected error fetching initial jam:', e);
        }
      }
      setIsFetchingInitialData(false);
    };
    fetchInitialJam();
  }, []);

  // Fetch tracks from iTunes
  useEffect(() => {
    const fetchTracks = async () => {
      if (isFetchingInitialData) return; // Don't fetch if still getting initial data

      const searchTerm = debouncedQuery.trim()
        ? debouncedQuery
        : selectedTrack?.title || 'love songs'; // Default search
      if (!searchTerm) {
        // If no debounced query and no selected track title, don't search
        setTracks([]);
        return;
      }
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
        searchTerm
      )}&entity=song&limit=20&country=US`;

      setIsSearching(true);
      setSearchError(null);
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`iTunes API request failed with status ${resp.status}`);
        const json = await resp.json();
        if (json.results && Array.isArray(json.results)) {
          const result: Song[] = json.results.map((r: any) => ({
            id: r.trackId.toString(),
            title: r.trackName,
            artist: r.artistName,
            cover: r.artworkUrl100 ? r.artworkUrl100.replace('100x100', '200x200') : '',
            preview: r.previewUrl || null,
          }));
          setTracks(result);
        } else {
          setTracks([]);
        }
      } catch (err: unknown) {
        console.error('iTunes fetch error:', err);
        setSearchError(t('error_network_request', lang)); // Clé à ajouter
        setTracks([]);
      } finally {
        setIsSearching(false);
      }
    };
    fetchTracks();
  }, [debouncedQuery, isFetchingInitialData, selectedTrack]); // Re-fetch if selectedTrack changes to provide context

  const togglePlay = useCallback((track: Song) => {
    if (!track.preview) return;
    setPlayingId((prev) => (prev === track.id ? null : track.id));
  }, []);

  const handleSelectTrack = (track: Song) => {
    setSelectedTrack(track);
    setPlayingId(null); // Stop preview when selecting
  };

  const renderItem = ({ item }: { item: Song }) => {
    const isSelected = item.id === selectedTrack?.id;
    const isPlaying = item.id === playingId;
    return (
      <Pressable
        onPress={() => handleSelectTrack(item)}
        style={[styles.songRow, isSelected && styles.songRowSelected]}
      >
        <Image source={{ uri: item.cover }} style={styles.songCover} />
        <View style={{ flex: 1 }}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.songArtist} numberOfLines={1}>
            {item.artist}
          </Text>
        </View>
        {item.preview && (
          <>
            <Pressable hitSlop={8} onPress={() => togglePlay(item)} disabled={isSaving}>
              <Text style={[styles.playIcon, isPlaying && { color: COLORS.black }]}>
                {isPlaying ? '⏸' : '▶'}
              </Text>
            </Pressable>
            {isPlaying && (
              <AudioPreviewPlayer
                uri={item.preview}
                playing={isPlaying}
                onFinish={() => setPlayingId(null)}
              />
            )}
          </>
        )}
      </Pressable>
    );
  };

  const isLoading = isSearching || isSaving || isFetchingInitialData;

  const updateProfileJam = async (jamData: Partial<Song> | null) => {
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
          jam_track_id: jamData?.id || null,
          jam_title: jamData?.title || null,
          jam_artist: jamData?.artist || null,
          jam_cover_url: jamData?.cover || null,
          jam_preview_url: jamData?.preview || null,
          current_registration_step: 'restaurant_picker',
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving jam to profile:', error);
        Alert.alert(t('error_saving_profile', lang), error.message);
        return false;
      }
      return true;
    } catch (e: unknown) {
      console.error('Unexpected error saving jam:', e);
      Alert.alert(t('unexpected_error', lang), e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinue = async () => {
    if (!selectedTrack || isSaving) return;
    const success = await updateProfileJam(selectedTrack);
    if (success) navigateNext('restaurant-picker');
  };

  const handleSkip = async () => {
    if (isSaving) return;
    const success = await updateProfileJam(null); // Pass null to clear jam fields
    if (success) navigateNext('restaurant-picker');
  };

  if (isFetchingInitialData && !isSaving) {
    return (
      <View style={styles.loadingScreenContainer}>
        <ActivityIndicator size="large" color={COLORS.black} />
      </View>
    );
  }

  return (
    <>
      <ScreenLayout
        title={t('jam_picker_title', lang)}
        subtitle={t('jam_picker_subtitle', lang)}
        progress={getProgress()}
        onContinue={handleContinue}
        continueDisabled={!selectedTrack || isLoading}
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
          <View style={styles.searchBox}>
            <SearchIcon width={20} height={20} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('jam_picker_placeholder', lang)}
              placeholderTextColor={COLORS.grey1}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              editable={!isLoading}
            />
          </View>

          <View style={styles.listContainer}>
            {isSearching && <ActivityIndicator style={styles.loader} color={COLORS.black} />}
            {searchError && !isSearching && <Text style={styles.errorText}>{searchError}</Text>}

            {!isSearching &&
              tracks.length === 0 &&
              debouncedQuery.trim() !== '' &&
              !searchError && (
                <Text style={styles.infoText}>
                  {t('jam_picker_no_results', lang, { query: debouncedQuery })}
                </Text>
              )}
            {!isSearching &&
              tracks.length === 0 &&
              debouncedQuery.trim() === '' &&
              !searchError &&
              !selectedTrack && (
                <Text style={styles.infoText}>{t('jam_picker_initial_prompt', lang)}</Text>
              )}

            <FlatList
              data={tracks}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContentContainer}
              showsVerticalScrollIndicator={false}
              style={styles.listStyle}
              ListHeaderComponent={
                selectedTrack &&
                !tracks.find((track) => track.id === selectedTrack.id) &&
                !isSearching ? (
                  // If selected track is not in current search results, show it at the top
                  <View>
                    <Text style={styles.currentJamLabel}>{t('jam_picker_current_jam', lang)}</Text>
                    {renderItem({ item: selectedTrack })}
                    <View style={styles.separator} />
                  </View>
                ) : null
              }
            />
          </View>
        </KeyboardAvoidingView>
      </ScreenLayout>
    </>
  );
};

export default JamPickerScreen;

const styles = StyleSheet.create({
  searchBox: {
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
  searchInput: {
    flex: 1,
    fontSize: 17,
    color: COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    marginLeft: 12,
  },
  listContainer: {
    flex: 1,
    maxHeight: '70%',
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingTop: 12,
    borderWidth: 1,
    borderColor: COLORS.grey0,
  },
  loader: { marginVertical: 24 },
  errorText: {
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
  listContentContainer: { paddingTop: 8, paddingBottom: 16 },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.grey0,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    backgroundColor: COLORS.white,
  },
  songRowSelected: { borderColor: COLORS.black, borderWidth: 2 },
  songCover: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: COLORS.grey0,
  },
  songTitle: {
    fontSize: 16,
    color: COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    marginBottom: 2,
  },
  songArtist: { fontSize: 14, color: COLORS.grey3 },
  playIcon: {
    fontSize: 22,
    color: COLORS.grey2,
    paddingHorizontal: 8,
    marginLeft: 'auto',
  },
  loadingScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  currentJamLabel: {
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
1. Assurez-vous que la table `profiles` dans Supabase a les colonnes pour stocker les informations du jam:
   - `jam_track_id` (TEXT ou BIGINT, selon l'ID iTunes)
   - `jam_title` (TEXT)
   - `jam_artist` (TEXT)
   - `jam_cover_url` (TEXT)
   - `jam_preview_url` (TEXT)

2. Ajoutez/vérifiez les clés de traduction:
   "jam_picker_title": "What's your jam?"
   "jam_picker_subtitle": "Pick a song that represents you or your current mood."
   "jam_picker_placeholder": "Search songs or artists..."
   "jam_picker_no_results": "No results found for \"{{query}}\"."
   "jam_picker_initial_prompt": "Search for a song to set as your jam!"
   "jam_picker_current_jam": "Your Current Jam:"
   "error_network_request": "Network error. Please check your connection and try again."
   (et les clés génériques comme "skip", "continue", "error_session_expired_title", "error_saving_profile", "unexpected_error")

3. Testez la recherche, la sélection, la lecture/pause, la sauvegarde, le skip, et le pré-remplissage.
   - Le hook `useAudioPlayer` de `expo-audio` est utilisé. Assurez-vous que ce package est installé et configuré
     si vous l'utilisez, ou remplacez-le par `expo-av` (`Audio.Sound`) si `expo-audio` n'est pas le bon package
     ou si vous préférez une gestion plus manuelle. La logique de `onFinish` dans `AudioPreviewPlayer` est une
     approximation et pourrait nécessiter un ajustement avec l'API audio réelle que vous utilisez.
     Si `expo-audio` n'est pas ce que vous vouliez, il faudra remplacer `useAudioPlayer`.
     Pour `expo-av`, la gestion serait plus comme:
     `const [sound, setSound] = useState<Audio.Sound | null>(null);`
     `async function playSound(uri) { ... await Audio.Sound.createAsync({ uri }); ... await void sound.playAsync(); }`
     `useEffect(() => { return sound ? () => { void sound.unloadAsync(); } : undefined; }, [sound]);`

4. La gestion de l'état `isFetchingInitialData` et `debouncedQuery` a été ajoutée pour améliorer l'expérience
   de recherche initiale et de chargement.
*/
