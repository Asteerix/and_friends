import type { PostgrestError } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

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
export function useStories() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<PostgrestError | null>(null);
  const { session } = useSession();

  async function fetchStories() {
    if (!session?.user?.id) return;

    console.log('🔍 [useStories] Fetching stories for user:', session.user.id);
    setLoading(true);
    try {
      // Get stories from friends that haven't expired
      const { data: storiesData, error: storiesError } = await supabase
        .from('stories')
        .select(
          `
          *,
          user:profiles!stories_user_id_fkey (
            full_name,
            avatar_url
          )
        `
        )
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (storiesError) {
        setError(storiesError);
        console.error('❌ [useStories] Error fetching stories:', storiesError);
        return;
      }

      console.log('✅ [useStories] Stories fetched successfully:', storiesData?.length || 0, 'stories');
      console.log('📋 [useStories] Raw stories data:', storiesData);

      const formattedStories = (storiesData || []).map((story: any) => ({
        ...story,
        user: story.user
          ? {
              full_name: story.user.full_name,
              avatar_url: story.user.avatar_url,
            }
          : undefined,
        // Check if current user has viewed this story using the views array
        viewed_by: story.views?.includes(session.user.id) ? [session.user.id] : [],
        views: story.views || [],
      }));

      console.log('📦 [useStories] Formatted stories:', formattedStories);
      setStories(formattedStories);
    } catch (err: unknown) {
      setError(err as PostgrestError);
      console.error('❌ [useStories] Unexpected error fetching stories:', err);
    } finally {
      setLoading(false);
    }
  }

  async function createStory(storyData: {
    image_url?: string;
    media_url?: string;
    media_type?: 'image' | 'video';
    text?: string;
    caption?: string;
    caption_position?: number;
    text_position?: { x: number; y: number };
    stickers?: unknown[];
  }) {
    if (!session?.user?.id) {
      console.error('❌ [useStories] Cannot create story: User not authenticated');
      return {
        error: { message: 'Not authenticated' },
      };
    }

    console.log('📸 [useStories] Creating story for user:', session.user.id);
    console.log('📝 [useStories] Story data:', storyData);

    // Check if user has reached the 50 stories limit in the last 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { count, error: countError } = await supabase
      .from('stories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .gte('created_at', twentyFourHoursAgo.toISOString());

    if (countError) {
      console.error('❌ [useStories] Error checking story count:', countError);
      return { error: countError };
    }

    if (count && count >= 50) {
      console.error('❌ [useStories] Story limit reached (50 stories in 24 hours)');
      return {
        error: { 
          message: 'Vous avez atteint la limite de 50 stories par 24 heures. Veuillez réessayer plus tard.',
          code: 'STORY_LIMIT_REACHED'
        },
      };
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Stories expire after 24 hours

    // Map media_type to the correct story_type enum values
    const storyType = storyData.media_type === 'video' ? 'video' : 'photo';

    const storyPayload: any = {
      user_id: session.user.id,
      media_url: storyData.image_url || storyData.media_url,
      type: storyType, // Use 'type' instead of 'media_type'
      caption: storyData.text || storyData.caption || null, // Ensure null instead of undefined
      expires_at: expiresAt.toISOString(),
      stickers: storyData.stickers || [],
    };

    // Add caption_position if provided
    if (storyData.caption_position !== undefined) {
      storyPayload.caption_position = storyData.caption_position;
    }

    console.log('📤 [useStories] Sending story payload to Supabase:', storyPayload);

    const { data, error } = await supabase
      .from('stories')
      .insert([storyPayload])
      .select()
      .single();

    if (error) {
      console.error('❌ [useStories] Error creating story:', error);
      return { data: null, error };
    }

    console.log('✅ [useStories] Story created successfully:', data);
    console.log('🔄 [useStories] Refreshing stories list...');
    await fetchStories(); // Refresh stories list
    
    return { data, error };
  }

  async function viewStory(storyId: string) {
    if (!session?.user?.id) {
      console.error('❌ [useStories] Cannot view story: User not authenticated');
      return;
    }

    console.log('👁️ [useStories] Marking story as viewed:', storyId, 'by user:', session.user.id);

    try {
      // Use the RPC function which has SECURITY DEFINER to bypass RLS
      const { error } = await supabase.rpc('add_story_view', {
        p_story_id: storyId,
        p_viewer_id: session.user.id
      });

      if (error) {
        console.error('❌ [useStories] Error marking story as viewed:', error);
        return;
      }

      console.log('✅ [useStories] Story marked as viewed successfully');
      
      // Update local state to reflect the view
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
    } catch (error) {
      console.error('❌ [useStories] Error in viewStory:', error);
    }
  }

  async function deleteStory(storyId: string) {
    try {
      // First, get the story to find the media URL
      const { data: story, error: fetchError } = await supabase
        .from('stories')
        .select('media_url')
        .eq('id', storyId)
        .eq('user_id', session?.user?.id)
        .single();

      if (fetchError) {
        console.error('❌ [useStories] Error fetching story for deletion:', fetchError);
        return { error: fetchError };
      }

      // Extract the file path from the media URL
      if (story?.media_url) {
        const url = new URL(story.media_url);
        const pathParts = url.pathname.split('/');
        const bucketIndex = pathParts.indexOf('stories');
        
        if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
          const filePath = pathParts.slice(bucketIndex + 1).join('/');
          console.log('🗑️ [useStories] Deleting file from storage:', filePath);
          
          // Delete from storage bucket
          const { error: storageError } = await supabase.storage
            .from('stories')
            .remove([filePath]);
          
          if (storageError) {
            console.error('⚠️ [useStories] Error deleting file from storage:', storageError);
            // Continue with story deletion even if storage deletion fails
          } else {
            console.log('✅ [useStories] File deleted from storage');
          }
        }
      }

      // Delete the story record
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId)
        .eq('user_id', session?.user?.id);

      if (!error) {
        console.log('✅ [useStories] Story deleted successfully');
        setStories((prev) => prev.filter((s) => s.id !== storyId));
      } else {
        console.error('❌ [useStories] Error deleting story:', error);
      }
      
      return { error };
    } catch (error) {
      console.error('❌ [useStories] Unexpected error deleting story:', error);
      return { error };
    }
  }

  // Set up real-time subscription
  useEffect(() => {
    if (!session?.user?.id) return;

    fetchStories();

    // Subscribe to new stories
    console.log('📡 [useStories] Setting up realtime subscription for stories');
    const subscription = supabase
      .channel('stories:changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stories',
        },
        (payload) => {
          console.log('🔔 [useStories] Realtime update received:', payload.eventType, payload);
          console.log('🔔 [useStories] New story data:', payload.new);
          // Refetch stories when any change occurs
          fetchStories();
        }
      )
      .subscribe();
    
    console.log('✅ [useStories] Realtime subscription active');

    // Set up interval to remove expired stories
    const interval = setInterval(() => {
      setStories((prev) => prev.filter((story) => new Date(story.expires_at) > new Date()));
    }, 60000); // Check every minute

    return () => {
      void supabase.removeChannel(subscription);
      clearInterval(interval);
    };
  }, [session?.user?.id]);

  async function getStoriesByUser(userId: string) {
    console.log('🔍 [useStories] Getting stories for specific user:', userId);
    
    try {
      const { data, error } = await supabase
        .from('stories')
        .select(
          `
          *,
          user:profiles!user_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `
        )
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true }); // Show oldest first

      if (error) {
        console.error('❌ [useStories] Error fetching user stories:', error);
        return [];
      }

      console.log('✅ [useStories] User stories fetched:', data?.length || 0, 'stories for user:', userId);
      console.log('📋 [useStories] User stories data:', data);

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

      console.log('📦 [useStories] Formatted user stories:', formattedStories);
      return formattedStories;
    } catch (err) {
      console.error('❌ [useStories] Unexpected error getting stories by user:', err);
      return [];
    }
  }

  return {
    stories,
    loading,
    error,
    fetchStories,
    createStory,
    viewStory,
    deleteStory,
    getStoriesByUser,
  };
}
