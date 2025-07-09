import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { EventServiceComplete, EventOperationResult, CreateEventData } from '../services/eventServiceComplete';

interface EventContextType {
  currentEvent: any | null;
  loading: boolean;
  error: string | null;
  loadEvent: (eventId: string) => Promise<void>;
  updateEvent: (eventId: string, updates: Partial<CreateEventData>) => Promise<EventOperationResult>;
  refreshEvent: (eventId: string) => Promise<void>;
  clearCurrentEvent: () => void;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export function EventProvider({ children }: { children: ReactNode }) {
  const [currentEvent, setCurrentEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvent = useCallback(async (eventId: string) => {
    console.log('🔄 [EventProvider] Loading event:', eventId);
    setLoading(true);
    setError(null);
    
    try {
      const result = await EventServiceComplete.getEvent(eventId);
      if (result.success && result.event) {
        console.log('✅ [EventProvider] Event loaded successfully:', result.event.title);
        setCurrentEvent(result.event);
      } else {
        throw new Error(result.error || 'Failed to load event');
      }
    } catch (err) {
      console.error('❌ [EventProvider] Error loading event:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateEvent = useCallback(async (eventId: string, updates: Partial<CreateEventData>): Promise<EventOperationResult> => {
    console.log('🔄 [EventProvider] Updating event:', eventId);
    setLoading(true);
    setError(null);
    
    try {
      const result = await EventServiceComplete.updateEvent(eventId, updates);
      
      if (result.success && result.event) {
        console.log('✅ [EventProvider] Event updated successfully');
        // Mettre à jour l'état local immédiatement
        setCurrentEvent(result.event);
        
        // Optionnel : recharger depuis la DB pour s'assurer de la cohérence
        // await loadEvent(eventId);
      } else {
        throw new Error(result.error || 'Failed to update event');
      }
      
      return result;
    } catch (err) {
      console.error('❌ [EventProvider] Error updating event:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshEvent = useCallback(async (eventId: string) => {
    console.log('🔄 [EventProvider] Refreshing event:', eventId);
    await loadEvent(eventId);
  }, [loadEvent]);

  const clearCurrentEvent = useCallback(() => {
    console.log('🧹 [EventProvider] Clearing current event');
    setCurrentEvent(null);
    setError(null);
  }, []);

  const value: EventContextType = {
    currentEvent,
    loading,
    error,
    loadEvent,
    updateEvent,
    refreshEvent,
    clearCurrentEvent,
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