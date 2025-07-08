import type { PostgrestError } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';

import { supabase } from '@/shared/lib/supabase/client';
import { useSession } from '@/shared/providers/SessionContext';

export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'voice'
  | 'location'
  | 'poll'
  | 'event_share'
  | 'story_reply';

export interface Message {
  id?: string;
  chat_id?: string;
  user_id?: string;
  message_type: MessageType;
  content?: string;
  metadata?: {
    image_url?: string;
    video_url?: string;
    audio_url?: string;
    voice_url?: string;
    duration?: number;
    location?: {
      lat: number;
      lng: number;
      address?: string;
    };
    poll_id?: string;
    event_id?: string;
    story_id?: string;
    thumbnail_url?: string;
  };
  created_at?: string;
  updated_at?: string;
  is_edited?: boolean;
  is_deleted?: boolean;
  replied_to?: Message;
  user?: {
    id: string;
    full_name: string;
    avatar_url: string;
    username: string;
  };
}
export function useMessages(chatId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<PostgrestError | null>(null);
  const { session } = useSession();

  async function fetchMessages() {
    if (!chatId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(
          `
          *,
          user:profiles!user_id (
            id,
            full_name,
            avatar_url,
            username
          )
        `
        )
        .eq('chat_id', chatId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) {
        setError(error);
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages(data || []);
    } catch (err: unknown) {
      setError(err as PostgrestError);
      console.error('Unexpected error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(message: Partial<Message>) {
    if (!session?.user) {
      return { data: null, error: { message: 'Not authenticated' } };
    }

    try {
      const messageToSend = {
        chat_id: message.chat_id || chatId,
        user_id: session.user.id,
        message_type: message.message_type || 'text',
        content: message.content,
        metadata: message.metadata,
      };

      const { data, error } = await supabase
        .from('messages')
        .insert([messageToSend])
        .select(
          `
          *,
          user:profiles!user_id (
            id,
            full_name,
            avatar_url,
            username
          )
        `
        )
        .single();

      if (error) {
        console.error('Error sending message:', error);
        return { data: null, error };
      }

      setMessages((prev) => [...prev, data]);
      return { data, error: null };
    } catch (err: unknown) {
      console.error('Unexpected error sending message:', error);
      return { data: null, error: err };
    }
  }

  // Set up real-time subscription
  useEffect(() => {
    if (!chatId) return;

    fetchMessages();

    // Subscribe to new messages
    const subscription = supabase
      .channel(`messages:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          // Only add message if it's not from current user (to avoid duplicates)
          if (payload.new.user_id !== session?.user?.id) {
            // Fetch complete message with user info
            const { data } = await supabase
              .from('messages')
              .select(
                `
                *,
                user:profiles!user_id (
                  id,
                  full_name,
                  avatar_url,
                  username
                )
              `
              )
              .eq('id', payload.new.id)
              .single();

            if (data) {
              setMessages((prev) => [...prev, data]);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === payload.new.id ? { ...msg, ...payload.new } : msg))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(subscription);
    };
  }, [chatId, session?.user?.id]);

  function getLastMessage(chatId: string): Message | null {
    const chatMessages = messages.filter((m) => m.chat_id === chatId);
    if (chatMessages.length === 0) return null;

    return chatMessages.reduce((latest, current) => {
      const latestDate = new Date(latest.created_at || 0);
      const currentDate = new Date(current.created_at || 0);
      return currentDate > latestDate ? current : latest;
    });
  }

  async function editMessage(messageId: string, content: string) {
    const { data, error } = await supabase
      .from('messages')
      .update({ content, is_edited: true, updated_at: new Date().toISOString() })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function deleteMessage(messageId: string) {
    const { data, error } = await supabase
      .from('messages')
      .update({ is_deleted: true })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  return {
    messages,
    loading,
    error,
    fetchMessages,
    sendMessage,
    getLastMessage,
    editMessage,
    deleteMessage,
  };
}
