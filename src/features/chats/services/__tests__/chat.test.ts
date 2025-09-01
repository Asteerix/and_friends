import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { supabase } from '@/shared/lib/supabase/client';
import { conversationService } from '../conversationService';
import { chatService } from '../chatService';
import { mediaService } from '../mediaService';

// Mock Supabase
jest.mock('@/shared/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        download: jest.fn(),
        getPublicUrl: jest.fn(),
        remove: jest.fn(),
      })),
    },
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    })),
  },
}));

describe('Chat System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Conversation Management', () => {
    it('should create a new conversation', async () => {
      const mockConversation = {
        id: 'conv-1',
        name: 'Test Group',
        type: 'group',
        created_by: 'user-1',
        created_at: new Date().toISOString(),
      };

      const mockInsert = jest.fn().mockResolvedValue({
        data: mockConversation,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockConversation, error: null }),
      });

      const result = await conversationService.createConversation({
        name: 'Test Group',
        type: 'group',
        participants: ['user-1', 'user-2', 'user-3'],
      });

      expect(result).toEqual(mockConversation);
    });

    it('should fetch user conversations', async () => {
      const mockConversations = [
        { id: 'conv-1', name: 'Group 1', last_message_at: '2024-01-01T10:00:00Z' },
        { id: 'conv-2', name: 'Group 2', last_message_at: '2024-01-01T09:00:00Z' },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: mockConversations,
          error: null,
        }),
      });

      const result = await conversationService.getUserConversations('user-1');
      
      expect(result).toEqual(mockConversations);
      expect(result[0].id).toBe('conv-1');
    });

    it('should handle direct message creation', async () => {
      const mockDM = {
        id: 'dm-1',
        type: 'direct',
        participants: ['user-1', 'user-2'],
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }, // Not found
        }),
        insert: jest.fn().mockResolvedValue({
          data: mockDM,
          error: null,
        }),
      });

      const result = await conversationService.getOrCreateDirectMessage('user-1', 'user-2');
      
      expect(result.id).toBe('dm-1');
      expect(result.type).toBe('direct');
    });

    it('should add participants to conversation', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({
        data: { participants: ['user-1', 'user-2', 'user-3', 'user-4'] },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { participants: ['user-1', 'user-2', 'user-3'] },
          error: null,
        }),
        update: mockUpdate,
      });

      const result = await conversationService.addParticipants('conv-1', ['user-4']);
      
      expect(result.participants).toContain('user-4');
    });
  });

  describe('Message Handling', () => {
    it('should send a text message', async () => {
      const mockMessage = {
        id: 'msg-1',
        conversation_id: 'conv-1',
        sender_id: 'user-1',
        content: 'Hello, world!',
        type: 'text',
        created_at: new Date().toISOString(),
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          data: mockMessage,
          error: null,
        }),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockMessage,
          error: null,
        }),
      });

      const result = await chatService.sendMessage({
        conversationId: 'conv-1',
        content: 'Hello, world!',
        type: 'text',
      });

      expect(result.content).toBe('Hello, world!');
      expect(result.type).toBe('text');
    });

    it('should handle message with media', async () => {
      const mockUpload = jest.fn().mockResolvedValue({
        data: { path: 'uploads/image.jpg' },
        error: null,
      });

      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.example.com/image.jpg' },
        }),
      });

      const file = new Blob(['image'], { type: 'image/jpeg' });
      const result = await mediaService.uploadMedia(file, 'image');

      expect(result.url).toBe('https://storage.example.com/image.jpg');
    });

    it('should fetch conversation messages with pagination', async () => {
      const mockMessages = [
        { id: 'msg-1', content: 'Message 1', created_at: '2024-01-01T10:00:00Z' },
        { id: 'msg-2', content: 'Message 2', created_at: '2024-01-01T09:00:00Z' },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: mockMessages,
          error: null,
        }),
      });

      const result = await chatService.getMessages('conv-1', { limit: 20 });
      
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('msg-1');
    });

    it('should mark messages as read', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({
        data: { read_at: new Date().toISOString() },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
      });

      await chatService.markAsRead('conv-1', 'user-1');
      
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should handle message deletion', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({
        data: { deleted_at: new Date().toISOString() },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        eq: jest.fn().mockReturnThis(),
      });

      await chatService.deleteMessage('msg-1', 'user-1');
      
      expect(mockUpdate).toHaveBeenCalledWith({
        deleted_at: expect.any(String),
        deleted_by: 'user-1',
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should subscribe to conversation updates', () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      };

      (supabase.channel as jest.Mock).mockReturnValue(mockChannel);

      const callback = jest.fn();
      chatService.subscribeToConversation('conv-1', callback);

      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        }),
        expect.any(Function)
      );
    });

    it('should handle typing indicators', () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        send: jest.fn(),
        subscribe: jest.fn(),
      };

      (supabase.channel as jest.Mock).mockReturnValue(mockChannel);

      chatService.sendTypingIndicator('conv-1', 'user-1', true);

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'typing',
        payload: {
          conversation_id: 'conv-1',
          user_id: 'user-1',
          is_typing: true,
        },
      });
    });
  });

  describe('Media Handling', () => {
    it('should validate media file size', () => {
      const largeFile = new Blob(['x'.repeat(11 * 1024 * 1024)]); // 11MB
      const validFile = new Blob(['x'.repeat(5 * 1024 * 1024)]); // 5MB

      expect(mediaService.validateFileSize(largeFile, 10)).toBe(false);
      expect(mediaService.validateFileSize(validFile, 10)).toBe(true);
    });

    it('should validate media file type', () => {
      const validTypes = ['image/jpeg', 'image/png', 'video/mp4', 'audio/mp3'];
      const invalidTypes = ['application/exe', 'text/javascript'];

      validTypes.forEach(type => {
        expect(mediaService.validateFileType(type)).toBe(true);
      });

      invalidTypes.forEach(type => {
        expect(mediaService.validateFileType(type)).toBe(false);
      });
    });

    it('should generate thumbnail for video', async () => {
      const mockVideoFile = new Blob(['video'], { type: 'video/mp4' });
      
      // Mock video thumbnail generation
      const thumbnail = await mediaService.generateVideoThumbnail(mockVideoFile);
      
      expect(thumbnail).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Network error')),
      });

      try {
        await chatService.getMessages('conv-1');
      } catch (error: any) {
        expect(error.message).toBe('Network error');
      }
    });

    it('should handle unauthorized access', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: null,
          error: { code: '42501', message: 'Insufficient privileges' },
        }),
      });

      try {
        await chatService.getMessages('conv-1');
      } catch (error: any) {
        expect(error.message).toContain('privileges');
      }
    });

    it('should retry failed message sends', async () => {
      let attempts = 0;
      
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockImplementation(() => {
          attempts++;
          if (attempts < 3) {
            return Promise.reject(new Error('Network error'));
          }
          return Promise.resolve({
            data: { id: 'msg-1', content: 'Retry success' },
            error: null,
          });
        }),
      });

      const result = await chatService.sendMessageWithRetry({
        conversationId: 'conv-1',
        content: 'Test message',
      });

      expect(attempts).toBe(3);
      expect(result.content).toBe('Retry success');
    });
  });

  describe('Performance Optimizations', () => {
    it('should cache recent messages', async () => {
      const mockMessages = [
        { id: 'msg-1', content: 'Cached message' },
      ];

      // First call - fetch from DB
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: mockMessages,
          error: null,
        }),
      });

      const result1 = await chatService.getMessagesWithCache('conv-1');
      
      // Second call - should use cache
      const result2 = await chatService.getMessagesWithCache('conv-1');
      
      expect(result1).toEqual(result2);
      expect(supabase.from).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should batch message status updates', async () => {
      const messageIds = ['msg-1', 'msg-2', 'msg-3'];
      
      const mockUpdate = jest.fn().mockResolvedValue({
        data: messageIds.map(id => ({ id, read_at: new Date().toISOString() })),
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        in: jest.fn().mockReturnThis(),
      });

      await chatService.batchMarkAsRead(messageIds, 'user-1');
      
      expect(mockUpdate).toHaveBeenCalledTimes(1); // Single batch update
    });
  });
});