import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { PostgrestError } from "@supabase/supabase-js";

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
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("date", { ascending: true });
    setEvents((data as Event[]) || []);
    setError(error);
    setLoading(false);
  }

  async function createEvent(event: Event) {
    const { data, error } = await supabase
      .from("events")
      .insert([event])
      .select();
    if (!error && data) setEvents((prev) => [...prev, ...(data as Event[])]);
    return { data, error };
  }

  async function joinEvent(event_id: string, user_id: string) {
    return await supabase
      .from("event_participants")
      .insert([{ event_id, user_id }]);
  }

  async function updateRSVP(event_id: string, status: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: "Not authenticated" } };

    const { data, error } = await supabase
      .from("event_participants")
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
    fetchEvents();
  }, []);

  return { events, loading, error, fetchEvents, createEvent, joinEvent, updateRSVP };
}
