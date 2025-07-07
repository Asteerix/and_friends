import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useState, useRef, useEffect } from 'react';
import {
  Animated,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useEventsAdvanced } from '@/hooks/useEventsAdvanced';
import { useProfile } from '@/hooks/useProfile';
import CustomText from '@/shared/ui/CustomText';

interface SearchResult {
  id: string;
  type: 'user' | 'event';
  title: string;
  subtitle?: string;
  image?: string;
  data: any;
}

const recentSearches = [
  'John Doe',
  'Birthday Party',
  'Wine Tasting',
  'Sarah Smith',
  'Concert Night',
];

const categories = [
  { id: 'all', name: 'All', emoji: '🔍' },
  { id: 'people', name: 'People', emoji: '👥' },
  { id: 'events', name: 'Events', emoji: '🎉' },
  { id: 'nearby', name: 'Nearby', emoji: '📍' },
];

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const { fetchAllProfiles } = useProfile();
  const { events } = useEventsAdvanced();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (searchQuery.length > 0) {
      performSearch();
    } else {
      setResults([]);
      setIsSearching(false);
    }
  }, [searchQuery, selectedCategory]);

  const performSearch = async () => {
    setIsSearching(true);

    try {
      const searchResults: SearchResult[] = [];

      // Search users
      if (selectedCategory === 'all' || selectedCategory === 'people') {
        const profilesData = await fetchAllProfiles();
        const profiles = profilesData.profiles || [];
        const userResults = profiles
          .filter(
            (profile: any) =>
              profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              profile.username?.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((profile: any) => ({
            id: profile.id,
            type: 'user' as const,
            title: profile.full_name || profile.username || 'Unknown',
            subtitle: profile.username ? `@${profile.username}` : profile.bio,
            image: profile.avatar_url,
            data: profile,
          }));

        searchResults.push(...userResults);
      }

      // Search events
      if (selectedCategory === 'all' || selectedCategory === 'events') {
        const eventResults = events
          .filter(
            (event) =>
              event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              event.description?.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((event) => ({
            id: event.id,
            type: 'event' as const,
            title: event.title,
            subtitle: event.location,
            image: event.image_url,
            data: event,
          }));

        searchResults.push(...eventResults);
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleResultPress = (result: SearchResult) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (result.type === 'user') {
      void router.push(`/person-card?userId=${result.id}`);
    } else if (result.type === 'event') {
      void router.push(`/event-details?eventId=${result.id}`);
    }
  };

  const handleRecentSearchPress = (search: string) => {
    setSearchQuery(search);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleResultPress(item)}
      activeOpacity={0.7}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.resultImage} />
      ) : (
        <View style={[styles.resultImage, styles.placeholderImage]}>
          <CustomText size="lg">{item.type === 'user' ? '👤' : '🎉'}</CustomText>
        </View>
      )}

      <View style={styles.resultInfo}>
        <CustomText size="md" weight="bold">
          {item.title}
        </CustomText>
        {item.subtitle && (
          <CustomText size="sm" color="#666">
            {item.subtitle}
          </CustomText>
        )}
      </View>

      <CustomText size="lg" color="#999">
        ›
      </CustomText>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.searchBar}>
          <CustomText size="lg" style={styles.searchIcon}>
            🔍
          </CustomText>
          <TextInput
            style={styles.searchInput}
            placeholder="Search people, events..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <CustomText size="lg" color="#999">
                ×
              </CustomText>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
          <CustomText size="md" color="#007AFF">
            Cancel
          </CustomText>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategory === category.id && styles.selectedCategory,
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <CustomText size="md">{category.emoji}</CustomText>
            <CustomText
              size="sm"
              color={selectedCategory === category.id ? '#FFF' : '#000'}
              style={styles.categoryText}
            >
              {category.name}
            </CustomText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {searchQuery.length === 0 ? (
        <View style={styles.recentContainer}>
          <CustomText size="sm" color="#666" style={styles.sectionTitle}>
            RECENT SEARCHES
          </CustomText>
          {recentSearches.map((search, index) => (
            <TouchableOpacity
              key={index}
              style={styles.recentItem}
              onPress={() => handleRecentSearchPress(search)}
            >
              <CustomText size="md" color="#999">
                🕐
              </CustomText>
              <CustomText size="md" style={styles.recentText}>
                {search}
              </CustomText>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={renderResult}
          contentContainerStyle={styles.resultsContainer}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <CustomText size="lg" color="#666" align="center">
                {isSearching ? 'Searching...' : 'No results found'}
              </CustomText>
              <CustomText size="sm" color="#999" align="center" style={styles.emptySubtext}>
                Try searching for something else
              </CustomText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  cancelButton: {
    paddingVertical: 10,
  },
  categoriesContainer: {
    maxHeight: 50,
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  selectedCategory: {
    backgroundColor: '#000',
  },
  categoryText: {
    marginLeft: 4,
  },
  recentContainer: {
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  recentText: {
    marginLeft: 12,
  },
  resultsContainer: {
    padding: 16,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  resultImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  placeholderImage: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultInfo: {
    flex: 1,
  },
  emptyState: {
    paddingVertical: 60,
  },
  emptySubtext: {
    marginTop: 8,
  },
});
