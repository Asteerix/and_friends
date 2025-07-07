import { useState, useEffect } from 'react';

import type { EventAdvanced } from '@/hooks/useEventsAdvanced';
import { supabase } from '@/shared/lib/supabase/client';

export interface NearbyEvent extends EventAdvanced {
  distance_km: number;
}
export function useNearbyEvents(latitude?: number, longitude?: number, radiusKm: number = 5) {
  const [events, setEvents] = useState<NearbyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNearbyEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use Supabase RPC function to get nearby events
      const { data, error: fetchError } = await supabase.rpc('get_nearby_events', {
        p_lat: latitude,
        p_lng: longitude,
        p_radius_km: radiusKm,
      });

      if (fetchError) throw fetchError;

      // Transform the data to match our EventAdvanced type
      const transformedEvents: NearbyEvent[] = (data || []).map((event: any) => ({
        id: event.id,
        title: event.title,
        subtitle: event.subtitle,
        description: event.description,
        date: event.date,
        location: event.location,
        image_url: event.image_url,
        tags: event.tags || [],
        is_private: event.is_private,
        created_by: event.created_by,
        created_at: event.created_at || new Date().toISOString(),
        updated_at: event.updated_at,
        cover_bg_color: event.cover_bg_color,
        cover_font: event.cover_font,
        cover_image: event.cover_image,
        creator: event.creator_name
          ? {
              id: event.created_by,
              full_name: event.creator_name,
              avatar_url: event.creator_avatar,
            }
          : undefined,
        participants_count: event.participants_count || 0,
        distance_km: event.distance_km,
        user_status: null, // Will be fetched separately if needed
        is_creator: false, // Will be determined based on current user
      }));

      setEvents(transformedEvents);
    } catch (err: unknown) {
      console.error('Error fetching nearby events:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (latitude && longitude) {
        await fetchNearbyEvents();
      }
    };
    void fetchData();
  }, [latitude, longitude, radiusKm]);

  const subscribeToUpdates = () => {
    const subscription = supabase
      .channel('nearby-events')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
        },
        () => {
          // Refetch when events change
          if (latitude && longitude) {
            void fetchNearbyEvents();
          }
        }
      )
      .subscribe();

    return () => {
      void subscription.unsubscribe();
    };
  };

  useEffect(() => {
    const unsubscribe = subscribeToUpdates();
    return unsubscribe;
  }, [latitude, longitude]);

  return {
    events,
    loading,
    error,
    refetch: fetchNearbyEvents,
  };
}
