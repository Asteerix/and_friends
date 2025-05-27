import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { PostgrestError } from "@supabase/supabase-js";
import { useSession } from "@/lib/SessionContext";

export type MessageType =
  | "text-in"
  | "text-out"
  | "text"
  | "image-preview"
  | "poll-large"
  | "poll-compact"
  | "poll-outgoing";

export interface Message {
  id?: string;
  chat_id?: string;
  type: MessageType;
  authorId: string;
  author_id?: string;
  text?: string;
  createdAt?: string;
  created_at?: string;
  meta?: any;
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
        .from("messages")
        .select(`
          id,
          chat_id,
          author_id,
          type,
          text,
          meta,
          created_at,
          profiles (
            full_name,
            avatar_url
          )
        `)
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (error) {
        setError(error);
        console.error("Error fetching messages:", error);
        return;
      }

      const formattedMessages: Message[] = (data || []).map((msg: any) => ({
        id: msg.id,
        chat_id: msg.chat_id,
        authorId: msg.author_id,
        author_id: msg.author_id,
        type: msg.type as MessageType,
        text: msg.text,
        meta: msg.meta,
        createdAt: msg.created_at,
        created_at: msg.created_at,
      }));

      setMessages(formattedMessages);
    } catch (err: any) {
      setError(err);
      console.error("Unexpected error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(message: Message) {
    if (!session?.user) {
      return { data: null, error: { message: "Not authenticated" } };
    }

    try {
      const messageToSend = {
        chat_id: message.chat_id || chatId,
        author_id: session.user.id,
        type: message.type === "text-out" ? "text" : message.type,
        text: message.text,
        meta: message.meta,
      };

      const { data, error } = await supabase
        .from("messages")
        .insert([messageToSend])
        .select()
        .single();

      if (error) {
        console.error("Error sending message:", error);
        return { data: null, error };
      }

      // Format the message for local state
      const formattedMessage: Message = {
        id: data.id,
        chat_id: data.chat_id,
        authorId: data.author_id,
        author_id: data.author_id,
        type: data.type,
        text: data.text,
        meta: data.meta,
        createdAt: data.created_at,
        created_at: data.created_at,
      };

      setMessages((prev) => [...prev, formattedMessage]);
      return { data: formattedMessage, error: null };

    } catch (err: any) {
      console.error("Unexpected error sending message:", err);
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
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const newMessage: Message = {
            id: payload.new.id,
            chat_id: payload.new.chat_id,
            authorId: payload.new.author_id,
            author_id: payload.new.author_id,
            type: payload.new.type,
            text: payload.new.text,
            meta: payload.new.meta,
            createdAt: payload.new.created_at,
            created_at: payload.new.created_at,
          };

          // Only add message if it's not from current user (to avoid duplicates)
          if (payload.new.author_id !== session?.user?.id) {
            setMessages((prev) => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [chatId, session?.user?.id]);

  function getLastMessage(chatId: string): Message | null {
    const chatMessages = messages.filter(m => m.chat_id === chatId);
    if (chatMessages.length === 0) return null;
    
    return chatMessages.reduce((latest, current) => {
      const latestDate = new Date(latest.created_at || latest.createdAt || 0);
      const currentDate = new Date(current.created_at || current.createdAt || 0);
      return currentDate > latestDate ? current : latest;
    });
  }

  return { messages, loading, error, fetchMessages, sendMessage, getLastMessage };
}
