import { supabase } from '@/shared/lib/supabase/client';
import { errorLogger } from '@/shared/utils/errorLogger';
import { ENV_CONFIG } from '@/shared/config/environment';

export interface MessagePagination {
  messages: any[];
  hasMore: boolean;
  nextCursor?: string;
  totalCount?: number;
}

export interface MessageServiceConfig {
  pageSize: number;
  maxCacheSize: number;
  prefetchPages: number;
}

/**
 * Optimized Message Service with Pagination and Performance Enhancements
 * PERFORMANCE: Addresses critical pagination issue found in security audit
 */
export class MessageService {
  private config: MessageServiceConfig;
  private messageCache = new Map<string, MessagePagination>();
  private subscriptions = new Map<string, () => void>();

  constructor(config?: Partial<MessageServiceConfig>) {
    this.config = {
      pageSize: 50, // Load 50 messages per page instead of ALL
      maxCacheSize: 1000, // Cache up to 1000 messages per chat
      prefetchPages: 1, // Prefetch 1 additional page
      ...config,
    };
  }

  /**
   * Fetch messages with pagination - SECURITY FIX
   * Previously loaded ALL messages causing performance issues
   */
  async getMessages(
    chatId: string,
    cursor?: string,
    options: {
      includeMedia?: boolean;
      includeReactions?: boolean;
    } = {}
  ): Promise<MessagePagination> {
    try {
      let query = supabase
        .from('messages')
        .select(
          options.includeMedia || options.includeReactions
            ? `
            *,
            profiles:author_id (
              id,
              full_name,
              avatar_url
            ),
            message_reactions (
              id,
              reaction_type,
              user_id,
              created_at
            ),
            message_media (
              id,
              media_type,
              media_url,
              thumbnail_url,
              file_size,
              duration
            )
          `
            : `
            *,
            profiles:author_id (
              id,
              full_name,
              avatar_url
            )
          `
        )
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(this.config.pageSize);

      // Add cursor-based pagination
      if (cursor) {
        query = query.lt('created_at', cursor);
      }

      const { data: messages, error, count } = await query;

      if (error) {
        errorLogger.log(error, { context: 'messageService.getMessages', chatId });
        throw error;
      }

      const hasMore = messages.length === this.config.pageSize;
      const nextCursor =
        hasMore && messages.length > 0 ? messages[messages.length - 1].created_at : undefined;

      const result: MessagePagination = {
        messages: messages.reverse(), // Reverse to show oldest first in UI
        hasMore,
        nextCursor,
        totalCount: count || undefined,
      };

      // Cache results for performance
      this.updateCache(chatId, result, cursor);

      return result;
    } catch (error) {
      errorLogger.log(error as Error, {
        context: 'messageService.getMessages',
        chatId,
        cursor,
      });
      throw error;
    }
  }

