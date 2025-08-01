import type { PostgrestError } from '@supabase/supabase-js';
import { useState, useEffect, useCallback } from 'react';

import { supabase } from '@/shared/lib/supabase/client';
import { useSession } from '@/shared/providers/SessionContext';
import { supabaseQuery } from '@/shared/lib/supabase/withNetworkRetry';
import { useNetworkError } from '@/shared/providers/NetworkErrorProvider';
import { useAdaptiveRequest } from '@/shared/hooks/useAdaptiveRequest';
import { cachedRequest } from '@/shared/utils/offlineCache';

export interface EventParticipant {
  id: string;
  full_name?: string;
  avatar_url?: string;
  status: 'going' | 'maybe' | 'not_going';
}
export interface EventPlaylist {
  id: string;
  playlist_name?: string;
  spotify_link?: string;
  apple_music_link?: string;
  created_at?: string;
}

export interface EventAdvanced {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  date: string;
  location?: string;
  image_url?: string;
  tags?: string[];
  is_private?: boolean;
  created_by: string;
  created_at: string;
  updated_at?: string;
  cover_bg_color?: string;
  cover_font?: string;
  cover_image?: string;
  // Nouveaux champs ajoutés
  start_time?: string;
  end_time?: string;
  location_details?: any;
  dress_code?: string;
  event_theme?: string;
  age_restriction?: string;
  capacity_limit?: number;
  parking_info?: string;
  event_category?: string;
  accessibility_info?: string;
  event_website?: string;
  contact_info?: string;
  allow_plus_ones?: boolean;
  max_plus_ones?: number;
  event_tags?: string[];
  extra_data?: any;
  creator?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
  participants?: EventParticipant[];
  participants_count?: number;
  user_status?: 'going' | 'maybe' | 'not_going' | null;
  is_creator?: boolean;
  playlists?: EventPlaylist[];
}
export function useEventsAdvanced() {
  const { session } = useSession();
  const { showNetworkError } = useNetworkError();
  const [events, setEvents] = useState<EventAdvanced[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PostgrestError | null>(null);
  
  // Use adaptive request hook for better network handling
  const { execute: executeRequest } = useAdaptiveRequest({
    baseTimeout: 15000,
    maxRetries: 3,
    enableCache: true,
    cacheKey: 'events-list',
    cacheTTL: 5 * 60 * 1000, // 5 minutes
  });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    const eventsData = await executeRequest(async () => {
      // Fetch all public events + events user is participating in
      const { data, error } = await supabase
        .from('events')
        .select(
          `
          *,
          profiles:created_by (
            id,
            full_name,
            avatar_url
          )
        `
        )
        .order('date', { ascending: true });
      
      if (error) throw error;
      return data;
    });

    if (!eventsData) {
      setLoading(false);
      return;
    }

    try {
      // For each event, get participation data
      const enrichedEvents: EventAdvanced[] = await Promise.all(
        ((eventsData as any[]) || []).map(async (event: any) => {
          // Get participants count
          const { count: participantsCount } = await supabase
            .from('event_participants')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id);

          // Get user's participation status if logged in
          let userStatus: 'going' | 'maybe' | 'not_going' | null = null;
          if (session?.user) {
            const { data: participation } = await supabase
              .from('event_participants')
              .select('*')
              .eq('event_id', event.id)
              .eq('user_id', session.user.id)
              .single();

            // Since status column is missing, just check if user is participating
            userStatus = participation ? 'going' : null;
          }

          // Get top participants for display
          const { data: participants } = await supabase
            .from('event_participants')
            .select(
              `
              profiles (
                id,
                full_name,
                avatar_url
              )
            `
            )
            .eq('event_id', event.id)
            .limit(5);

          const formattedParticipants: EventParticipant[] = (participants || [])
            .map((p: any) => {
              if (Array.isArray(p.profiles)) {
                if (p.profiles[0]) {
                  return {
                    id: p.profiles[0].id,
                    full_name: p.profiles[0].full_name,
                    avatar_url: p.profiles[0].avatar_url,
                    status: p.status,
                  };
                }
                return undefined;
              } else if (p.profiles && typeof p.profiles === 'object') {
                return {
                  id: p.profiles.id,
                  full_name: p.profiles.full_name,
                  avatar_url: p.profiles.avatar_url,
                  status: p.status,
                };
              }
              return undefined;
            })
            .filter(Boolean) as EventParticipant[];

          // Get playlists for the event
          const { data: playlists } = await supabase
            .from('event_playlists')
            .select('*')
            .eq('event_id', event.id);

          return {
            id: event.id,
            title: event.title,
            subtitle: event.subtitle,
            description: event.description,
            date: event.date,
            location: event.location,
            image_url: event.image_url,
            tags: event.tags || [],
            created_by: event.created_by,
            created_at: event.created_at,
            updated_at: event.updated_at,
            cover_bg_color: event.cover_bg_color,
            cover_font: event.cover_font,
            cover_image: event.cover_image,
            // Nouveaux champs
            start_time: event.start_time,
            end_time: event.end_time,
            location_details: event.location_details,
            dress_code: event.dress_code,
            event_theme: event.event_theme,
            age_restriction: event.age_restriction,
            capacity_limit: event.capacity_limit,
            parking_info: event.parking_info,
            event_category: event.event_category || event.category || event.extra_data?.eventCategory,
            accessibility_info: event.accessibility_info,
            event_website: event.event_website,
            contact_info: event.contact_info,
            allow_plus_ones: event.allow_plus_ones,
            max_plus_ones: event.max_plus_ones,
            event_tags: event.event_tags,
            extra_data: event.extra_data,
            creator: event.profiles,
            participants: formattedParticipants,
            participants_count: participantsCount || 0,
            user_status: userStatus,
            is_creator: session?.user?.id === event.created_by,
            playlists: playlists || [],
          };
        })
      );

      setEvents(enrichedEvents);
    } catch (err: unknown) {
      setError(null);
      console.error('Unexpected error fetching events:', err);
    } finally {
      setLoading(false);
    }
  }, [executeRequest, session?.user]);

  const createEvent = async (eventData: {
    title: string;
    subtitle?: string;
    description?: string;
    date: string;
    location?: string;
    image_url?: string;
    tags?: string[];
    is_private?: boolean;
    cover_bg_color?: string;
    cover_font?: string;
    cover_image?: unknown;
  }) => {
    console.log('[useEventsAdvanced] createEvent called');
    console.log('[useEventsAdvanced] Session:', !!session);
    console.log('[useEventsAdvanced] Session.user:', !!session?.user);
    console.log('[useEventsAdvanced] Session.user.id:', session?.user?.id);

    // Vérification plus robuste de l'authentification
    if (!session?.user) {
      console.warn("[useEventsAdvanced] Pas d'utilisateur dans la session, vérification directe");
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        console.log('[useEventsAdvanced] Session récupérée:', !!currentSession);
        console.log('[useEventsAdvanced] Utilisateur récupéré:', !!currentSession?.user);

        if (!currentSession?.user) {
          return { error: { message: 'Not authenticated - no current session' } };
        }
        // Utiliser la session récupérée pour la création
        console.log(
          "[useEventsAdvanced] Utilisation de la session récupérée pour créer l'événement"
        );
      } catch {
        console.error('[useEventsAdvanced] Erreur lors de la récupération de session');
        return { error: { message: 'Authentication error' } };
      }
    }

    // Récupérer l'utilisateur courant pour s'assurer qu'on a les bonnes données
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    const userId = currentSession?.user?.id || session?.user?.id;

    if (!userId) {
      return { error: { message: 'Unable to get user ID' } };
    }

    try {
      const { data, error } = await supabase
        .from('events')
        .insert([
          {
            title: eventData.title,
            subtitle: eventData.subtitle,
            description: eventData.description,
            date: eventData.date,
            location: eventData.location,
            image_url: eventData.image_url,
            tags: eventData.tags || [],
            is_private: eventData.is_private || false,
            cover_bg_color: eventData.cover_bg_color,
            cover_font: eventData.cover_font,
            cover_image:
              typeof eventData.cover_image === 'string' ? eventData.cover_image : undefined,
            created_by: userId,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating event:', error);
        return { error };
      }

      // Automatically add creator as participant
      await supabase.from('event_participants').insert({
        event_id: data.id,
        user_id: userId,
        status: 'going',
      });

      // Refresh events list
      await void fetchEvents();

      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error creating event:', error);
      return { error };
    }
  };

  const joinEvent = async (eventId: string, _status: 'going' | 'maybe' | 'not_going') => {
    if (!session?.user) {
      return { error: { message: 'Not authenticated' } };
    }

    try {
      // First, try to delete any existing participation
      await supabase
        .from('event_participants')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', session.user.id);

      // Then insert the new participation with status
      const { error } = await supabase.from('event_participants').insert({
        event_id: eventId,
        user_id: session.user.id,
        status: _status,
      });

      if (error) {
        console.error('Error joining event:', error);
        return { error };
      }


      // Update local state
      setEvents((prev) =>
        prev.map((event) =>
          event.id === eventId
            ? {
                ...event,
                user_status: 'going', // Always "going" since we can't use status
                participants_count: event.user_status
                  ? event.participants_count
                  : (event.participants_count || 0) + 1,
              }
            : event
        )
      );

      return { error: null };
    } catch (err: unknown) {
      console.error('Unexpected error joining event:', err);
      return { error: err };
    }
  };

  const leaveEvent = async (eventId: string) => {
    if (!session?.user) {
      return { error: { message: 'Not authenticated' } };
    }

    try {
      await supabase
        .from('event_participants')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', session.user.id);

      // Update local state
      setEvents((prev) =>
        prev.map((event) =>
          event.id === eventId
            ? {
                ...event,
                user_status: null,
                participants_count: Math.max(0, (event.participants_count || 1) - 1),
              }
            : event
        )
      );

      return { error: null };
    } catch (err: unknown) {
      console.error('Unexpected error leaving event:', err);
      return { error: err };
    }
  };

  const getEventById = async (eventId: string): Promise<EventAdvanced | null> => {
    try {
      const { data: eventData, error } = await supabase
        .from('events')
        .select(
          `
          *,
          profiles:created_by (
            id,
            full_name,
            avatar_url
          )
        `
        )
        .eq('id', eventId)
        .single();

      if (error || !eventData) {
        console.error('Error fetching event:', error);
        return null;
      }

      // Get detailed participants
      const { data: participants } = await supabase
        .from('event_participants')
        .select(
          `
          status,
          profiles (
            id,
            full_name,
            avatar_url
          )
        `
        )
        .eq('event_id', eventId);

      const formattedParticipants: EventParticipant[] = (participants || [])
        .map((p: any) => {
          if (Array.isArray(p.profiles)) {
            if (p.profiles[0]) {
              return {
                id: p.profiles[0].id,
                full_name: p.profiles[0].full_name,
                avatar_url: p.profiles[0].avatar_url,
                status: p.status,
              };
            }
            return undefined;
          } else if (p.profiles && typeof p.profiles === 'object') {
            return {
              id: p.profiles.id,
              full_name: p.profiles.full_name,
              avatar_url: p.profiles.avatar_url,
              status: p.status,
            };
          }
          return undefined;
        })
        .filter(Boolean) as EventParticipant[];

      // Get user status
      let userStatus = null;
      if (session?.user) {
        const { data: participation } = await supabase
          .from('event_participants')
          .select('status')
          .eq('event_id', eventId)
          .eq('user_id', session.user.id)
          .single();

        userStatus = participation?.status || null;
      }

      // Get playlists for the event
      const { data: playlists } = await supabase
        .from('event_playlists')
        .select('*')
        .eq('event_id', eventId);

      return {
        id: eventData.id,
        title: eventData.title,
        subtitle: eventData.subtitle,
        description: eventData.description,
        date: eventData.date,
        location: eventData.location,
        image_url: eventData.image_url,
        tags: eventData.tags || [],
        created_by: eventData.created_by,
        created_at: eventData.created_at,
        updated_at: eventData.updated_at,
        cover_bg_color: eventData.cover_bg_color,
        cover_font: eventData.cover_font,
        cover_image: eventData.cover_image,
        // Nouveaux champs
        start_time: eventData.start_time,
        end_time: eventData.end_time,
        location_details: eventData.location_details,
        dress_code: eventData.dress_code,
        event_theme: eventData.event_theme,
        age_restriction: eventData.age_restriction,
        capacity_limit: eventData.capacity_limit,
        parking_info: eventData.parking_info,
        event_category: eventData.event_category || eventData.category || eventData.extra_data?.eventCategory,
        accessibility_info: eventData.accessibility_info,
        event_website: eventData.event_website,
        contact_info: eventData.contact_info,
        allow_plus_ones: eventData.allow_plus_ones,
        max_plus_ones: eventData.max_plus_ones,
        event_tags: eventData.event_tags,
        extra_data: eventData.extra_data,
        creator: eventData.profiles,
        participants: formattedParticipants,
        participants_count: formattedParticipants.length,
        user_status: userStatus,
        is_creator: session?.user?.id === eventData.created_by,
        playlists: playlists || [],
      };
    } catch (err) {
      console.error('Unexpected error fetching event:', err);
      return null;
    }
  };

  const getUserEvents = async () => {
    if (!session?.user) return [];

    try {
      const { data, error } = await supabase
        .from('event_participants')
        .select(
          `
          status,
          events (
            id,
            title,
            description,
            date,
            location,
            cover_image,
            created_by,
            profiles:created_by (
              full_name,
              avatar_url
            )
          )
        `
        )
        .eq('user_id', session.user.id)
        .order('joined_at', { ascending: false });

      if (error) {
        console.error('Error fetching user events:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        ...item.events,
        image_url: item.events.cover_image, // Map cover_image to image_url for compatibility
        user_status: item.status,
        creator: item.events.profiles,
        is_creator: session.user.id === item.events.created_by,
      }));
    } catch (err: unknown) {
      setError(null);
      console.error('Unexpected error fetching user events:', err);
      return [];
    }
  };

  // Auto-fetch events when component mounts or session changes
  useEffect(() => {
    void fetchEvents();
  }, [session?.user?.id]);

  // Set up real-time subscription for events
  useEffect(() => {
    const subscription = supabase
      .channel('events')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
        },
        () => {
          console.log('Events updated in real-time');
          void fetchEvents(); // Refresh events
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_participants',
        },
        () => {
          console.log('Event participants updated in real-time');
          void fetchEvents(); // Refresh events
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(subscription);
    };
  }, []);

  return {
    events,
    loading,
    error,
    fetchEvents,
    createEvent,
    joinEvent,
    leaveEvent,
    getEventById,
    getUserEvents,
  };
}
