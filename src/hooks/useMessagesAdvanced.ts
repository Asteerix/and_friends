import type { PostgrestError, RealtimeChannel } from '@supabase/supabase-js';
import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/shared/lib/supabase/client';
import { useSession } from '@/shared/providers/SessionContext';
import { MessageCacheService } from '@/features/chats/services/messageCacheService';

export interface MessageAdvanced {
  id: string;
  content: string;
  chat_id: string;
  user_id: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
  sender?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
  is_own_message?: boolean;
  read_by?: string[];
}
export interface ChatAdvanced {
  id: string;
  name?: string;
  is_group: boolean;
  event_id?: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  last_message?: MessageAdvanced;
  participants?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
    is_admin?: boolean;
  }[];
  participants_count?: number;
  unread_count?: number;
}
export function useMessagesAdvanced(chatId?: string) {
  const { session } = useSession();
  const [messages, setMessages] = useState<MessageAdvanced[]>([]);
  const [chats, setChats] = useState<ChatAdvanced[]>([]);
  const [currentChat, setCurrentChat] = useState<ChatAdvanced | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PostgrestError | null>(null);
  const [sending, setSending] = useState(false);
  const subscriptionRef = useRef<RealtimeChannel | null>(null);
  const rlsErrorShownRef = useRef<boolean>(false);

  // Fetch messages for a specific chat
  const fetchMessages = async (targetChatId?: string) => {
    const targetId = targetChatId || chatId;
    if (!targetId || !session?.user) return;

    setLoading(true);
    setError(null);

    try {
      // Essayer de récupérer depuis le cache d'abord
      const cachedMessages = await MessageCacheService.getCachedMessages(targetId);
      if (cachedMessages && cachedMessages.length > 0) {
        const formattedMessages: MessageAdvanced[] = cachedMessages.map((msg: any) => ({
          ...msg,
          sender: msg.profiles,
          is_own_message: msg.user_id === session.user.id,
        }));
        setMessages(formattedMessages);
        setLoading(false);
      }

      // Puis récupérer les données fraîches
      const { data, error } = await supabase
        .from('messages')
        .select(
          `
          *,
          profiles:user_id (
            id,
            full_name,
            avatar_url
          )
        `
        )
        .eq('chat_id', targetId)
        .order('created_at', { ascending: true });

      if (error) {
        setError(error);
        console.error('Error fetching messages:', error);
        return;
      }

      const formattedMessages: MessageAdvanced[] = (data || []).map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        chat_id: msg.chat_id,
        user_id: msg.user_id,
        message_type: msg.message_type || 'text',
        metadata: msg.metadata,
        created_at: msg.created_at,
        updated_at: msg.updated_at,
        sender: msg.profiles,
        is_own_message: msg.user_id === session.user.id,
        read_by: msg.read_by || [],
      }));

      setMessages(formattedMessages);

      // Mettre en cache les messages
      await MessageCacheService.cacheMessages(targetId, formattedMessages);
    } catch (err: unknown) {
      setError(err as PostgrestError);
      console.error('Unexpected error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's chats
  const fetchChats = async () => {
    if (!session?.user) return;

    try {
      // Essayer de récupérer depuis le cache d'abord
      const cachedChats = await MessageCacheService.getCachedChats();
      if (cachedChats && cachedChats.length > 0) {
        setChats(cachedChats as ChatAdvanced[]);
      }

      // RLS has been disabled, we can now fetch normally
      const { data: chatParticipations, error } = await supabase
        .from('chat_participants')
        .select(
          `
          chats (
            id,
            name,
            is_group,
            event_id,
            created_by,
            created_at,
            updated_at
          )
        `
        )
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Error fetching chats:', error);
        return;
      }

      const enrichedChats: ChatAdvanced[] = await Promise.all(
        (chatParticipations || []).map(async (cp: any) => {
          const chat = cp.chats;

          // Get last message
          const { data: lastMessage } = await supabase
            .from('messages')
            .select(
              `
              *,
              profiles:user_id (
                full_name,
                avatar_url
              )
            `
            )
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get participants
          const { data: participants } = await supabase
            .from('chat_participants')
            .select(
              `
              is_admin,
              profiles (
                id,
                full_name,
                avatar_url
              )
            `
            )
            .eq('chat_id', chat.id);

          // Get unread count
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chat.id)
            .not('read_by', 'cs', `{${session.user.id}}`);

          const filteredParticipants = (participants || [])
            .map((p: any) => {
              if (Array.isArray(p.profiles)) {
                if (p.profiles[0]) {
                  return {
                    id: p.profiles[0].id,
                    full_name: p.profiles[0].full_name,
                    avatar_url: p.profiles[0].avatar_url,
                    is_admin: p.is_admin,
                  };
                }
                return undefined;
              } else if (p.profiles && typeof p.profiles === 'object') {
                return {
                  id: p.profiles.id,
                  full_name: p.profiles.full_name,
                  avatar_url: p.profiles.avatar_url,
                  is_admin: p.is_admin,
                };
              }
              return undefined;
            })
            .filter(
              (
                p: any
              ): p is { id: string; full_name?: string; avatar_url?: string; is_admin?: boolean } =>
                !!p
            );

          return {
            id: chat.id,
            name: chat.name,
            is_group: chat.is_group,
            event_id: chat.event_id,
            created_by: chat.created_by,
            created_at: chat.created_at,
            updated_at: chat.updated_at,
            last_message: lastMessage
              ? {
                  id: lastMessage.id,
                  content: lastMessage.content,
                  chat_id: lastMessage.chat_id,
                  user_id: lastMessage.user_id,
                  message_type: lastMessage.message_type,
                  created_at: lastMessage.created_at,
                  sender: lastMessage.profiles,
                  is_own_message: lastMessage.user_id === session.user.id,
                }
              : undefined,
            participants: filteredParticipants as {
              id: string;
              full_name?: string;
              avatar_url?: string;
              is_admin?: boolean;
            }[],
            participants_count: filteredParticipants.length,
            unread_count: unreadCount || 0,
          };
        })
      );

      setChats(enrichedChats);

      // Mettre en cache la liste des chats
      await MessageCacheService.cacheChats(enrichedChats);
    } catch (error) {
      console.error('Error in fetchChats:', error);
    }
  };

  // Fetch specific chat details
  const fetchChatDetails = async (targetChatId: string) => {
    if (!session?.user) return;

    try {
      const { data: chat, error } = await supabase
        .from('chats')
        .select('*')
        .eq('id', targetChatId)
        .single();

      if (error || !chat) {
        console.error('Error fetching chat details:', error);
        return;
      }

      // Get participants
      const { data: participants } = await supabase
        .from('chat_participants')
        .select(
          `
          is_admin,
          profiles (
            id,
            full_name,
            avatar_url
          )
        `
        )
        .eq('chat_id', targetChatId);

      const filteredParticipants = (participants || [])
        .map((p: any) => {
          if (Array.isArray(p.profiles)) {
            if (p.profiles[0]) {
              return {
                id: p.profiles[0].id,
                full_name: p.profiles[0].full_name,
                avatar_url: p.profiles[0].avatar_url,
                is_admin: p.is_admin,
              };
            }
            return undefined;
          } else if (p.profiles && typeof p.profiles === 'object') {
            return {
              id: p.profiles.id,
              full_name: p.profiles.full_name,
              avatar_url: p.profiles.avatar_url,
              is_admin: p.is_admin,
            };
          }
          return undefined;
        })
        .filter(
          (
            p: any
          ): p is { id: string; full_name?: string; avatar_url?: string; is_admin?: boolean } => !!p
        );

      const chatDetails: ChatAdvanced = {
        id: chat.id,
        name: chat.name,
        is_group: chat.is_group,
        event_id: chat.event_id,
        created_by: chat.created_by,
        created_at: chat.created_at,
        updated_at: chat.updated_at,
        participants: filteredParticipants as {
          id: string;
          full_name?: string;
          avatar_url?: string;
          is_admin?: boolean;
        }[],
        participants_count: filteredParticipants.length,
      };

      setCurrentChat(chatDetails);
      return chatDetails;
    } catch (error) {
      console.error('Error in fetchChatDetails:', error);
      return null;
    }
  };

  // Send a message
  const sendMessage = async (
    content: string,
    messageType: 'text' | 'image' | 'file' = 'text',
    metadata?: Record<string, any>
  ) => {
    if (!session?.user || !chatId || !content.trim())
      return { error: { message: 'Invalid parameters' } };

    setSending(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            content: content.trim(),
            chat_id: chatId,
            user_id: session.user.id,
            message_type: messageType,
            metadata: metadata || {},
            read_by: [session.user.id], // Mark as read by sender
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        return { error };
      }

      // Update chat's updated_at
      await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatId);

      return { data, error: null };
    } catch (err: unknown) {
      console.error('Unexpected error sending message:', err);
      return { error: err };
    } finally {
      setSending(false);
    }
  };

  // Mark messages as read
  const markAsRead = async (messageIds: string[]) => {
    if (!session?.user || messageIds.length === 0) return;

    try {
      await Promise.all(
        messageIds.map(async (messageId) => {
          const { data: message } = await supabase
            .from('messages')
            .select('read_by')
            .eq('id', messageId)
            .single();

          if (message) {
            const readBy = message.read_by || [];
            if (!readBy.includes(session.user.id)) {
              readBy.push(session.user.id);
              await supabase.from('messages').update({ read_by: readBy }).eq('id', messageId);
            }
          }
        })
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Create a new chat
  const createChat = async (
    name: string,
    isGroup: boolean,
    participantIds: string[],
    eventId?: string
  ) => {
    if (!session?.user) return { error: { message: 'Not authenticated' } };

    try {
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert([
          {
            name,
            is_group: isGroup,
            event_id: eventId,
            created_by: session.user.id,
          },
        ])
        .select()
        .single();

      if (chatError) {
        console.error('Error creating chat:', chatError);
        return { error: chatError };
      }

      // Add participants
      const participantInserts = [session.user.id, ...participantIds].map((userId) => ({
        chat_id: chat.id,
        user_id: userId,
        is_admin: userId === session.user.id,
      }));

      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert(participantInserts);

      if (participantsError) {
        console.error('Error adding participants:', participantsError);
        return { error: participantsError };
      }

      await fetchChats(); // Refresh chats list
      return { data: chat, error: null };
    } catch (err: unknown) {
      console.error('Unexpected error creating chat:', err);
      return { error: err };
    }
  };

  // Set up real-time subscription for messages
  useEffect(() => {
    if (!chatId || !session?.user) return;

    // Unsubscribe from previous subscription
    if (subscriptionRef.current) {
      void supabase.removeChannel(subscriptionRef.current);
    }

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
          console.log('New message received:', payload);

          // Fetch sender details
          const { data: sender } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', payload.new.user_id)
            .single();

          const newMessage: MessageAdvanced = {
            id: payload.new.id,
            content: payload.new.content,
            chat_id: payload.new.chat_id,
            user_id: payload.new.user_id,
            message_type: payload.new.message_type || 'text',
            metadata: payload.new.metadata,
            created_at: payload.new.created_at,
            sender: sender || undefined,
            is_own_message: payload.new.user_id === session.user.id,
            read_by: payload.new.read_by || [],
          };

          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    subscriptionRef.current = subscription;

    return () => {
      if (subscriptionRef.current) {
        void supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [chatId, session?.user?.id]);

  // Auto-fetch messages when chatId changes
  useEffect(() => {
    if (chatId) {
      fetchMessages();
      fetchChatDetails(chatId);
    }
  }, [chatId]);

  // Auto-fetch chats on mount
  useEffect(() => {
    fetchChats();
  }, [session?.user?.id]);

  return {
    messages,
    chats,
    currentChat,
    loading,
    error,
    sending,
    fetchMessages,
    fetchChats,
    fetchChatDetails,
    sendMessage,
    markAsRead,
    createChat,
  };
}
