import type { RealtimeChannel } from '@supabase/supabase-js';
import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { supabase } from '@/shared/lib/supabase/client';
import { useSession } from '@/shared/providers/SessionContext';

export interface MessageAdvanced {
  id: string;
  content: string;
  chat_id: string;
  user_id: string;
  message_type: 'text' | 'image' | 'audio' | 'video' | 'file' | 'location' | 'event' | 'system';
  metadata?: any;
  created_at: string;
  updated_at?: string;
  is_edited: boolean;
  is_deleted: boolean;
  read_by?: string[];
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

export interface ChatAdvanced {
  id: string;
  name?: string;
  is_group: boolean;
  event_id?: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  lastMessage?: MessageAdvanced;
  participants?: any[];
  unreadCount?: number;
}

// Temporary hook that returns empty data to avoid RLS errors
export const useMessagesAdvanced = (chatId?: string) => {
  const { session } = useSession();
  const [messages, setMessages] = useState<MessageAdvanced[]>([]);
  const [chats, setChats] = useState<ChatAdvanced[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Show alert about the issue
    Alert.alert(
      'Problème temporaire',
      'Les conversations sont temporairement indisponibles en raison d\'un problème de configuration. Nous travaillons à le résoudre.',
      [{ text: 'OK' }]
    );
  }, []);

  const sendMessage = async (content: string, type: string = 'text', metadata?: any) => {
    Alert.alert('Indisponible', 'L\'envoi de messages est temporairement désactivé.');
    return null;
  };

  const markMessageAsRead = async (messageId: string) => {
    // No-op
  };

  const deleteMessage = async (messageId: string) => {
    // No-op
  };

  const editMessage = async (messageId: string, newContent: string) => {
    // No-op
  };

  const sendTypingIndicator = async (isTyping: boolean) => {
    // No-op
  };

  return {
    messages,
    chats,
    loading,
    error,
    sendMessage,
    markMessageAsRead,
    deleteMessage,
    editMessage,
    sendTypingIndicator,
    isTyping,
    typingUsers,
    refreshMessages: () => {},
    refreshChats: () => {},
  };
};