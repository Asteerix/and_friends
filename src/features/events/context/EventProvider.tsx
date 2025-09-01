import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
  useRef,
} from 'react';
import {
  EventServiceComplete,
  EventOperationResult,
  CreateEventData,
} from '../services/eventServiceComplete';
import { supabase } from '@/shared/lib/supabase/client';

interface EventContextType {
  currentEvent: any | null;
  loading: boolean;
  error: string | null;
  // CRUD operations
  loadEvent: (eventId: string) => Promise<void>;
  createEvent: (eventData: CreateEventData) => Promise<EventOperationResult>;
  updateEvent: (
    eventId: string,
    updates: Partial<CreateEventData>
  ) => Promise<EventOperationResult>;
  deleteEvent: (eventId: string) => Promise<EventOperationResult>;
  refreshEvent: (eventId: string) => Promise<void>;
  clearCurrentEvent: () => void;
  // Real-time updates
  subscribeToEventUpdates: (eventId: string) => void;
  unsubscribeFromEventUpdates: () => void;
  // Local state updates
  updateLocalEvent: (updates: Partial<any>) => void;
  // Events cache for optimistic updates
  eventsCache: Map<string, any>;
  // Extras update operations
  updateEventExtras: (
    eventId: string,
    extras: {
      costs?: any[];
      coHosts?: any[];
      questionnaire?: any[];
      itemsToBring?: any[];
      playlist?: any[];
      eventPhotos?: string[];
      itemsSettings?: any;
      questionnaireSettings?: any;
      playlistSettings?: any;
      dressCode?: string | null;
      eventTheme?: string | null;
      ageRestriction?: string;
      capacityLimit?: number;
      parkingInfo?: string;
      accessibilityInfo?: string;
      eventCategory?: string;
      eventWebsite?: string;
      contactInfo?: string;
      rsvpDeadline?: Date | null;
      rsvpReminderEnabled?: boolean;
      rsvpReminderTiming?: string;
    }
  ) => Promise<void>;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export function EventProvider({ children }: { children: ReactNode }) {
  const [currentEvent, setCurrentEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventsCache] = useState(new Map<string, any>());
  const subscriptionRef = useRef<any>(null);

  // Load event from database
  const loadEvent = useCallback(
    async (eventId: string) => {
      console.log('🔄 [EventProvider] Loading event:', eventId);
      setLoading(true);
      setError(null);

      try {
        const result = await EventServiceComplete.getEvent(eventId);
        if (result.success && result.event) {
          console.log('✅ [EventProvider] Event loaded successfully:', result.event.title);
          setCurrentEvent(result.event);
          eventsCache.set(eventId, result.event);
        } else {
          throw new Error(result.error || 'Failed to load event');
        }
      } catch (err) {
        console.error('❌ [EventProvider] Error loading event:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [eventsCache]
  );

  // Create new event
  const createEvent = useCallback(
    async (eventData: CreateEventData): Promise<EventOperationResult> => {
      console.log('🆕 [EventProvider] Creating new event');
      setLoading(true);
      setError(null);

      try {
        const result = await EventServiceComplete.createEvent(eventData);

        if (result.success && result.event) {
          console.log('✅ [EventProvider] Event created successfully');
          setCurrentEvent(result.event);
          eventsCache.set(result.event.id, result.event);
        } else {
          throw new Error(result.error || 'Failed to create event');
        }

        return result;
      } catch (err) {
        console.error('❌ [EventProvider] Error creating event:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [eventsCache]
  );

  // Update event with optimistic updates
  const updateEvent = useCallback(
    async (eventId: string, updates: Partial<CreateEventData>): Promise<EventOperationResult> => {
      console.log('🔄 [EventProvider] Updating event:', eventId);
      setLoading(true);
      setError(null);

      // Optimistic update - update local state immediately
      if (currentEvent && currentEvent.id === eventId) {
        const optimisticUpdate = { ...currentEvent, ...updates };
        setCurrentEvent(optimisticUpdate);
        eventsCache.set(eventId, optimisticUpdate);
      }

      try {
        const result = await EventServiceComplete.updateEvent(eventId, updates);

        if (result.success && result.event) {
          console.log('✅ [EventProvider] Event updated successfully');
          // Update with server response
          setCurrentEvent(result.event);
          eventsCache.set(eventId, result.event);
        } else {
          // Rollback optimistic update on failure
          if (eventsCache.has(eventId)) {
            const cachedEvent = eventsCache.get(eventId);
            setCurrentEvent(cachedEvent);
          }
          throw new Error(result.error || 'Failed to update event');
        }

        return result;
      } catch (err) {
        console.error('❌ [EventProvider] Error updating event:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        // Rollback optimistic update
        if (eventsCache.has(eventId)) {
          const cachedEvent = eventsCache.get(eventId);
          setCurrentEvent(cachedEvent);
        }
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [currentEvent, eventsCache]
  );

  // Delete event
  const deleteEvent = useCallback(
    async (eventId: string): Promise<EventOperationResult> => {
      console.log('🗑️ [EventProvider] Deleting event:', eventId);
      setLoading(true);
      setError(null);

      try {
        const result = await EventServiceComplete.cancelEvent(eventId);

        if (result.success) {
          console.log('✅ [EventProvider] Event deleted successfully');
          if (currentEvent?.id === eventId) {
            setCurrentEvent(null);
          }
          eventsCache.delete(eventId);
        } else {
          throw new Error(result.error || 'Failed to delete event');
        }

        return result;
      } catch (err) {
        console.error('❌ [EventProvider] Error deleting event:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [currentEvent, eventsCache]
  );

  // Refresh event from database
  const refreshEvent = useCallback(
    async (eventId: string) => {
      console.log('🔄 [EventProvider] Refreshing event:', eventId);
      await loadEvent(eventId);
    },
    [loadEvent]
  );

  // Clear current event
  const clearCurrentEvent = useCallback(() => {
    console.log('🧹 [EventProvider] Clearing current event');
    setCurrentEvent(null);
    setError(null);
  }, []);

  // Update local event state (for immediate UI updates)
  const updateLocalEvent = useCallback(
    (updates: Partial<any>) => {
      if (currentEvent) {
        console.log('🎯 [EventProvider] Updating local event state');
        const updatedEvent = { ...currentEvent, ...updates };
        setCurrentEvent(updatedEvent);
        eventsCache.set(currentEvent.id, updatedEvent);
      }
    },
    [currentEvent, eventsCache]
  );

  // Subscribe to real-time updates
  const subscribeToEventUpdates = useCallback(
    (eventId: string) => {
      console.log('📡 [EventProvider] Subscribing to event updates:', eventId);

      // Unsubscribe from previous subscription
      unsubscribeFromEventUpdates();

      // Subscribe to changes
      subscriptionRef.current = supabase
        .channel(`event:${eventId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'events',
            filter: `id=eq.${eventId}`,
          },
          async (payload) => {
            console.log('🔔 [EventProvider] Real-time update received:', payload);

            if (payload.eventType === 'UPDATE') {
              // For updates, refetch the complete event to get all relations
              console.log('📡 [EventProvider] Fetching complete event data after real-time update');
              await loadEvent(eventId);
            } else if (payload.eventType === 'DELETE') {
              // Clear event if deleted
              if (currentEvent?.id === eventId) {
                setCurrentEvent(null);
              }
              eventsCache.delete(eventId);
            }
          }
        )
        .subscribe();
    },
    [currentEvent, eventsCache, loadEvent]
  );

  // Unsubscribe from real-time updates
  const unsubscribeFromEventUpdates = useCallback(() => {
    if (subscriptionRef.current) {
      console.log('📴 [EventProvider] Unsubscribing from event updates');
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
  }, []);

  // Update event extras (for modals)
  const updateEventExtras = useCallback(
    async (
      eventId: string,
      extras: {
        costs?: any[];
        coHosts?: any[];
        questionnaire?: any[];
        itemsToBring?: any[];
        playlist?: any[];
        eventPhotos?: string[];
        itemsSettings?: any;
        questionnaireSettings?: any;
        playlistSettings?: any;
        dressCode?: string | null;
        eventTheme?: string | null;
        ageRestriction?: string;
        capacityLimit?: number;
        parkingInfo?: string;
        eventCategory?: string;
        accessibilityInfo?: string;
        eventWebsite?: string;
        contactInfo?: string;
        rsvpDeadline?: Date | null;
        rsvpReminderEnabled?: boolean;
        rsvpReminderTiming?: string;
      }
    ) => {
      console.log('🎯 [EventProvider] Updating event extras:', Object.keys(extras));

      // Update local state immediately for optimistic UI
      if (currentEvent && currentEvent.id === eventId) {
        const updatedEvent = {
          ...currentEvent,
          // Update root level fields that may exist
          ...(extras.rsvpDeadline !== undefined && { rsvp_deadline: extras.rsvpDeadline }),
          ...(extras.rsvpReminderEnabled !== undefined && {
            rsvp_reminder_enabled: extras.rsvpReminderEnabled,
          }),
          ...(extras.rsvpReminderTiming !== undefined && {
            rsvp_reminder_timing: extras.rsvpReminderTiming,
          }),
          ...(extras.capacityLimit !== undefined && { max_attendees: extras.capacityLimit }),
          ...(extras.eventCategory !== undefined && { category: extras.eventCategory }),
          // Update extra_data with all extras
          extra_data: {
            ...currentEvent.extra_data,
            ...extras,
            // Ensure consistent naming
            ...(extras.eventPhotos !== undefined && { event_photos: extras.eventPhotos }),
            ...(extras.itemsToBring !== undefined && { items_to_bring: extras.itemsToBring }),
            ...(extras.coHosts !== undefined && { co_hosts: extras.coHosts }),
          },
          // Update arrays at root level if they exist
          ...(extras.costs !== undefined && { event_costs: extras.costs }),
          ...(extras.eventPhotos !== undefined && { event_photos: extras.eventPhotos }),
          ...(extras.questionnaire !== undefined && { event_questionnaire: extras.questionnaire }),
          ...(extras.itemsToBring !== undefined && { event_items: extras.itemsToBring }),
          ...(extras.playlist !== undefined && { event_playlists: extras.playlist }),
          ...(extras.coHosts !== undefined && { event_cohosts: extras.coHosts }),
        };
        setCurrentEvent(updatedEvent);
        eventsCache.set(eventId, updatedEvent);
      }

      // Prepare update data for the service
      const updateData: Partial<CreateEventData> = { ...extras };

      // Update in database
      await updateEvent(eventId, updateData);
    },
    [currentEvent, eventsCache, updateEvent]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribeFromEventUpdates();
    };
  }, [unsubscribeFromEventUpdates]);

  const value: EventContextType = {
    currentEvent,
    loading,
    error,
    loadEvent,
    createEvent,
    updateEvent,
    deleteEvent,
    refreshEvent,
    clearCurrentEvent,
    subscribeToEventUpdates,
    unsubscribeFromEventUpdates,
    updateLocalEvent,
    eventsCache,
    updateEventExtras,
  };

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

export function useEvent() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvent must be used within an EventProvider');
  }
  return context;
}
