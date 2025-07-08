import React, { createContext, useContext, ReactNode, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { PostgrestError, RealtimeChannel } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/shared/lib/supabase/client';
import { useSession } from '@/shared/providers/SessionContext';

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  type: 'photo' | 'video' | 'event_story';
  caption?: string;
  caption_position?: number;
  expires_at: string;
  created_at: string;
  viewed_by?: string[];
  views?: string[];
  user?: {
    full_name: string;
    avatar_url: string;
  };
}

interface StoriesCache {
  stories: Story[];
  timestamp: number;
}

interface StoriesContextType {
  stories: Story[];
  loading: boolean;
  error: PostgrestError | null;
  currentPage: number;
  hasMore: boolean;
  fetchStories: (forceRefresh?: boolean) => Promise<void>;
  fetchMoreStories: () => Promise<void>;
  createStory: (storyData: any) => Promise<any>;
  viewStory: (storyId: string) => Promise<void>;
  deleteStory: (storyId: string) => Promise<{ error: PostgrestError | null }>;
  getStoriesByUser: (userId: string) => Promise<any[]>;
  refreshStories: () => Promise<void>;
}

const StoriesContext = createContext<StoriesContextType | undefined>(undefined);
const CACHE_KEY = '@stories_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const PAGE_SIZE = 20;

