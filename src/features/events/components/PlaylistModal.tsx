import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomModal from './BottomModal';

interface Song {
  id: string;
  title: string;
  artist: string;
  albumArt?: string;
}

interface PlaylistModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (playlist: Song[], spotifyLink?: string) => void;
}

export default function PlaylistModal({
  visible,
  onClose,
  onSave,
}: PlaylistModalProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [spotifyLink, setSpotifyLink] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  // Demo songs for search results
  const demoSongs: Song[] = [
    { id: '1', title: 'Flowers', artist: 'Miley Cyrus', albumArt: 'https://i.pravatar.cc/150?img=10' },
    { id: '2', title: 'As It Was', artist: 'Harry Styles', albumArt: 'https://i.pravatar.cc/150?img=11' },
    { id: '3', title: 'Anti-Hero', artist: 'Taylor Swift', albumArt: 'https://i.pravatar.cc/150?img=12' },
    { id: '4', title: 'Unholy', artist: 'Sam Smith & Kim Petras', albumArt: 'https://i.pravatar.cc/150?img=13' },
  ];

  const [searchResults, setSearchResults] = useState<Song[]>([]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      // Simulate search results
      const results = demoSongs.filter(song => 
        song.title.toLowerCase().includes(query.toLowerCase()) ||
        song.artist.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const addSong = (song: Song) => {
    if (!songs.find(s => s.id === song.id)) {
      setSongs([...songs, song]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeSong = (id: string) => {
    setSongs(songs.filter(song => song.id !== id));
  };

  const handleSave = () => {
    onSave(songs, spotifyLink);
    onClose();
  };

  const toggleLinking = () => {
    setIsLinking(!isLinking);
    if (isLinking) {
      setSpotifyLink('');
    }
  };

  return (
    <BottomModal
      visible={visible}
      onClose={onClose}
      title="Playlist"
      height={700}
      onSave={handleSave}
      saveButtonText="Save Playlist"
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Search songs or artists"
              placeholderTextColor="#999"
            />
          </View>

          {searchResults.length > 0 && (
            <View style={styles.searchResults}>
              {searchResults.map((song) => (
                <TouchableOpacity
                  key={song.id}
                  style={styles.searchResultItem}
                  onPress={() => addSong(song)}
                >
                  <Image source={{ uri: song.albumArt }} style={styles.albumArt} />
                  <View style={styles.songInfo}>
                    <Text style={styles.songTitle}>{song.title}</Text>
                    <Text style={styles.artistName}>{song.artist}</Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.linkSection}>
          <TouchableOpacity style={styles.linkButton} onPress={toggleLinking}>
            <Ionicons name="link-outline" size={20} color="#007AFF" />
            <Text style={styles.linkButtonText}>
              {isLinking ? 'Cancel Spotify Link' : 'Link Spotify Playlist'}
            </Text>
          </TouchableOpacity>

          {isLinking && (
            <TextInput
              style={styles.linkInput}
              value={spotifyLink}
              onChangeText={setSpotifyLink}
              placeholder="Paste Spotify playlist URL"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
          )}
        </View>

        {songs.length > 0 && (
          <View style={styles.playlistSection}>
            <Text style={styles.sectionTitle}>Your Playlist</Text>
            {songs.map((song) => (
              <View key={song.id} style={styles.playlistItem}>
                <Image source={{ uri: song.albumArt }} style={styles.albumArt} />
                <View style={styles.songInfo}>
                  <Text style={styles.songTitle}>{song.title}</Text>
                  <Text style={styles.artistName}>{song.artist}</Text>
                </View>
                <TouchableOpacity onPress={() => removeSong(song.id)}>
                  <Ionicons name="close-circle" size={24} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {songs.length === 0 && !isLinking && (
          <View style={styles.emptyState}>
            <Ionicons name="musical-notes-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyStateText}>No songs added yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Search for songs or link a Spotify playlist
            </Text>
          </View>
        )}
      </ScrollView>
    </BottomModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 20,
  },
  searchSection: {
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  searchResults: {
    marginTop: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  linkSection: {
    marginBottom: 24,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  linkButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  linkInput: {
    marginTop: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  playlistSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  albumArt: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
  },
  songInfo: {
    flex: 1,
    marginLeft: 12,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  artistName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 8,
    textAlign: 'center',
  },
});