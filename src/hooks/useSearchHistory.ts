import { useState, useEffect, useCallback } from 'react';

import { supabase } from '../shared/lib/supabase/client';
import { useSession } from '../shared/providers/SessionContext';

export type SearchType = 'user' | 'event' | 'location' | 'all';

export interface SearchHistoryItem {
  id: string;
  user_id: string;
  query: string;
  type?: SearchType;
  results_count?: number;
  clicked_result?: any;
  created_at: string;
}
export interface SearchSuggestion {
  query: string;
  type: SearchType;
  count: number;
}
export function useSearchHistory() {
  const { session } = useSession();
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (!session?.user?.id || !query.trim()) {
        setSuggestions([]);
        return;
      }

      try {
        // Get recent searches that match the query
        const { data, error } = await supabase
          .from('search_history')
          .select('query, type')
          .eq('user_id', session.user.id)
          .ilike('query', `${query}%`)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        // Group by query and type to create suggestions
        const grouped = (data || []).reduce(
          (acc, item) => {
            const key = `${item.query}-${item.type || 'all'}`;
            if (!acc[key]) {
              acc[key] = {
                query: item.query,
                type: item.type || 'all',
                count: 1,
              };
            } else {
              acc[key].count++;
            }
            return acc;
          },
          {} as Record<string, SearchSuggestion>
        );

        setSuggestions(Object.values(grouped));
      } catch {
        console.error('Error fetching suggestions:', error);
      }
    },
    [session?.user?.id]
  );

  const addToHistory = useCallback(
    async (query: string, type?: SearchType, resultsCount?: number, clickedResult?: any) => {
      if (!session?.user?.id || !query.trim()) return;

      try {
        const { data, error } = await supabase
          .from('search_history')
          .insert({
            user_id: session.user.id,
            query: query.trim(),
            type,
            results_count: resultsCount,
            clicked_result: clickedResult,
          })
          .select()
          .single();

        if (error) throw error;

        setHistory((prev) => [data, ...prev]);
        return data;
      } catch {
        console.error('Error adding to search history:', error);
      }
    },
    [session?.user?.id]
  );

  const clearHistory = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const { error: fetchError } = await supabase
        .from('search_history')
        .delete()
        .eq('user_id', session.user.id);

      if (fetchError) throw fetchError;
      setHistory([]);
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  }, [session?.user?.id]);

  const deleteHistoryItem = useCallback(
    async (itemId: string) => {
      if (!session?.user?.id) return;

      try {
        const { error: fetchError } = await supabase
          .from('search_history')
          .delete()
          .eq('id', itemId)
          .eq('user_id', session.user.id);

        if (fetchError) throw fetchError;
        setHistory((prev) => prev.filter((item) => item.id !== itemId));
      } catch {
        console.error('Error deleting history item:', error);
      }
    },
    [session?.user?.id]
  );

  const getPopularSearches = useCallback(
    async (type?: SearchType) => {
      try {
        // This would typically be a server-side function that aggregates popular searches
        // For now, we'll get the user's most frequent searches
        const { data, error } = await supabase
          .from('search_history')
          .select('query, type')
          .eq('user_id', session?.user?.id)
          .limit(100);

        if (error) throw error;

        // Count occurrences
        const counts = (data || []).reduce(
          (acc, item) => {
            if (type && item.type !== type) return acc;

            const key = item.query.toLowerCase();
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

        // Sort by count and return top queries
        return Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([query, count]) => ({ query, count }));
      } catch {
        console.error('Error fetching popular searches:', error);
        return [];
      }
    },
    [session?.user?.id]
  );

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    history,
    suggestions,
    loading,
    error,
    addToHistory,
    clearHistory,
    deleteHistoryItem,
    fetchSuggestions,
    getPopularSearches,
    refetch: fetchHistory,
  };
}
