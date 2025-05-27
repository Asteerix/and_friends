import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { PostgrestError } from "@supabase/supabase-js";

export interface Event {
  id?: string;
  title: string;
  description?: string;
  date: string;
  location?: string;
  image_url?: string;
  tags?: string[];
  is_private?: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
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

  useEffect(() => {
    fetchEvents();
  }, []);

  return { events, loading, error, fetchEvents, createEvent, joinEvent };
}
