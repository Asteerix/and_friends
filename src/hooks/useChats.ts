import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { PostgrestError } from "@supabase/supabase-js";

export interface Chat {
  id?: string;
  name?: string;
  is_group?: boolean;
  event_id?: string;
  created_by?: string;
  created_at?: string;
}

export function useChats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<PostgrestError | null>(null);

  async function fetchChats() {
    setLoading(true);
    const { data, error } = await supabase
      .from("chats")
      .select("*")
      .order("created_at", { ascending: false });
    setChats((data as Chat[]) || []);
    setError(error);
    setLoading(false);
  }

  async function createChat(chat: Chat) {
    const { data, error } = await supabase
      .from("chats")
      .insert([chat])
      .select();
    if (!error && data) setChats((prev) => [...prev, ...(data as Chat[])]);
    return { data, error };
  }

  async function joinChat(chat_id: string, user_id: string) {
    return await supabase
      .from("chat_participants")
      .insert([{ chat_id, user_id }]);
  }

  useEffect(() => {
    fetchChats();
  }, []);

  return { chats, loading, error, fetchChats, createChat, joinChat };
}
