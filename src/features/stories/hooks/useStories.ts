import { useState, useEffect, useCallback } from 'react';
import { Story, StoryHighlight } from '../types';
import { supabase } from '@/shared/lib/supabase/client';

interface UserStories {
  userId: string;
  name: string;
  avatar: string;
  hasUnviewedStories: boolean;
  stories: Story[];
}
export function useStories() {
  const [userStories, setUserStories] = useState<UserStories[]>([]);
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [highlights, setHighlights] = useState<StoryHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStories();
    subscribeToStories();
  }, []);

  const fetchStories = async () => {
    try {
      setLoading(true);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch stories from followed users and own stories
      const { data: stories, error: storiesError } = await supabase
        .from('stories')
        .select(
          `
          *,
          user:user_id(id, username, full_name, avatar_url)
        `
        )
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (storiesError) throw storiesError;

      // Group stories by user
      const groupedStories = stories?.reduce((acc: any, story: any) => {
        const userId = story.user.id;
        if (!acc[userId]) {
          acc[userId] = {
            userId,
            name: story.user.full_name || story.user.username,
            avatar: story.user.avatar_url,
            hasUnviewedStories: !story.views?.includes(user.id),
            stories: [],
          };
        }

        acc[userId].stories.push({
          ...story,
          views: story.views || [],
          createdAt: new Date(story.created_at),
          expiresAt: new Date(story.expires_at),
        });

        return acc;
      }, {});

      // Convert to array and sort
      const userStoriesArray = Object.values(groupedStories || {}) as UserStories[];

      // Sort: unviewed first, then by most recent story
      userStoriesArray.sort((a, b) => {
        if (a.hasUnviewedStories && !b.hasUnviewedStories) return -1;
        if (!a.hasUnviewedStories && b.hasUnviewedStories) return 1;
        return (
          new Date(b.stories[0]?.createdAt || 0).getTime() -
          new Date(a.stories[0]?.createdAt || 0).getTime()
        );
      });

      setUserStories(userStoriesArray);

      // Set my stories
      const myUserStories = userStoriesArray.find((u) => u.userId === user.id);
      setMyStories(myUserStories?.stories || []);

      // Fetch highlights
      const { data: highlightsData } = await supabase
        .from('story_highlights')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setHighlights(highlightsData || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const subscribeToStories = () => {
    const subscription = supabase
      .channel('stories')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stories',
        },
        () => {
          fetchStories();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(subscription);
    };
  };

  const markAsViewed = useCallback(async (storyId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // First, get the current story to check existing views
      const { data: story, error: fetchError } = await supabase
        .from('stories')
        .select('views')
        .eq('id', storyId)
        .single();

      if (fetchError) {
        console.error('Error fetching story:', fetchError);
        return;
      }

      // Check if user already viewed this story
      const currentViews = story.views || [];
      if (currentViews.includes(user.id)) {
        console.log('Story already viewed by user');
        return;
      }

      // Add user to views array
      const updatedViews = [...currentViews, user.id];

      const { error: updateError } = await supabase
        .from('stories')
        .update({
          views: updatedViews,
          views_count: updatedViews.length,
        })
        .eq('id', storyId);

      if (updateError) throw updateError;

      // Update local state
      setUserStories((prev) =>
        prev.map((userStory) => ({
          ...userStory,
          stories: userStory.stories.map((story) =>
            story.id === storyId ? { ...story, views: updatedViews } : story
          ),
          hasUnviewedStories: userStory.stories.some(
            (s) => s.id !== storyId && !s.views.includes(user.id)
          ),
        }))
      );
    } catch (err: unknown) {
      console.error('Error marking story as viewed:', err);
    }
  }, []);

  const deleteStory = useCallback(async (storyId: string) => {
    try {
      const { error } = await supabase.from('stories').delete().eq('id', storyId);

      if (error) throw error;

      // Update local state
      setMyStories((prev) => prev.filter((s) => s.id !== storyId));
      fetchStories();
    } catch (err: unknown) {
      console.error('Error deleting story:', err);
      throw err;
    }
  }, []);

  const createHighlight = useCallback(async (title: string, storyIds: string[]) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('story_highlights')
        .insert({
          user_id: user.id,
          title,
          stories: storyIds,
        })
        .select()
        .single();

      if (error) throw error;

      setHighlights((prev) => [data, ...prev]);
    } catch (err: unknown) {
      console.error('Error creating highlight:', err);
      throw err;
    }
  }, []);

  const deleteHighlight = useCallback(async (highlightId: string) => {
    try {
      const { error } = await supabase.from('story_highlights').delete().eq('id', highlightId);

      if (error) throw error;

      setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
    } catch (err: unknown) {
      console.error('Error deleting highlight:', err);
      throw err;
    }
  }, []);

  return {
    userStories,
    myStories,
    highlights,
    loading,
    error,
    markAsViewed,
    deleteStory,
    createHighlight,
    deleteHighlight,
    refetch: fetchStories,
  };
}
export function useCreateStory() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createStory = useCallback(async (storyData: any) => {
    try {
      setUploading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // In production, upload media to storage first
      // For now, we'll use the local URI

      const { data, error: createError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          media_url: storyData.mediaUrl,
          type: storyData.mediaType === 'video' ? 'video' : 'photo',
          caption: storyData.caption,
          event_id: storyData.eventId,
          music_data: storyData.musicData,
          stickers: storyData.stickers,
          mentions: storyData.mentions,
          location: storyData.location,
        })
        .select()
        .single();

      if (createError) throw createError;

      return data;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

  return {
    createStory,
    uploading,
    error,
  };
}
