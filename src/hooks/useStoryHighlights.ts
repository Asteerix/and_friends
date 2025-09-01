import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../shared/lib/supabase/client';
import { useSession } from '../shared/providers/SessionContext';

export interface StoryHighlight {
  id: string;
  user_id: string;
  title: string;
  cover_url?: string;
  story_ids: string[];
  position: number;
  created_at: string;
  updated_at: string;
  stories?: unknown[]; // Story details
}
export function useStoryHighlights(userId?: string) {
  const { session } = useSession();
  const [highlights, setHighlights] = useState<StoryHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const targetUserId = userId || session?.user?.id;

  const fetchHighlights = useCallback(async () => {
    if (!targetUserId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('story_highlights')
        .select('*')
        .eq('user_id', targetUserId)
        .order('position', { ascending: true });

      if (error) throw error;

      // Fetch story details for each highlight
      const highlightsWithStories = await Promise.all(
        (data || []).map(async (highlight) => {
          if (highlight.story_ids && highlight.story_ids.length > 0) {
            const { data: stories } = await supabase
              .from('stories')
              .select('*')
              .in('id', highlight.story_ids)
              .order('created_at', { ascending: false });

            return {
              ...highlight,
              stories: stories || [],
            };
          }
          return highlight;
        })
      );

      setHighlights(highlightsWithStories);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    void fetchHighlights();
  }, [fetchHighlights]);

  const createHighlight = async (title: string, storyIds: string[], coverUrl?: string) => {
    if (!session?.user) throw new Error('User not authenticated');

    // Get the next position
    const maxPosition = highlights.reduce((max, h) => Math.max(max, h.position), -1);

    const { data, error } = await supabase
      .from('story_highlights')
      .insert({
        user_id: session.user.id,
        title,
        cover_url: coverUrl,
        story_ids: storyIds,
        position: maxPosition + 1,
      })
      .select()
      .single();

    if (error) throw error;

    // Fetch stories for the new highlight
    if (storyIds.length > 0) {
      const { data: stories } = await supabase.from('stories').select('*').in('id', storyIds);

      data.stories = stories || [];
    }

    setHighlights((prev) => [...prev, data]);
    return data;
  };

  const updateHighlight = async (
    highlightId: string,
    updates: {
      title?: string;
      cover_url?: string;
      story_ids?: string[];
    }
  ) => {
    const { data, error } = await supabase
      .from('story_highlights')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', highlightId)
      .select()
      .single();

    if (error) throw error;

    // Fetch updated stories if story_ids were updated
    if (updates.story_ids && updates.story_ids.length > 0) {
      const { data: stories } = await supabase
        .from('stories')
        .select('*')
        .in('id', updates.story_ids);

      data.stories = stories || [];
    }

    setHighlights((prev) => prev.map((h) => (h.id === highlightId ? data : h)));

    return data;
  };

  const deleteHighlight = async (highlightId: string) => {
    const { error: fetchError } = await supabase
      .from('story_highlights')
      .delete()
      .eq('id', highlightId);

    if (fetchError) throw fetchError;

    setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
  };

  const addStoryToHighlight = async (highlightId: string, storyId: string) => {
    const highlight = highlights.find((h) => h.id === highlightId);
    if (!highlight) throw new Error('Highlight not found');

    const updatedStoryIds = [...highlight.story_ids, storyId];
    return updateHighlight(highlightId, { story_ids: updatedStoryIds });
  };

  const removeStoryFromHighlight = async (highlightId: string, storyId: string) => {
    const highlight = highlights.find((h) => h.id === highlightId);
    if (!highlight) throw new Error('Highlight not found');

    const updatedStoryIds = highlight.story_ids.filter((id) => id !== storyId);
    return updateHighlight(highlightId, { story_ids: updatedStoryIds });
  };

  const reorderHighlights = async (newOrder: string[]) => {
    // Update positions based on new order
    const updates = newOrder.map((id, index) => ({
      id,
      position: index,
    }));

    // Update each highlight's position
    await Promise.all(
      updates.map(({ id, position }) =>
        supabase.from('story_highlights').update({ position }).eq('id', id)
      )
    );

    // Reorder local state
    const reordered = newOrder
      .map((id) => highlights.find((h) => h.id === id))
      .filter(Boolean) as StoryHighlight[];

    setHighlights(reordered);
  };

  return {
    highlights,
    loading,
    error,
    createHighlight,
    updateHighlight,
    deleteHighlight,
    addStoryToHighlight,
    removeStoryFromHighlight,
    reorderHighlights,
    refetch: fetchHighlights,
  };
}
