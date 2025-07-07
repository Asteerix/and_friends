import { useState, useEffect, useCallback } from 'react';

import { useRealtimeSubscription } from '../shared/hooks/useRealtimeSubscription';
import { supabase } from '../shared/lib/supabase/client';

export interface Activity {
  id: string;
  created_at: string;
  user_id: string;
  type: string;
  description?: string;
  event_id?: string;
  target_user_id?: string;
  data?: Record<string, unknown>;
  is_public: boolean;
  user?: {
    id: string;
    full_name: string;
    avatar_url: string;
    username: string;
  };
  event?: {
    id: string;
    title: string;
    cover_image?: string;
  };
  target_user?: {
    id: string;
    full_name: string;
    avatar_url: string;
    username: string;
  };
}

interface UseActivitiesOptions {
  userId?: string;
  eventId?: string;
  limit?: number;
  isPublic?: boolean;
}
export function useActivities(options: UseActivitiesOptions = {}) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('activities')
        .select(
          `
          *,
          user:profiles!user_id (
            id,
            full_name,
            avatar_url,
            username
          ),
          event:events!event_id (
            id,
            title,
            cover_image
          ),
          target_user:profiles!target_user_id (
            id,
            full_name,
            avatar_url,
            username
          )
        `
        )
        .order('created_at', { ascending: false });

      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }

      if (options.eventId) {
        query = query.eq('event_id', options.eventId);
      }

      if (options.isPublic !== undefined) {
        query = query.eq('is_public', options.isPublic);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      setActivities(data || []);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [options.userId, options.eventId, options.isPublic, options.limit]);

  useEffect(() => {
    void fetchActivities();
  }, [fetchActivities]);

  // Realtime subscription
  useRealtimeSubscription<Activity>({
    table: 'activities',
    onInsert: async (payload) => {
      // Fetch complete activity with relations
      const { data } = await supabase
        .from('activities')
        .select(
          `
          *,
          user:profiles!user_id (
            id,
            full_name,
            avatar_url,
            username
          ),
          event:events!event_id (
            id,
            title,
            cover_image
          ),
          target_user:profiles!target_user_id (
            id,
            full_name,
            avatar_url,
            username
          )
        `
        )
        .eq('id', (payload.new as Activity).id)
        .single();

      if (data) {
        setActivities((prev) => [data, ...prev]);
      }
    },
    onUpdate: (payload) => {
      setActivities((prev) =>
        prev.map((activity) =>
          activity.id === (payload.new as Activity).id
            ? { ...activity, ...(payload.new as Activity) }
            : activity
        )
      );
    },
    onDelete: (payload) => {
      setActivities((prev) =>
        prev.filter((activity) => activity.id !== (payload.old as Partial<Activity>).id)
      );
    },
  });

  const createActivity = async (activity: {
    type: string;
    description?: string;
    event_id?: string;
    target_user_id?: string;
    data?: Record<string, unknown>;
    is_public?: boolean;
  }) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('activities')
      .insert({
        ...activity,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  return {
    activities,
    loading,
    error,
    refetch: fetchActivities,
    createActivity,
  };
}
