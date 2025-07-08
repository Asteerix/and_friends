import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase/client';

interface UserProfile {
  id: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  cover_url?: string;
  bio?: string;
  birth_date?: string;
  hide_birth_date?: boolean;
  location?: string;
  hobbies?: string[];
  interests?: string[];
  jam_track_id?: string;
  jam_title?: string;
  jam_artist?: string;
  jam_cover_url?: string;
  jam_preview_url?: string;
  selected_restaurant_id?: string;
  selected_restaurant_name?: string;
  selected_restaurant_address?: string;
  is_private?: boolean;
  friends_count?: number;
  created_at?: string;
  updated_at?: string;
}

export function useUserProfile(userId: string | null | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      setProfile(data);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!userId) return;

    // Initial fetch
    fetchProfile();

    // Set up real-time subscription
    const subscription = supabase
      .channel(`user-profile:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          console.log('User profile updated in real-time:', payload);
          if (payload.new && typeof payload.new === 'object') {
            setProfile(payload.new as UserProfile);
          }
        }
      )
      .subscribe();


    return () => {
      if (subscription) {
        void supabase.removeChannel(subscription);
      }
    };
  }, [userId, fetchProfile]);

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile,
  };
}