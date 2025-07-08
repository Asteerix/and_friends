import type { PostgrestError } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';


import { supabase } from '@/shared/lib/supabase/client';

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
};
export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<PostgrestError | null>(null);

  async function fetchEvents() {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true });
    setEvents((data as Event[]) || []);
    setError(error);
    setLoading(false);
  }

  async function createEvent(event: Event) {
    const { data, error } = await supabase
      .from('events')
      .insert([event])
      .select();
    if (!error && data) setEvents((prev) => [...prev, ...(data as Event[])]);
    return { data, error };
  }

  async function joinEvent(event_id: string, user_id: string) {
    return await supabase
      .from('event_participants')
      .insert([{ event_id, user_id }]);
  }

  async function updateRSVP(event_id: string, status: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: 'Not authenticated' } };

    const { data, error } = await supabase
      .from('event_participants')
      .upsert([{ 
        event_id, 
        user_id: user.id,
        status,
        updated_at: new Date().toISOString()
      }])
      .select();
    
    if (!error) {
      // Update local state
      setEvents(prev => prev.map(event => 
        event.id === event_id ? { ...event, userRSVP: status } : event
      ));
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
              prev.map((event) => 
                event.id === payload.new.id ? payload.new as Event : event
              )
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setEvents((prev) => 
              prev.filter((event) => event.id !== (payload.old as any).id)
            );
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
