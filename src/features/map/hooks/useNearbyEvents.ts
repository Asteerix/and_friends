import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Event } from '@/entities/event/types';

export function useNearbyEvents(
  latitude?: number,
  longitude?: number,
  radiusKm: number = 5
) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (latitude && longitude) {
      fetchNearbyEvents();
    }
  }, [latitude, longitude, radiusKm]);

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

      // Transform the data to match our Event type
      const transformedEvents: Event[] = (data || []).map((event: any) => ({
        id: event.id,
        title: event.title,
        subtitle: event.subtitle,
        description: event.description,
        coverData: event.cover_data,
        startTime: new Date(event.start_time),
        endTime: event.end_time ? new Date(event.end_time) : undefined,
        timezone: event.timezone,
        location: {
          latitude: event.location?.coordinates?.[1],
          longitude: event.location?.coordinates?.[0],
        },
        address: event.address,
        venueName: event.venue_name,
        organizerId: event.organizer_id,
        coOrganizers: event.co_organizers || [],
        category: event.category,
        tags: event.tags || [],
        privacy: event.privacy,
        maxAttendees: event.max_attendees,
        currentAttendees: event.current_attendees,
        waitlistEnabled: event.waitlist_enabled,
        approvalRequired: event.approval_required,
        whatToBring: event.what_to_bring || [],
        price: event.price,
        currency: event.currency,
        status: event.status,
        viewCount: event.view_count,
        shareCount: event.share_count,
        featured: event.featured,
        sponsored: event.sponsored,
        createdAt: new Date(event.created_at),
        updatedAt: new Date(event.updated_at),
      }));

      setEvents(transformedEvents);
    } catch (err: any) {
      console.error('Error fetching nearby events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    const subscription = supabase
      .channel('nearby-events')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'events',
        filter: `status=eq.published`,
      }, () => {
        // Refetch when events change
        if (latitude && longitude) {
          fetchNearbyEvents();
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
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