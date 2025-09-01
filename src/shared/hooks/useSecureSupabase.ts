import { useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase/client';
import {
  safeSupabaseOperation,
  validateProfileUpdate,
  validateEventCreate,
  validateMessageCreate,
  validateNotificationCreate,
  validateUUID,
  sanitizeString,
  sanitizeArray,
  rateLimiters,
  ValidationError,
  DatabaseError,
  type SafeResult,
} from '@/shared/utils/supabaseValidation';
import type { UserProfile } from '@/hooks/useProfile';

export function useSecureSupabase() {
  // ============================================
  // PROFILE OPERATIONS
  // ============================================

  const secureUpdateProfile = useCallback(
    async (userId: string, updates: Partial<UserProfile>): Promise<SafeResult<UserProfile>> => {
      // Validate UUID
      if (!validateUUID(userId)) {
        return {
          data: null,
          error: new ValidationError('Invalid user ID format'),
        };
      }

      // Validate and sanitize input
      try {
        const validatedData = validateProfileUpdate(updates);

        // Additional sanitization for string fields
        if (validatedData.full_name) {
          validatedData.full_name = sanitizeString(validatedData.full_name);
        }
        if (validatedData.bio) {
          validatedData.bio = sanitizeString(validatedData.bio);
        }
        if (validatedData.username) {
          validatedData.username = sanitizeString(validatedData.username).toLowerCase();
        }
        if (validatedData.hobbies) {
          validatedData.hobbies = sanitizeArray(validatedData.hobbies);
        }

        return await safeSupabaseOperation(async () => {
          const { data, error } = await supabase
            .from('profiles')
            .update(validatedData)
            .eq('id', userId)
            .select()
            .single();

          return { data: data as UserProfile, error };
        });
      } catch (err) {
        if (err instanceof Error) {
          return { data: null, error: err };
        }
        return { data: null, error: new ValidationError('Invalid profile data') };
      }
    },
    []
  );

  // ============================================
  // EVENT OPERATIONS
  // ============================================

  const secureCreateEvent = useCallback(async (eventData: any): Promise<SafeResult<any>> => {
    try {
      const validatedData = validateEventCreate(eventData);

      // Sanitize string fields
      validatedData.title = sanitizeString(validatedData.title);
      if (validatedData.description) {
        validatedData.description = sanitizeString(validatedData.description);
      }
      if (validatedData.location) {
        validatedData.location = sanitizeString(validatedData.location);
      }
      if (validatedData.tags) {
        validatedData.tags = sanitizeArray(validatedData.tags);
      }

      return await safeSupabaseOperation(async () => {
        return await supabase.from('events').insert(validatedData).select().single();
      });
    } catch (err) {
      if (err instanceof Error) {
        return { data: null, error: err };
      }
      return { data: null, error: new ValidationError('Invalid event data') };
    }
  }, []);

  const secureGetEvents = useCallback(
    async (filters?: {
      userId?: string;
      isPrivate?: boolean;
      fromDate?: string;
      toDate?: string;
      limit?: number;
    }): Promise<SafeResult<any[]>> => {
      // Validate filters
      if (filters?.userId && !validateUUID(filters.userId)) {
        return {
          data: null,
          error: new ValidationError('Invalid user ID format'),
        };
      }

      return await safeSupabaseOperation(async () => {
        let query = supabase.from('events').select('*');

        if (filters?.userId) {
          query = query.eq('created_by', filters.userId);
        }
        if (filters?.isPrivate !== undefined) {
          query = query.eq('is_private', filters.isPrivate);
        }
        if (filters?.fromDate) {
          query = query.gte('date', filters.fromDate);
        }
        if (filters?.toDate) {
          query = query.lte('date', filters.toDate);
        }
        if (filters?.limit) {
          query = query.limit(Math.min(filters.limit, 100)); // Max 100 items
        }

        return await query.order('date', { ascending: false });
      });
    },
    []
  );

  // ============================================
  // MESSAGE OPERATIONS
  // ============================================

  const secureSendMessage = useCallback(async (messageData: any): Promise<SafeResult<any>> => {
    // Rate limiting
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId && !rateLimiters.api.isAllowed(`message:${userId}`)) {
      return {
        data: null,
        error: new Error('Too many messages. Please wait before sending another.'),
      };
    }

    try {
      const validatedData = validateMessageCreate(messageData);

      // Sanitize text content
      if (validatedData.text) {
        validatedData.text = sanitizeString(validatedData.text);
      }

      // Validate chat_id and author_id
      if (!validateUUID(validatedData.chat_id) || !validateUUID(validatedData.author_id)) {
        return {
          data: null,
          error: new ValidationError('Invalid ID format'),
        };
      }

      return await safeSupabaseOperation(async () => {
        return await supabase.from('messages').insert(validatedData).select().single();
      });
    } catch (err) {
      if (err instanceof Error) {
        return { data: null, error: err };
      }
      return { data: null, error: new ValidationError('Invalid message data') };
    }
  }, []);

  // ============================================
  // FRIENDSHIP OPERATIONS
  // ============================================

  const secureAddFriend = useCallback(
    async (userId: string, friendId: string): Promise<SafeResult<any>> => {
      // Validate UUIDs
      if (!validateUUID(userId) || !validateUUID(friendId)) {
        return {
          data: null,
          error: new ValidationError('Invalid ID format'),
        };
      }

      // Prevent self-friendship
      if (userId === friendId) {
        return {
          data: null,
          error: new ValidationError('Cannot add yourself as a friend'),
        };
      }

      return await safeSupabaseOperation(async () => {
        // Check if friendship already exists
        const { data: existing } = await supabase
          .from('friendships')
          .select('id')
          .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
          .or(`user_id.eq.${friendId},friend_id.eq.${friendId}`)
          .single();

        if (existing) {
          return {
            data: null,
            error: new DatabaseError('Friendship already exists'),
          };
        }

        return await supabase
          .from('friendships')
          .insert({
            user_id: userId,
            friend_id: friendId,
            status: 'pending',
          })
          .select()
          .single();
      });
    },
    []
  );

  // ============================================
  // NOTIFICATION OPERATIONS
  // ============================================

  const secureCreateNotification = useCallback(
    async (notificationData: any): Promise<SafeResult<any>> => {
      try {
        const validatedData = validateNotificationCreate(notificationData);

        // Sanitize string fields
        validatedData.title = sanitizeString(validatedData.title);
        if (validatedData.message) {
          validatedData.message = sanitizeString(validatedData.message);
        }

        // Validate user_id
        if (!validateUUID(validatedData.user_id)) {
          return {
            data: null,
            error: new ValidationError('Invalid user ID format'),
          };
        }

        return await safeSupabaseOperation(async () => {
          return await supabase.from('notifications').insert(validatedData).select().single();
        });
      } catch (err) {
        if (err instanceof Error) {
          return { data: null, error: err };
        }
        return { data: null, error: new ValidationError('Invalid notification data') };
      }
    },
    []
  );

  // ============================================
  // SEARCH OPERATIONS
  // ============================================

  const secureSearchUsers = useCallback(
    async (searchTerm: string, limit: number = 10): Promise<SafeResult<any[]>> => {
      // Sanitize search term
      const sanitizedTerm = sanitizeString(searchTerm);

      if (!sanitizedTerm || sanitizedTerm.length < 2) {
        return {
          data: null,
          error: new ValidationError('Search term must be at least 2 characters'),
        };
      }

      return await safeSupabaseOperation(async () => {
        return await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .or(`full_name.ilike.%${sanitizedTerm}%,username.ilike.%${sanitizedTerm}%`)
          .limit(Math.min(limit, 50)); // Max 50 results
      });
    },
    []
  );

  // ============================================
  // BATCH OPERATIONS
  // ============================================

  const secureBatchOperation = useCallback(
    async <T>(
      operations: Array<() => Promise<{ data: T | null; error: any }>>
    ): Promise<SafeResult<T[]>> => {
      try {
        const results = await Promise.all(operations.map((op) => safeSupabaseOperation(op)));

        const errors = results.filter((r) => r.error).map((r) => r.error);
        if (errors.length > 0) {
          return {
            data: null,
            error: new Error(`Batch operation failed: ${errors.map((e) => e?.message).join(', ')}`),
          };
        }

        const data = results.map((r) => r.data).filter(Boolean) as T[];
        return { data, error: null };
      } catch (err) {
        return {
          data: null,
          error: err instanceof Error ? err : new Error('Batch operation failed'),
        };
      }
    },
    []
  );

  return {
    // Profile operations
    secureUpdateProfile,

    // Event operations
    secureCreateEvent,
    secureGetEvents,

    // Message operations
    secureSendMessage,

    // Friendship operations
    secureAddFriend,

    // Notification operations
    secureCreateNotification,

    // Search operations
    secureSearchUsers,

    // Batch operations
    secureBatchOperation,
  };
}
