import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SearchIcon from '@/assets/svg/search.svg';

interface Song {
  id: string;
  title: string;
  artist: string;
  cover: string;
  preview: string | null;
}

interface MusicPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (song: Song) => void;
  currentSong?: Song | null;
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

export default function MusicPickerModal({
  visible,
  onClose,
  onSelect,
  currentSong,
}: MusicPickerModalProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query);
  const [tracks, setTracks] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<Song | null>(currentSong || null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    if (visible && currentSong) {
      setSelectedTrack(currentSong);
    }
  }, [visible, currentSong]);

  useEffect(() => {
    const fetchTracks = async () => {
      const searchTerm = debouncedQuery.trim() || 'top songs 2024';

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
        setSearchError('Network error. Please try again.');
        setTracks([]);
      } finally {
        setIsSearching(false);
      }
    };

    if (visible) {
      fetchTracks();
    }
  }, [debouncedQuery, visible]);

  const togglePlay = useCallback((track: Song) => {
    if (!track.preview) return;
    setPlayingId((prev) => (prev === track.id ? null : track.id));
  }, []);

  const handleSelectTrack = (track: Song) => {
    setSelectedTrack(track);
    setPlayingId(null);
  };

  const handleConfirm = () => {
    if (selectedTrack) {
      onSelect(selectedTrack);
      onClose();
    }
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
            <Pressable hitSlop={8} onPress={() => togglePlay(item)}>
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
            <Text style={styles.title}>What's your jam?</Text>
            <Text style={styles.subtitle}>Pick a song that represents you</Text>
          </View>

          <View style={styles.searchBox}>
            <SearchIcon width={20} height={20} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search songs or artists..."
              placeholderTextColor={COLORS.grey1}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />
          </View>

          <View style={styles.listContainer}>
            {isSearching && <ActivityIndicator style={styles.loader} color={COLORS.black} />}
            {searchError && !isSearching && <Text style={styles.errorText}>{searchError}</Text>}

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
                  <View>
                    <Text style={styles.currentJamLabel}>Your Current Jam</Text>
                    {renderItem({ item: selectedTrack })}
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
              style={[styles.confirmButton, !selectedTrack && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={!selectedTrack}
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
  searchBox: {
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
  searchInput: {
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
  errorText: {
    color: COLORS.error,
    marginVertical: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  listStyle: { flex: 1 },
  listContentContainer: {
    paddingTop: 4,
    paddingBottom: 20,
    flexGrow: 1,
  },
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
  currentJamLabel: {
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
