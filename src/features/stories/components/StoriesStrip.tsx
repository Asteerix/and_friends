import React, { useState, useRef, useEffect } from 'react';
import { FlatList, View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Animated } from 'react-native';

import { useProfile } from '@/hooks/useProfile';
import { useStories } from '@/shared/providers/StoriesContext';
import { useSession } from '@/shared/providers/SessionContext';

import MemoryItem from './MemoryItem';

export default function StoriesStrip() {
  const { stories, loading } = useStories();
  const { session } = useSession();
  const { profile } = useProfile();
  const [activeTab, setActiveTab] = useState<'discover' | 'following'>('discover');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [stories]);

  // Group stories by user
  const storiesByUser = stories.reduce((acc: Record<string, any[]>, story) => {
    const userId = story.user_id;
    if (!acc[userId]) {
      acc[userId] = [];
    }
    acc[userId].push(story);
    return acc;
  }, {});

  // Check if current user has active stories
  const userHasActiveStory = stories.some(story => story.user_id === session?.user?.id);
  
  console.log('[StoriesStrip] User has active story:', userHasActiveStory, 'Total stories:', stories.length);
  console.log('[StoriesStrip] Stories grouped by user:', Object.keys(storiesByUser).length, 'users');
  console.log('[StoriesStrip] Current user ID:', session?.user?.id);
  console.log('[StoriesStrip] Stories:', stories.map(s => ({ id: s.id, user_id: s.user_id })));

  // Create memory items - one per user
  const memoryItems = Object.entries(storiesByUser).map(([userId, userStories]) => {
    const firstStory = userStories[0];
    const latestStory = userStories.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
    
    // Check if all stories from this user have been viewed
    const allViewed = userStories.every(story => 
      story.viewed_by?.includes(session?.user?.id || '') || false
    );
    
    return {
      id: userId,
      type: 'story' as const,
      user_id: userId,
      imageUri: latestStory.media_url,
      avatarUri: firstStory.user?.avatar_url || `https://i.pravatar.cc/150?u=${userId}`,
      username: `@${firstStory.user?.full_name?.toLowerCase().replace(/\s/g, '') || 'user'}`,
      userId: userId,
      isOwn: userId === session?.user?.id,
      hasActiveStory: true,
      isViewed: allViewed,
      storiesCount: userStories.length,
    };
  });

  // Add current user as first item for adding new story
  const data = [
    {
      id: 'add-story',
      type: 'add' as const,
      user_id: session?.user?.id,
      imageUri: profile?.avatar_url || `https://i.pravatar.cc/150?u=${session?.user?.id}`,
      avatarUri: profile?.avatar_url || `https://i.pravatar.cc/150?u=${session?.user?.id}`,
      username: null,
      userId: session?.user?.id,
      hasActiveStory: userHasActiveStory,
      isViewed: false,
      isOwn: true,
      storiesCount: 0,
    },
    ...memoryItems.sort((a, b) => {
      // Current user's stories always first (after add button)
      if (a.isOwn && !b.isOwn) return -1;
      if (!a.isOwn && b.isOwn) return 1;
      // Then unviewed stories
      if (!a.isViewed && b.isViewed) return -1;
      if (a.isViewed && !b.isViewed) return 1;
      return 0;
    }),
  ];

  if (loading && stories.length === 0) {
    return (
      <View style={[styles.container, styles.loading]}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'discover' && styles.activeTab]}
          onPress={() => setActiveTab('discover')}
        >
          <Text style={[styles.tabText, activeTab === 'discover' && styles.activeTabText]}>
            Discover
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'following' && styles.activeTab]}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>
            Following
          </Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        renderItem={({ item }) => (
          <MemoryItem 
            imageUri={item.imageUri} 
            avatarUri={item.avatarUri} 
            type={item.type as any} 
            username={item.username}
            userId={item.userId}
            isOwn={item.isOwn}
            hasActiveStory={item.hasActiveStory}
            isViewed={item.isViewed}
          />
        )}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  loading: {
    alignItems: 'center',
    height: 140,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 32,
  },
  tab: {
    paddingBottom: 4,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingLeft: 0,
    paddingRight: 20,
    paddingBottom: 4,
  },
});
