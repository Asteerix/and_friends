import { ChatService } from '../chatService';
import { supabase } from '@/shared/lib/supabase/client';

// Mock dependencies
jest.mock('@/shared/lib/supabase/client');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('ChatService', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    user_metadata: {
      full_name: 'Test User',
    },
  };

  const mockChat = {
    id: 'chat-123',
    name: 'Test Chat',
    is_group: true,
    event_id: 'event-456',
    created_by: 'user-123',
    status: 'active',
    created_at: '2024-01-15T12:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock auth.getUser
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock default successful database operations
    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockChat, error: null }),
    } as any);
  });

  describe('createChat', () => {
    const createChatParams = {
      name: 'Test Group Chat',
      is_group: true,
      participant_ids: ['user-456', 'user-789'],
      event_id: 'event-123',
    };

    it('should successfully create a group chat', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'chats') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockChat, error: null }),
          };
        }
        if (table === 'chat_participants') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        if (table === 'messages') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {};
      });

      const result = await ChatService.createChat(createChatParams);

      expect(result.data).toEqual(mockChat);
      expect(result.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('chats');
      expect(mockSupabase.from).toHaveBeenCalledWith('chat_participants');
      expect(mockSupabase.from).toHaveBeenCalledWith('messages');
    });

    it('should successfully create a direct chat', async () => {
      const directChatParams = {
        is_group: false,
        participant_ids: ['user-456'],
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'chats') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { ...mockChat, is_group: false }, error: null }),
          };
        }
        if (table === 'chat_participants') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {};
      });

      const result = await ChatService.createChat(directChatParams);

      expect(result.data?.is_group).toBe(false);
      expect(result.error).toBeNull();
    });

    it('should fail when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const result = await ChatService.createChat(createChatParams);

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });

    it('should handle chat creation error', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'chats') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Database error', code: '23505' } 
            }),
          };
        }
        return {};
      });

      const result = await ChatService.createChat(createChatParams);

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });

    it('should handle participant addition error', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'chats') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockChat, error: null }),
          };
        }
        if (table === 'chat_participants') {
          return {
            insert: jest.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Constraint violation' } 
            }),
          };
        }
        return {};
      });

      const result = await ChatService.createChat(createChatParams);

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  describe('getOrCreateDirectChat', () => {
    const otherUserId = 'user-456';

    it('should return existing direct chat', async () => {
      const mockExistingChat = { id: 'chat-456', is_group: false, name: null };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'chat_participants') {
          if (mockSupabase.from(table).select) {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ 
                data: { user_id: otherUserId }, 
                error: null 
              }),
            };
          } else {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({ 
                data: [{ 
                  chat_id: 'chat-456',
                  chats: mockExistingChat
                }], 
                error: null 
              }),
            };
          }
        }
        return {};
      });

      const result = await ChatService.getOrCreateDirectChat(otherUserId);

      expect(result.data).toEqual(mockExistingChat);
      expect(result.error).toBeNull();
    });

    it('should create new direct chat if none exists', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'chat_participants') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return {};
      });

      // Mock the createChat method
      const createChatSpy = jest.spyOn(ChatService, 'createChat').mockResolvedValue({
        data: { ...mockChat, is_group: false },
        error: null,
      });

      const result = await ChatService.getOrCreateDirectChat(otherUserId);

      expect(createChatSpy).toHaveBeenCalledWith({
        is_group: false,
        participant_ids: [otherUserId],
      });
      expect(result.data?.is_group).toBe(false);

      createChatSpy.mockRestore();
    });

    it('should handle authentication error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const result = await ChatService.getOrCreateDirectChat(otherUserId);

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  describe('addParticipants', () => {
    const addParticipantsParams = {
      chat_id: 'chat-123',
      user_ids: ['user-456', 'user-789'],
    };

    it('should successfully add participants to group chat', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'chat_participants') {
          if (mockSupabase.from(table).select) {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ 
                data: { is_admin: true }, 
                error: null 
              }),
            };
          } else {
            return {
              insert: jest.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({ 
              data: [
                { id: 'user-456', full_name: 'User 456' },
                { id: 'user-789', full_name: 'User 789' }
              ], 
              error: null 
            }),
          };
        }
        if (table === 'messages') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {};
      });

      const result = await ChatService.addParticipants(addParticipantsParams);

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should fail when user is not admin', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'chat_participants') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ 
              data: { is_admin: false }, 
              error: null 
            }),
          };
        }
        return {};
      });

      const result = await ChatService.addParticipants(addParticipantsParams);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle database error', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'chat_participants') {
          if (mockSupabase.from(table).select) {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ 
                data: { is_admin: true }, 
                error: null 
              }),
            };
          } else {
            return {
              insert: jest.fn().mockResolvedValue({ 
                data: null, 
                error: { message: 'Constraint violation' } 
              }),
            };
          }
        }
        return {};
      });

      const result = await ChatService.addParticipants(addParticipantsParams);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('removeParticipant', () => {
    const removeParticipantParams = {
      chat_id: 'chat-123',
      user_id: 'user-456',
    };

    it('should successfully remove participant as admin', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'chat_participants') {
          if (mockSupabase.from(table).select) {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ 
                data: { is_admin: true }, 
                error: null 
              }),
            };
          } else {
            return {
              delete: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ 
              data: { full_name: 'User 456' }, 
              error: null 
            }),
          };
        }
        if (table === 'messages') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {};
      });

      const result = await ChatService.removeParticipant(removeParticipantParams);

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should allow user to remove themselves', async () => {
      const selfRemovalParams = {
        chat_id: 'chat-123',
        user_id: 'user-123', // Same as authenticated user
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'chat_participants') {
          if (mockSupabase.from(table).select) {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ 
                data: { is_admin: false }, 
                error: null 
              }),
            };
          } else {
            return {
              delete: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ 
              data: { full_name: 'Test User' }, 
              error: null 
            }),
          };
        }
        if (table === 'messages') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {};
      });

      const result = await ChatService.removeParticipant(selfRemovalParams);

      expect(result.success).toBe(true);
    });

    it('should fail when non-admin tries to remove others', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'chat_participants') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ 
              data: { is_admin: false }, 
              error: null 
            }),
          };
        }
        return {};
      });

      const result = await ChatService.removeParticipant(removeParticipantParams);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('updateChat', () => {
    const chatId = 'chat-123';
    const updates = { name: 'Updated Chat Name' };

    it('should successfully update chat details', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'chat_participants') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ 
              data: { is_admin: true }, 
              error: null 
            }),
          };
        }
        if (table === 'chats') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        if (table === 'messages') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {};
      });

      const result = await ChatService.updateChat(chatId, updates);

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should fail when user is not admin', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'chat_participants') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ 
              data: { is_admin: false }, 
              error: null 
            }),
          };
        }
        return {};
      });

      const result = await ChatService.updateChat(chatId, updates);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('getChatParticipants', () => {
    const chatId = 'chat-123';

    it('should successfully get chat participants', async () => {
      const mockParticipants = [
        {
          user_id: 'user-123',
          is_admin: true,
          joined_at: '2024-01-15T12:00:00Z',
          profiles: {
            id: 'user-123',
            full_name: 'Test User',
            username: 'testuser',
            avatar_url: 'https://example.com/avatar.jpg',
            bio: 'Test bio',
          },
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockParticipants, error: null }),
      } as any);

      const result = await ChatService.getChatParticipants(chatId);

      expect(result.data).toEqual(mockParticipants);
      expect(result.error).toBeNull();
    });

    it('should handle error when getting participants', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Chat not found' } 
        }),
      } as any);

      const result = await ChatService.getChatParticipants(chatId);

      expect(result.data).toEqual([]);
      expect(result.error).toBeTruthy();
    });
  });

  describe('markMessagesAsRead', () => {
    const chatId = 'chat-123';
    const messageIds = ['msg-1', 'msg-2'];

    it('should successfully mark messages as read', async () => {
      const mockMessages = [
        { id: 'msg-1', read_by: ['other-user'] },
        { id: 'msg-2', read_by: [] },
      ];

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'messages') {
          if (mockSupabase.from(table).select) {
            return {
              select: jest.fn().mockReturnThis(),
              in: jest.fn().mockResolvedValue({ data: mockMessages, error: null }),
            };
          } else {
            return {
              update: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
        }
        return {};
      });

      const result = await ChatService.markMessagesAsRead(chatId, messageIds);

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should handle messages already read by user', async () => {
      const mockMessages = [
        { id: 'msg-1', read_by: ['user-123'] }, // Already read
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: mockMessages, error: null }),
      } as any);

      const result = await ChatService.markMessagesAsRead(chatId, messageIds);

      expect(result.success).toBe(true);
    });

    it('should handle empty message list', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      const result = await ChatService.markMessagesAsRead(chatId, messageIds);

      expect(result.success).toBe(true);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle authentication errors consistently', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Session expired' },
      });

      const operations = [
        () => ChatService.createChat({ is_group: false, participant_ids: [] }),
        () => ChatService.getOrCreateDirectChat('user-456'),
        () => ChatService.addParticipants({ chat_id: 'chat-123', user_ids: [] }),
        () => ChatService.removeParticipant({ chat_id: 'chat-123', user_id: 'user-456' }),
        () => ChatService.updateChat('chat-123', { name: 'Test' }),
        () => ChatService.markMessagesAsRead('chat-123', []),
      ];

      for (const operation of operations) {
        const result = await operation();
        expect(result.success || result.data).toBeFalsy();
        expect(result.error).toBeTruthy();
      }
    });

    it('should handle network timeouts', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Network timeout');
      });

      const result = await ChatService.createChat({ is_group: true, participant_ids: [] });

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });

    it('should handle malformed responses', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: undefined, error: null }),
      } as any);

      const result = await ChatService.getChatParticipants('chat-123');

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('should handle empty participant lists gracefully', async () => {
      const result = await ChatService.createChat({
        is_group: true,
        participant_ids: [], // Empty list
      });

      // Should still create chat with just the creator
      expect(mockSupabase.from).toHaveBeenCalledWith('chats');
    });

    it('should handle concurrent operations', async () => {
      const operations = Array(5).fill(0).map((_, i) => 
        ChatService.createChat({
          name: `Chat ${i}`,
          is_group: true,
          participant_ids: [`user-${i}`],
        })
      );

      const results = await Promise.all(operations);

      // All should succeed (assuming mocks are set up for success)
      results.forEach(result => {
        expect(result.data || result.success).toBeTruthy();
      });
    });
  });

  describe('permission validation', () => {
    it('should validate admin permissions for sensitive operations', async () => {
      const sensitiveOps = [
        () => ChatService.addParticipants({ chat_id: 'chat-123', user_ids: ['user-456'] }),
        () => ChatService.updateChat('chat-123', { name: 'New Name' }),
      ];

      // Mock non-admin user
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'chat_participants') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ 
              data: { is_admin: false }, 
              error: null 
            }),
          };
        }
        return {};
      });

      for (const op of sensitiveOps) {
        const result = await op();
        expect(result.success).toBe(false);
        expect(result.error).toBeTruthy();
      }
    });

    it('should allow self-removal even for non-admins', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'chat_participants') {
          if (mockSupabase.from(table).select) {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ 
                data: { is_admin: false }, 
                error: null 
              }),
            };
          } else {
            return {
              delete: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ 
              data: { full_name: 'Test User' }, 
              error: null 
            }),
          };
        }
        if (table === 'messages') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {};
      });

      // User removing themselves
      const result = await ChatService.removeParticipant({
        chat_id: 'chat-123',
        user_id: 'user-123', // Same as authenticated user
      });

      expect(result.success).toBe(true);
    });
  });
});