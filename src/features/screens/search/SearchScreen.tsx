import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Keyboard,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import EventCardNew from "@/components/EventCardNew";
import { useEvents } from "@/hooks/useEvents";
import { useProfile } from "@/hooks/useProfile";

const { width } = Dimensions.get('window');

const categories = [
  { id: 'all', name: 'All', icon: 'grid' },
  { id: 'sports', name: 'Sports', icon: 'basketball' },
  { id: 'music', name: 'Music', icon: 'musical-notes' },
  { id: 'arts', name: 'Arts', icon: 'color-palette' },
  { id: 'food', name: 'Food', icon: 'restaurant' },
  { id: 'gaming', name: 'Gaming', icon: 'game-controller' },
];

export default function SearchScreen() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState<'events' | 'people'>('events');
  const { events } = useEvents();
  const { fetchAllProfiles } = useProfile();
  const [profiles, setProfiles] = useState<any[]>([]);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    searchInputRef.current?.focus();
    
    // Load profiles
    const loadProfiles = async () => {
      const result = await fetchAllProfiles();
      if (result) {
        setProfiles(result.profiles);
      }
    };
    loadProfiles();
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredPeople = profiles?.filter(profile => {
    return profile.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.display_name?.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  const renderSearchResults = () => {
    if (activeTab === 'events') {
      if (filteredEvents.length === 0) {
        return (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateEmoji}>🔍</Text>
            <Text style={styles.emptyStateText}>No events found</Text>
            <Text style={styles.emptyStateSubtext}>Try a different search term</Text>
          </View>
        );
      }

      return (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id || ''}
          renderItem={({ item }) => (
            <EventCardNew event={item} style={styles.eventCard} />
          )}
          contentContainerStyle={styles.resultsContainer}
          showsVerticalScrollIndicator={false}
        />
      );
    } else {
      if (filteredPeople.length === 0) {
        return (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateEmoji}>👥</Text>
            <Text style={styles.emptyStateText}>No people found</Text>
            <Text style={styles.emptyStateSubtext}>Try a different search term</Text>
          </View>
        );
      }

      return (
        <FlatList
          data={filteredPeople}
          keyExtractor={(item) => item.id || ''}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.personCard}
              onPress={() => navigation.navigate('PersonCard' as never, { person: item } as never)}
            >
              <View style={styles.personAvatar}>
                <Text style={styles.personAvatarText}>
                  {item.display_name?.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.personInfo}>
                <Text style={styles.personName}>{item.display_name}</Text>
                <Text style={styles.personUsername}>@{item.username}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.resultsContainer}
          showsVerticalScrollIndicator={false}
        />
      );
    }
  };

  return (
    <View style={styles.container}>
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
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search events, people..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'events' && styles.activeTab]}
            onPress={() => setActiveTab('events')}
          >
            <Text style={[styles.tabText, activeTab === 'events' && styles.activeTabText]}>
              Events
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'people' && styles.activeTab]}
            onPress={() => setActiveTab('people')}
          >
            <Text style={[styles.tabText, activeTab === 'people' && styles.activeTabText]}>
              People
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'events' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
            contentContainerStyle={styles.categoriesContent}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  selectedCategory === category.id && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Ionicons
                  name={category.icon as any}
                  size={16}
                  color={selectedCategory === category.id ? 'white' : '#666'}
                />
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === category.id && styles.categoryTextActive,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </Animated.View>

      <Animated.View
        style={[
          styles.resultsWrapper,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        {renderSearchResults()}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 60,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  tab: {
    marginRight: 25,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#45B7D1',
  },
  tabText: {
    fontSize: 16,
    color: '#999',
    paddingBottom: 8,
  },
  activeTabText: {
    color: '#333',
    fontWeight: '600',
  },
  categoriesContainer: {
    maxHeight: 40,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: '#45B7D1',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  categoryTextActive: {
    color: 'white',
    fontWeight: '500',
  },
  resultsWrapper: {
    flex: 1,
  },
  resultsContainer: {
    paddingTop: 20,
    paddingBottom: 100,
  },
  eventCard: {
    marginHorizontal: 20,
    marginBottom: 15,
  },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 15,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  personAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#45B7D1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  personAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  personUsername: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyStateEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#999',
  },
});