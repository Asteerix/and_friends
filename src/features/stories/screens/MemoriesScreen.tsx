import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { useStories } from '@/hooks/useStories';
import { useSupabaseStorage } from '@/shared/hooks/useSupabaseStorage';
import { supabase } from '@/shared/lib/supabase/client';
import { useSession } from '@/shared/providers/SessionContext';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 48) / 2;

interface Memory {
  id: string;
  event_id: string;
  title: string;
  description?: string;
  image_url?: string;
  created_at: string;
  event?: {
    title: string;
    date: string;
    location?: string;
  };
}
export default function MemoriesScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Use stories hook for real-time stories
  const { stories, loading: storiesLoading, createStory, viewStory } = useStories();
  const { pickImage, uploadImage } = useSupabaseStorage();

  useEffect(() => {
    if (session?.user) {
      fetchMemoriesAndStories();
    }
  }, [session]);

  const fetchMemoriesAndStories = async () => {
    if (!session?.user) return;

    setLoading(true);
    try {
      // Fetch memories from events the user participated in
      const { data: eventParticipations } = await supabase
        .from('event_participants')
        .select(
          `
          event_id,
          events (
            id,
            title,
            description,
            date,
            location,
            image_url,
            created_at
          )
        `
        )
        .eq('user_id', session.user.id);

      const memoriesData =
        eventParticipations?.map((participation: any) => ({
          id: participation.events.id,
          event_id: participation.events.id,
          title: participation.events.title,
          description: participation.events.description,
          image_url: participation.events.image_url,
          created_at: participation.events.created_at,
          event: {
            title: participation.events.title,
            date: participation.events.date,
            location: participation.events.location,
          },
        })) || [];

      setMemories(memoriesData);

      // Stories are now handled by the useStories hook with real-time updates
    } catch (error) {
      console.error('Error fetching memories and stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMemoriesAndStories();
    setRefreshing(false);
  };

  const handleAddStory = async () => {
    const imageResult = await pickImage();
    if (imageResult && imageResult.uri) {
      try {
        const url = await uploadImage(imageResult.uri, 'stories');
        await createStory({
          media_url: url,
          media_type: 'image',
        });
      } catch (error) {
        console.error('Error creating story:', error);
      }
    }
  };

  const renderStoryItem = ({ item }: { item: any }) => {
    const isAddButton = item.id === 'add-story';

    if (isAddButton) {
      return (
        <TouchableOpacity style={styles.storyItem} onPress={handleAddStory}>
          <View style={[styles.storyImage, styles.addStoryButton]}>
            <Ionicons name="add" size={32} color="#666" />
          </View>
          <Text style={styles.storyName} numberOfLines={1}>
            Ajouter
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity style={styles.storyItem} onPress={() => viewStory(item.id)}>
        <Image source={{ uri: item.media_url }} style={styles.storyImage} />
        <View style={styles.storyOverlay}>
          <Image
            source={{ uri: item.user?.avatar_url || 'https://via.placeholder.com/32' }}
            style={styles.storyAvatar}
          />
        </View>
        <Text style={styles.storyName} numberOfLines={1}>
          {item.user?.full_name || 'Unknown'}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderMemoryItem = ({ item }: { item: Memory }) => (
    <TouchableOpacity
      style={styles.memoryItem}
      onPress={() => {
        // Navigate to event details
        void router.push(`/event-details?eventId=${item.event_id}`);
      }}
    >
      <Image
        source={{
          uri: item.image_url || 'https://picsum.photos/400/300?random=' + item.id,
        }}
        style={styles.memoryImage}
      />
      <View style={styles.memoryOverlay}>
        <Text style={styles.memoryTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.memoryDate}>
          {new Date(item.event?.date || item.created_at).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
        {item.event?.location && (
          <Text style={styles.memoryLocation} numberOfLines={1}>
            <Ionicons name="location-outline" size={12} color="#FFF" />
            {' ' + item.event.location}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={24} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Souvenirs</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            // Navigate to add memory/story
          }}
        >
          <Ionicons name="add-outline" size={24} color="#222" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Stories</Text>
            <Text style={styles.sectionSubtitle}>Disparaissent dans 24h</Text>
          </View>
          {storiesLoading ? (
            <View style={styles.storiesLoading}>
              <ActivityIndicator size="small" color="#666" />
            </View>
          ) : (
            <FlatList
              data={[{ id: 'add-story' }, ...stories]}
              renderItem={renderStoryItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.storiesList}
            />
          )}
        </View>

        {/* Memories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vos souvenirs</Text>
            <Text style={styles.sectionSubtitle}>
              {memories.length} événement{memories.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {memories.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="images-outline" size={64} color="#CCC" />
              <Text style={styles.emptyTitle}>Aucun souvenir</Text>
              <Text style={styles.emptySubtitle}>
                Participez à des événements pour créer des souvenirs
              </Text>
            </View>
          ) : (
            <FlatList
              data={memories}
              renderItem={renderMemoryItem}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.memoryRow}
              scrollEnabled={false}
            />
          )}
        </View>

        {/* Year in Review Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Votre année</Text>
            <Text style={styles.sectionSubtitle}>Rétrospective 2024</Text>
          </View>

          <TouchableOpacity style={styles.yearReviewCard}>
            <Image
              source={{ uri: 'https://picsum.photos/400/200?random=year' }}
              style={styles.yearReviewImage}
            />
            <View style={styles.yearReviewOverlay}>
              <Text style={styles.yearReviewTitle}>Votre année 2024</Text>
              <Text style={styles.yearReviewSubtitle}>
                {memories.length} événements • Découvrez vos moments forts
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingVertical: 20,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  storiesList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  storyItem: {
    alignItems: 'center',
    width: 80,
  },
  storyImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E5E5E5',
  },
  addStoryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
  },
  storiesLoading: {
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  storyOverlay: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 3,
    borderColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyAvatar: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  storyName: {
    fontSize: 12,
    color: '#222',
    marginTop: 8,
    textAlign: 'center',
  },
  memoryRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  memoryItem: {
    width: ITEM_WIDTH,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  memoryImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#E5E5E5',
  },
  memoryOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  memoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  memoryDate: {
    fontSize: 12,
    color: '#FFF',
    opacity: 0.8,
    marginBottom: 2,
  },
  memoryLocation: {
    fontSize: 11,
    color: '#FFF',
    opacity: 0.8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  yearReviewCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  yearReviewImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#E5E5E5',
  },
  yearReviewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  yearReviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  yearReviewSubtitle: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
  },
});
