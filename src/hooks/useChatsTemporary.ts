// TEMPORARY HOOK - Use this instead of useMessagesAdvanced until RLS is fixed
import { useState, useEffect } from 'react';
import { Alert } from 'react-native';

export interface ChatAdvanced {
  id: string;
  name?: string;
  is_group: boolean;
  event_id?: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  lastMessage?: any;
  participants?: any[];
  unreadCount?: number;
}

export const useChatsTemporary = () => {
  const [chats, setChats] = useState<ChatAdvanced[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Return mock data to prevent app crash
    setChats([
      {
        id: 'temp-chat-1',
        name: 'Conversations temporairement indisponibles',
        is_group: false,
        created_by: 'system',
        created_at: new Date().toISOString(),
        lastMessage: {
          content: 'Les conversations sont en maintenance. Veuillez patienter.',
          created_at: new Date().toISOString(),
        },
        unreadCount: 0,
      },
    ]);

    // Show informative alert once
    const timer = setTimeout(() => {
      Alert.alert(
        'Maintenance en cours',
        "Les conversations sont temporairement indisponibles en raison d'une maintenance de sécurité. Nous travaillons à résoudre le problème.",
        [{ text: 'Compris' }]
      );
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return {
    chats,
    loading,
    error,
    refreshChats: () => {
      console.log('Refresh disabled during maintenance');
    },
  };
};
