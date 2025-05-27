// JamPickerScreen.tsx
// ---------------------------------------------------------------------------
import { StackNavigationProp } from "@react-navigation/stack";
import { useAudioPlayer } from "expo-audio"; // Assurez-vous que ce package est bien géré ou remplacé si besoin
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native"; // Ajout

import ScreenLayout from "@/components/ScreenLayout";
import { supabase } from "@/lib/supabase";
import { getDeviceLanguage, t } from "../../../locales";
import { AuthStackParamList } from "@/navigation/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type NavProp = StackNavigationProp<AuthStackParamList, "JamPicker">;

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
  white: "#FFFFFF",
  black: "#000000",
  grey0: "#E5E5E5",
  grey1: "#AEB0B4",
  grey2: "#666666",
  grey3: "#555555",
  error: "#D32F2F",
};
const JAM_PICKER_PROGRESS = 0.9; // Ajusté, proche de la fin
const NEXT_SCREEN_NAME: keyof AuthStackParamList = "RestaurantPicker";
// const NEXT_REGISTRATION_STEP_VALUE = "restaurant_picker"; // Supprimé

// ---------------------------------------------------------------------------
// Hooks & Helpers
// ---------------------------------------------------------------------------
const useDebounce = (value: string, delay = 400) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

const AudioPreviewPlayer: React.FC<{
  uri: string;
  playing: boolean;
  onFinish: () => void;
}> = ({ uri, playing, onFinish }) => {
  const player = useAudioPlayer(uri); // Ce hook vient de "expo-audio"
  useEffect(() => {
    if (playing) player.play();
    else player.pause();
    return () => player.pause();
  }, [playing, player]);

  useEffect(() => {
    // Simple check pour onFinish, peut nécessiter une logique plus robuste avec expo-av
    const interval = setInterval(() => {
      // Check if playback has finished
      if (
        player.playing === false &&
        player.currentTime > 0 &&
        player.duration > 0 &&
        player.currentTime >= player.duration - 100 &&
        playing
      ) {
        // -100ms buffer
        onFinish();
      }
      // Note: Direct error property check removed as it's not standard on expo-audio's player type.
      // Error handling would typically be done via status updates or specific error callbacks if provided by the library.
    }, 500);
    return () => clearInterval(interval);
  }, [player, playing, onFinish, uri]);
  return null;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const JamPickerScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const lang = getDeviceLanguage();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query);
  const [tracks, setTracks] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<Song | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingInitialData, setIsFetchingInitialData] = useState(true);

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
            .from("profiles")
            .select(
              "jam_track_id, jam_title, jam_artist, jam_cover_url, jam_preview_url"
            )
            .eq("id", user.id)
            .single();

          if (error && error.code !== "PGRST116") {
            console.error("Error fetching initial jam:", error);
          } else if (data && data.jam_track_id) {
            setSelectedTrack({
              id: data.jam_track_id,
              title: data.jam_title || "",
              artist: data.jam_artist || "",
              cover: data.jam_cover_url || "",
              preview: data.jam_preview_url || null,
            });
            // Optionnel: si le jam initial est sélectionné, on pourrait vouloir l'afficher même si la recherche est vide
            // ou pré-remplir la recherche avec le titre/artiste. Pour l'instant, on le sélectionne juste.
          }
        } catch (e) {
          console.error("Unexpected error fetching initial jam:", e);
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
        : selectedTrack?.title || "love songs"; // Default search
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
        if (!resp.ok)
          throw new Error(
            `iTunes API request failed with status ${resp.status}`
          );
        const json = await resp.json();
        if (json.results && Array.isArray(json.results)) {
          const result: Song[] = json.results.map((r: any) => ({
            id: r.trackId.toString(),
            title: r.trackName,
            artist: r.artistName,
            cover: r.artworkUrl100
              ? r.artworkUrl100.replace("100x100", "200x200")
              : "",
            preview: r.previewUrl || null,
          }));
          setTracks(result);
        } else {
          setTracks([]);
        }
      } catch (err: any) {
        console.error("iTunes fetch error:", err);
        setSearchError(t("error_network_request", lang)); // Clé à ajouter
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
            <Pressable
              hitSlop={8}
              onPress={() => togglePlay(item)}
              disabled={isSaving}
            >
              <Text
                style={[styles.playIcon, isPlaying && { color: COLORS.black }]}
              >
                {isPlaying ? "⏸" : "▶"}
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
      Alert.alert(
        t("error_session_expired_title", lang),
        t("error_session_expired_message", lang)
      );
      return false;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          jam_track_id: jamData?.id || null,
          jam_title: jamData?.title || null,
          jam_artist: jamData?.artist || null,
          jam_cover_url: jamData?.cover || null,
          jam_preview_url: jamData?.preview || null,
          current_registration_step: "restaurant_picker",
        })
        .eq("id", user.id);

      if (error) {
        console.error("Error saving jam to profile:", error);
        Alert.alert(t("error_saving_profile", lang), error.message);
        return false;
      }
      return true;
    } catch (e: any) {
      console.error("Unexpected error saving jam:", e);
      Alert.alert(t("unexpected_error", lang), e.message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinue = async () => {
    if (!selectedTrack || isSaving) return;
    const success = await updateProfileJam(selectedTrack);
    if (success) navigation.navigate(NEXT_SCREEN_NAME);
  };

  const handleSkip = async () => {
    if (isSaving) return;
    const success = await updateProfileJam(null); // Pass null to clear jam fields
    if (success) navigation.navigate(NEXT_SCREEN_NAME);
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
        navigation={navigation}
        title={t("jam_picker_title", lang)}
        subtitle={t("jam_picker_subtitle", lang)}
        progress={JAM_PICKER_PROGRESS}
        onContinue={handleContinue}
        continueDisabled={!selectedTrack || isLoading}
        showAltLink={true}
        altLinkText={t("skip", lang)}
        onAltLinkPress={handleSkip}
      >
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={t("jam_picker_placeholder", lang)}
            placeholderTextColor={COLORS.grey1}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            editable={!isLoading}
          />
        </View>

        {isSearching && (
          <ActivityIndicator style={styles.loader} color={COLORS.black} />
        )}
        {searchError && !isSearching && (
          <Text style={styles.errorText}>{searchError}</Text>
        )}

        {!isSearching &&
          tracks.length === 0 &&
          debouncedQuery.trim() !== "" &&
          !searchError && (
            <Text style={styles.infoText}>
              {t("jam_picker_no_results", lang, { query: debouncedQuery })}
            </Text>
          )}
        {!isSearching &&
          tracks.length === 0 &&
          debouncedQuery.trim() === "" &&
          !searchError &&
          !selectedTrack && (
            <Text style={styles.infoText}>
              {t("jam_picker_initial_prompt", lang)}
            </Text>
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
            !tracks.find((t) => t.id === selectedTrack.id) &&
            !isSearching ? (
              // If selected track is not in current search results, show it at the top
              <View>
                <Text style={styles.currentJamLabel}>
                  {t("jam_picker_current_jam", lang)}
                </Text>
                {renderItem({ item: selectedTrack })}
                <View style={styles.separator} />
              </View>
            ) : null
          }
        />
      </ScreenLayout>
    </>
  );
};

export default JamPickerScreen;

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.grey0,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 16,
  },
  searchIcon: { fontSize: 18, color: COLORS.grey2, marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 17,
    color: COLORS.black,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
  },
  loader: { marginVertical: 24 },
  errorText: {
    color: COLORS.error,
    marginVertical: 12,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  infoText: {
    color: COLORS.grey3,
    marginVertical: 20,
    textAlign: "center",
    paddingHorizontal: 20,
    fontSize: 16,
  },
  listStyle: { flex: 1, width: "100%" },
  listContentContainer: { paddingTop: 8, paddingBottom: 120 },
  songRow: {
    flexDirection: "row",
    alignItems: "center",
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
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
    marginBottom: 2,
  },
  songArtist: { fontSize: 14, color: COLORS.grey3 },
  playIcon: {
    fontSize: 22,
    color: COLORS.grey2,
    paddingHorizontal: 8,
    marginLeft: "auto",
  },
  loadingScreenContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  currentJamLabel: {
    fontSize: 14,
    color: COLORS.grey3,
    fontWeight: "bold",
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
     `async function playSound(uri) { ... await Audio.Sound.createAsync({ uri }); ... await sound.playAsync(); }`
     `useEffect(() => { return sound ? () => { sound.unloadAsync(); } : undefined; }, [sound]);`

4. La gestion de l'état `isFetchingInitialData` et `debouncedQuery` a été ajoutée pour améliorer l'expérience
   de recherche initiale et de chargement.
*/