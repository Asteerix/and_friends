import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { PostgrestError } from "@supabase/supabase-js";
import { useSession } from "@/lib/SessionContext";

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: "image" | "video";
  caption?: string;
  expires_at: string;
  created_at: string;
  viewed_by?: string[];
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

    setLoading(true);
    try {
      // Get stories from friends that haven't expired
      const { data, error } = await supabase
        .from("stories")
        .select(`
          *,
          profiles (
            full_name,
            avatar_url
          )
        `)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        setError(error);
        console.error("Error fetching stories:", error);
        return;
      }

      const formattedStories = (data || []).map((story: any) => ({
        ...story,
        user: story.profiles ? {
          full_name: story.profiles.full_name,
          avatar_url: story.profiles.avatar_url
        } : undefined
      }));

      setStories(formattedStories);
    } catch (err: any) {
      setError(err);
      console.error("Unexpected error fetching stories:", err);
    } finally {
      setLoading(false);
    }
  }

  async function createStory(storyData: {
    image_url?: string;
    media_url?: string;
    media_type?: "image" | "video";
    text?: string;
    caption?: string;
    text_position?: { x: number; y: number };
    stickers?: any[];
  }) {
    if (!session?.user?.id) return { error: { message: "Not authenticated" } };

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Stories expire after 24 hours

    const { data, error } = await supabase
      .from("stories")
      .insert([{
        user_id: session.user.id,
        media_url: storyData.image_url || storyData.media_url,
        media_type: storyData.media_type || "image",
        caption: storyData.text || storyData.caption,
        expires_at: expiresAt.toISOString(),
        metadata: {
          text_position: storyData.text_position,
          stickers: storyData.stickers
        }
      }])
      .select()
      .single();

    if (!error && data) {
      await fetchStories(); // Refresh stories list
    }
    return { data, error };
  }

  async function viewStory(storyId: string) {
    if (!session?.user?.id) return;

    // Add current user to viewed_by array
    const { error } = await supabase.rpc("add_story_view", {
      story_id: storyId,
      viewer_id: session.user.id
    });

    if (error) {
      console.error("Error marking story as viewed:", error);
    }
  }

  async function deleteStory(storyId: string) {
    const { error } = await supabase
      .from("stories")
      .delete()
      .eq("id", storyId)
      .eq("user_id", session?.user?.id);

    if (!error) {
      setStories(prev => prev.filter(s => s.id !== storyId));
    }
    return { error };
  }

  // Set up real-time subscription
  useEffect(() => {
    if (!session?.user?.id) return;

    fetchStories();

    // Subscribe to new stories
    const subscription = supabase
      .channel("stories:changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stories",
        },
        () => {
          // Refetch stories when any change occurs
          fetchStories();
        }
      )
      .subscribe();

    // Set up interval to remove expired stories
    const interval = setInterval(() => {
      setStories(prev => prev.filter(story => new Date(story.expires_at) > new Date()));
    }, 60000); // Check every minute

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [session?.user?.id]);

  async function getStoriesByUser(userId: string) {
    try {
      const { data, error } = await supabase
        .from("stories")
        .select(`
          *,
          profiles!user_id (
            id,
            display_name,
            full_name,
            avatar_url
          )
        `)
        .eq("user_id", userId)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching user stories:", error);
        return [];
      }

      return (data || []).map((story: any) => ({
        id: story.id,
        image_url: story.media_url,
        text: story.caption,
        created_at: story.created_at,
        user: {
          id: story.profiles?.id || userId,
          display_name: story.profiles?.display_name || story.profiles?.full_name || 'Unknown',
          avatar_url: story.profiles?.avatar_url || '',
        }
      }));
    } catch (err) {
      console.error("Error getting stories by user:", err);
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
    getStoriesByUser
  };
}