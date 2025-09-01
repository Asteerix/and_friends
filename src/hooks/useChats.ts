import type { PostgrestError } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from '@/shared/lib/supabase/client';

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
      .from('chats')
      .select('*')
      .order('created_at', { ascending: false });
    setChats((data as Chat[]) || []);
    setError(error);
    setLoading(false);
  }

  async function createChat(chat: Chat) {
    const { data, error } = await supabase.from('chats').insert([chat]).select();
    if (!error && data) setChats((prev) => [...prev, ...(data as Chat[])]);
    return { data, error };
  }

  async function joinChat(chat_id: string, user_id: string) {
    return await supabase.from('chat_participants').insert([{ chat_id, user_id }]);
  }

  useEffect(() => {
    fetchChats();

    // Set up real-time subscription for chats
    const chatsChannel = supabase
      .channel('chats:changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
        },
        (payload) => {
          console.log('🔔 [useChats] Realtime update received:', payload.eventType);

          if (payload.eventType === 'INSERT' && payload.new) {
            setChats((prev) => [payload.new as Chat, ...prev]);
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setChats((prev) =>
              prev.map((chat) => (chat.id === payload.new.id ? (payload.new as Chat) : chat))
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setChats((prev) => prev.filter((chat) => chat.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    // Set up real-time subscription for chat participants
    const participantsChannel = supabase
      .channel('chat_participants:changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_participants',
        },
        (payload) => {
          console.log('🔔 [useChats] Participants update received:', payload.eventType);
          // Refetch chats to get updated participant lists
          void fetchChats();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(chatsChannel);
      void supabase.removeChannel(participantsChannel);
    };
  }, []);

  return { chats, loading, error, fetchChats, createChat, joinChat };
}