export function StoriesProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PostgrestError | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isMountedRef = useRef(true);
  const fetchingRef = useRef(false);

  // Load stories from cache
  const loadCachedStories = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const { stories: cachedStories, timestamp }: StoriesCache = JSON.parse(cached);
        const now = Date.now();
        
        // Check if cache is still valid
        if (now - timestamp < CACHE_DURATION) {
          // Filter out expired stories
          const validStories = cachedStories.filter(story => new Date(story.expires_at) > new Date());
          if (validStories.length > 0 && isMountedRef.current) {
            setStories(validStories);
            return true;
          }
        }
      }
    } catch (err) {
      console.error('Error loading cached stories:', err);
    }
    return false;
  }, []);

  // Save stories to cache
  const saveToCache = useCallback(async (storiesToCache: Story[]) => {
    try {
      const cache: StoriesCache = {
        stories: storiesToCache,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (err) {
      console.error('Error saving stories to cache:', err);
    }
  }, []);

  // Fetch stories with pagination
  const fetchStories = useCallback(async (forceRefresh = false) => {
    if (!session?.user?.id || fetchingRef.current) return;
    
    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // Try to load from cache first if not forcing refresh
      if (!forceRefresh && currentPage === 0) {
        const cacheLoaded = await loadCachedStories();
        if (cacheLoaded) {
          setLoading(false);
          fetchingRef.current = false;
          return;
        }
      }

      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: storiesData, error: storiesError } = await supabase
        .from('stories')
        .select(`
          *,
          user:profiles!stories_user_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .range(from, to);

      if (storiesError) {
        if (isMountedRef.current) {
          setError(storiesError);
        }
        return;
      }

      const formattedStories = (storiesData || []).map((story: any) => ({
        ...story,
        user: story.user
          ? {
              full_name: story.user.full_name,
              avatar_url: story.user.avatar_url,
            }
          : undefined,
        viewed_by: story.views?.includes(session.user.id) ? [session.user.id] : [],
        views: story.views || [],
      }));

      if (isMountedRef.current) {
        if (forceRefresh || currentPage === 0) {
          setStories(formattedStories);
          await saveToCache(formattedStories);
        } else {
          setStories(prev => [...prev, ...formattedStories]);
        }
        
        setHasMore(formattedStories.length === PAGE_SIZE);
      }
    } catch (err) {
      console.error('Error fetching stories:', err);
      if (isMountedRef.current) {
        setError(err as PostgrestError);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        fetchingRef.current = false;
      }
    }
  }, [session?.user?.id, currentPage, loadCachedStories, saveToCache]);

  // Fetch more stories (pagination)
  const fetchMoreStories = useCallback(async () => {
    if (!hasMore || loading) return;
    setCurrentPage(prev => prev + 1);
  }, [hasMore, loading]);

  // Refresh stories (reset and fetch)
  const refreshStories = useCallback(async () => {
    setCurrentPage(0);
    setHasMore(true);
    await fetchStories(true);
  }, [fetchStories]);

  // Create story
  const createStory = useCallback(async (storyData: {
    image_url?: string;
    media_url?: string;
    media_type?: 'image' | 'video';
    text?: string;
    caption?: string;
    caption_position?: number;
    text_position?: { x: number; y: number };
    stickers?: unknown[];
  }) => {
    if (!session?.user?.id) {
      return { error: { message: 'Not authenticated' } };
    }

    // Check story limit
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { count, error: countError } = await supabase
      .from('stories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .gte('created_at', twentyFourHoursAgo.toISOString());

    if (countError) {
      return { error: countError };
    }

    if (count && count >= 50) {
      return {
        error: { 
          message: 'Vous avez atteint la limite de 50 stories par 24 heures. Veuillez réessayer plus tard.',
          code: 'STORY_LIMIT_REACHED'
        },
      };
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const storyType = storyData.media_type === 'video' ? 'video' : 'photo';

    const storyPayload: any = {
      user_id: session.user.id,
      media_url: storyData.image_url || storyData.media_url,
      type: storyType,
      caption: storyData.text || storyData.caption || null,
      expires_at: expiresAt.toISOString(),
      stickers: storyData.stickers || [],
    };

    if (storyData.caption_position !== undefined) {
      storyPayload.caption_position = storyData.caption_position;
    }

    const { data, error } = await supabase
      .from('stories')
      .insert([storyPayload])
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    // Refresh stories after creation
    await refreshStories();
    
    return { data, error };
  }, [session?.user?.id, refreshStories]);

  // View story
  const viewStory = useCallback(async (storyId: string) => {
    if (!session?.user?.id) return;

    try {
      const { error } = await supabase.rpc('add_story_view', {
        p_story_id: storyId,
        p_viewer_id: session.user.id
      });

      if (error) {
        console.error('Error marking story as viewed:', error);
        return;
      }
      
      // Update local state
      if (isMountedRef.current) {
        setStories((prev) => prev.map((story) => {
          if (story.id === storyId) {
            return {
              ...story,
              viewed_by: [...(story.viewed_by || []), session.user.id],
              views: [...(story.views || []), session.user.id]
            };
          }
          return story;
        }));
      }
    } catch (error) {
      console.error('Error in viewStory:', error);
    }
  }, [session?.user?.id]);

  // Delete story
  const deleteStory = useCallback(async (storyId: string) => {
    try {
      // Get story details
      const { data: story, error: fetchError } = await supabase
        .from('stories')
        .select('media_url')
        .eq('id', storyId)
        .eq('user_id', session?.user?.id)
        .single();

      if (fetchError) {
        return { error: fetchError };
      }

      // Delete from storage
      if (story?.media_url) {
        const url = new URL(story.media_url);
        const pathParts = url.pathname.split('/');
        const bucketIndex = pathParts.indexOf('stories');
        
        if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
          const filePath = pathParts.slice(bucketIndex + 1).join('/');
          
          const { error: storageError } = await supabase.storage
            .from('stories')
            .remove([filePath]);
          
          if (storageError) {
            console.error('Error deleting file from storage:', storageError);
          }
        }
      }

      // Delete the story record
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId)
        .eq('user_id', session?.user?.id);

      if (!error && isMountedRef.current) {
        setStories((prev) => prev.filter((s) => s.id !== storyId));
      }
      
      return { error };
    } catch (error) {
      return { error: error as PostgrestError };
    }
  }, [session?.user?.id]);

  // Get stories by user
  const getStoriesByUser = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select(`
          *,
          user:profiles!user_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching user stories:', error);
        return [];
      }

      const formattedStories = (data || []).map((story: any) => ({
        id: story.id,
        image_url: story.media_url,
        text: story.caption,
        caption_position: story.caption_position,
        created_at: story.created_at,
        user: {
          id: story.user?.id || userId,
          display_name: story.user?.username || story.user?.full_name || 'Unknown',
          avatar_url: story.user?.avatar_url || '',
        },
      }));

      return formattedStories;
    } catch (err) {
      console.error('Error getting stories by user:', err);
      return [];
    }
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    if (!session?.user?.id) return;

    // Initial fetch
    fetchStories();

    // Clean up previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Subscribe to story changes
    const channel = supabase
      .channel(`stories:${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stories',
        },
        (payload) => {
          if (!isMountedRef.current) return;
          
          if (payload.eventType === 'INSERT') {
            // Only refresh if it's not our own story (already handled by createStory)
            if (payload.new.user_id !== session.user.id) {
              refreshStories();
            }
          } else if (payload.eventType === 'DELETE') {
            setStories(prev => prev.filter(s => s.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            fetchStories(true);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Stories subscription active');
        } else if (status === 'CLOSED') {
          console.log('Stories subscription closed');
          // Attempt to reconnect after a delay
          if (isMountedRef.current) {
            setTimeout(() => {
              if (isMountedRef.current && session?.user?.id) {
                fetchStories();
              }
            }, 5000);
          }
        }
      });
    
    channelRef.current = channel;

    // Set up interval to remove expired stories
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        setStories((prev) => {
          const validStories = prev.filter((story) => new Date(story.expires_at) > new Date());
          if (validStories.length !== prev.length) {
            saveToCache(validStories);
          }
          return validStories;
        });
      }
    }, 60000); // Check every minute

    return () => {
      isMountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      clearInterval(interval);
    };
  }, [session?.user?.id]);

  // Update page when currentPage changes
  useEffect(() => {
    if (currentPage > 0) {
      fetchStories();
    }
  }, [currentPage]);

  // Memoize context value
  const contextValue = useMemo(
    () => ({
      stories,
      loading,
      error,
      currentPage,
      hasMore,
      fetchStories: () => fetchStories(false),
      fetchMoreStories,
      createStory,
      viewStory,
      deleteStory,
      getStoriesByUser,
      refreshStories,
    }),
    [stories, loading, error, currentPage, hasMore, fetchStories, fetchMoreStories, createStory, viewStory, deleteStory, getStoriesByUser, refreshStories]
  );

  return (
    <StoriesContext.Provider value={contextValue}>
      {children}
    </StoriesContext.Provider>
  );
}

export function useStories() {
  const context = useContext(StoriesContext);
  if (!context) {
    throw new Error('useStories must be used within a StoriesProvider');
  }
  return context;
}