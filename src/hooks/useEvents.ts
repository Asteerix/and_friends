import type { PostgrestError } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from '@/shared/lib/supabase/client';
import { EventService } from '@/features/events/services/eventService';
import { eventCache } from '@/shared/utils/cache/cacheManager';
import { CacheKeys } from '@/shared/utils/cache/cacheKeys';

export interface Event {
  id?: string;
  title: string;
  subtitle?: string;
  description?: string;
  date: string;
  time?: string;
  location?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  cover_url?: string;
  image_url?: string;
  category?: string;
  tags?: string[];
  is_private?: boolean;
  invite_only?: boolean;
  max_participants?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  userRSVP?: string;
  participants_count?: number;
}
export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<PostgrestError | null>(null);

  async function fetchEvents() {
    setLoading(true);

    // Try to get from cache first
    const cacheKey = CacheKeys.EVENTS_LIST();
    const cachedEvents = eventCache.get<Event[]>(cacheKey);

    if (cachedEvents) {
      setEvents(cachedEvents);
      setLoading(false);

      // Fetch fresh data in background
      supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true })
        .then(({ data, error }) => {
          if (!error && data) {
            setEvents(data as Event[]);
            eventCache.set(cacheKey, data, { ttl: 1800000 }); // 30 minutes
          }
        });
    } else {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (!error && data) {
        setEvents(data as Event[]);
        await eventCache.set(cacheKey, data, { ttl: 1800000 }); // 30 minutes
      } else {
        setEvents([]);
      }

      setError(error);
      setLoading(false);
    }
  }

  async function createEvent(event: Event) {
    const { data, error } = await supabase.from('events').insert([event]).select();
    if (!error && data) setEvents((prev) => [...prev, ...(data as Event[])]);
    return { data, error };
  }

  async function joinEvent(event_id: string, user_id: string) {
    const result = await supabase.from('event_participants').insert([{ event_id, user_id }]);

    // Ajouter automatiquement au chat de l'événement
    if (!result.error) {
      try {
        await EventService.addParticipantToEventChat(event_id, user_id);
      } catch (error) {
        console.error("Erreur lors de l'ajout au chat:", error);
      }
    }

    return result;
  }

  async function updateRSVP(event_id: string, status: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: { message: 'Not authenticated' } };

    // Vérifier le statut actuel avant de faire la mise à jour
    const { data: currentParticipant } = await supabase
      .from('event_participants')
      .select('status')
      .eq('event_id', event_id)
      .eq('user_id', user.id)
      .single();

    const { data, error } = await supabase
      .from('event_participants')
      .upsert([
        {
          event_id,
          user_id: user.id,
          status,
          updated_at: new Date().toISOString(),
        },
      ])
      .select();

    if (!error) {
      // Update local state
      setEvents((prev) =>
        prev.map((event) => (event.id === event_id ? { ...event, userRSVP: status } : event))
      );

      // Gérer l'ajout/retrait du chat selon le statut
      try {
        if (status === 'going' && (!currentParticipant || currentParticipant.status !== 'going')) {
          // L'utilisateur rejoint l'événement
          await EventService.addParticipantToEventChat(event_id, user.id);
        } else if (status !== 'going' && currentParticipant?.status === 'going') {
          // L'utilisateur quitte l'événement
          await EventService.removeParticipantFromEventChat(event_id, user.id);
        }
      } catch (chatError) {
        console.error('Erreur lors de la gestion du chat:', chatError);
      }
    }

    return { data, error };
  }

  useEffect(() => {
    void fetchEvents();

    // Set up real-time subscription for events
    const eventsChannel = supabase
      .channel('events:changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
        },
        (payload) => {
          console.log('🔔 [useEvents] Realtime update received:', payload.eventType);

          if (payload.eventType === 'INSERT' && payload.new) {
            setEvents((prev) => [...prev, payload.new as Event]);
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setEvents((prev) =>
              prev.map((event) => (event.id === payload.new.id ? (payload.new as Event) : event))
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setEvents((prev) => prev.filter((event) => event.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    // Set up real-time subscription for event participants
    const participantsChannel = supabase
      .channel('event_participants:changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_participants',
        },
        (payload) => {
          console.log('🔔 [useEvents] Participants update received:', payload.eventType);
          // Refetch events to get updated participant counts and RSVP statuses
          void fetchEvents();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(eventsChannel);
      void supabase.removeChannel(participantsChannel);
    };
  }, []);

  return { events, loading, error, fetchEvents, createEvent, joinEvent, updateRSVP };
}