  /**
   * Send a new message with optimistic updates
   */
  async sendMessage(
    chatId: string,
    content: string,
    type: 'text' | 'image' | 'video' | 'audio' | 'file' = 'text',
    metadata?: any
  ) {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      const messageData = {
        chat_id: chatId,
        author_id: user.user.id,
        text: content,
        type,
        meta: metadata,
        created_at: new Date().toISOString(),
      };

      // Optimistic update to cache
      this.addOptimisticMessage(chatId, {
        ...messageData,
        id: `temp-${Date.now()}`,
        profiles: {
          id: user.user.id,
          full_name: user.user.user_metadata?.full_name || 'You',
          avatar_url: user.user.user_metadata?.avatar_url,
        },
        sending: true,
      });

      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select(
          `
          *,
          profiles:author_id (
            id,
            full_name,
            avatar_url
          )
        `
        )
        .single();

      if (error) {
        this.removeOptimisticMessage(chatId, `temp-${Date.now()}`);
        throw error;
      }

      // Replace optimistic message with real one
      this.replaceOptimisticMessage(chatId, data);

      return data;
    } catch (error) {
      errorLogger.log(error as Error, {
        context: 'messageService.sendMessage',
        chatId,
        type,
      });
      throw error;
    }
  }

  /**
   * Subscribe to real-time message updates with performance optimizations
   */
  subscribeToMessages(
    chatId: string,
    onMessage: (message: any) => void,
    onError?: (error: Error) => void
  ) {
    try {
      // Clean up existing subscription if any
      this.unsubscribeFromMessages(chatId);

      const subscription = supabase
        .channel(`messages:${chatId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatId}`,
          },
          (payload) => {
            try {
              if (payload.eventType === 'INSERT') {
                // Only process new messages, not updates
                onMessage(payload.new);
                this.addRealtimeMessage(chatId, payload.new);
              }
            } catch (error) {
              onError?.(error as Error);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`📡 Subscribed to messages for chat ${chatId}`);
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`❌ Subscription error for chat ${chatId}`);
            onError?.(new Error('Real-time subscription failed'));
          }
        });

      // Store cleanup function
      this.subscriptions.set(chatId, () => {
        subscription.unsubscribe();
      });
    } catch (error) {
      errorLogger.log(error as Error, {
        context: 'messageService.subscribeToMessages',
        chatId,
      });
      onError?.(error as Error);
    }
  }

  /**
   * Unsubscribe from message updates
   */
  unsubscribeFromMessages(chatId: string) {
    const cleanup = this.subscriptions.get(chatId);
    if (cleanup) {
      cleanup();
      this.subscriptions.delete(chatId);
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(chatId: string, messageIds: string[]) {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase.from('message_read_status').upsert(
        messageIds.map((messageId) => ({
          message_id: messageId,
          user_id: user.user!.id,
          read_at: new Date().toISOString(),
        }))
      );

      if (error) {
        errorLogger.log(error, {
          context: 'messageService.markAsRead',
          chatId,
          messageCount: messageIds.length,
        });
      }
    } catch (error) {
      errorLogger.log(error as Error, {
        context: 'messageService.markAsRead',
        chatId,
      });
    }
  }

  /**
   * Cache management methods
   */
  private updateCache(chatId: string, result: MessagePagination, cursor?: string) {
    const existing = this.messageCache.get(chatId);

    if (!cursor && !existing) {
      // First load
      this.messageCache.set(chatId, result);
    } else if (cursor && existing) {
      // Append to existing cache
      const updated = {
        ...result,
        messages: [...existing.messages, ...result.messages],
      };

      // Limit cache size for memory management
      if (updated.messages.length > this.config.maxCacheSize) {
        updated.messages = updated.messages.slice(-this.config.maxCacheSize);
      }

      this.messageCache.set(chatId, updated);
    }
  }

  private addOptimisticMessage(chatId: string, message: any) {
    const cached = this.messageCache.get(chatId);
    if (cached) {
      cached.messages.push(message);
      this.messageCache.set(chatId, cached);
    }
  }

  private removeOptimisticMessage(chatId: string, messageId: string) {
    const cached = this.messageCache.get(chatId);
    if (cached) {
      cached.messages = cached.messages.filter((m) => m.id !== messageId);
      this.messageCache.set(chatId, cached);
    }
  }

  private replaceOptimisticMessage(chatId: string, realMessage: any) {
    const cached = this.messageCache.get(chatId);
    if (cached) {
      const tempIndex = cached.messages.findIndex((m) => m.sending);
      if (tempIndex >= 0) {
        cached.messages[tempIndex] = realMessage;
        this.messageCache.set(chatId, cached);
      }
    }
  }

  private addRealtimeMessage(chatId: string, message: any) {
    const cached = this.messageCache.get(chatId);
    if (cached) {
      // Avoid duplicates
      const exists = cached.messages.find((m) => m.id === message.id);
      if (!exists) {
        cached.messages.push(message);
        this.messageCache.set(chatId, cached);
      }
    }
  }

  /**
   * Clear cache and subscriptions
   */
  cleanup() {
    this.messageCache.clear();
    this.subscriptions.forEach((cleanup) => cleanup());
    this.subscriptions.clear();
  }
}

// Export singleton instance
export const messageService = new MessageService();
