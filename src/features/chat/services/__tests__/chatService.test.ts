import { chatService } from '../chatService';
import { supabase } from '@/shared/lib/supabase/client';

jest.mock('@/shared/lib/supabase/client');

describe('ChatService', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should send a text message successfully', async () => {
      const chatId = 'chat-123';
      const userId = 'user-456';
      const content = 'Hello, world!';
      
      const mockMessage = {
        id: 'msg-789',
        chat_id: chatId,
        sender_id: userId,
        content,
        created_at: new Date().toISOString(),
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockMessage,
          error: null,
        }),
      });

      const result = await chatService.sendMessage(chatId, userId, content);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('messages');
      expect(result).toEqual(mockMessage);
    });

    it('should handle send message error', async () => {
      const chatId = 'chat-123';
      const userId = 'user-456';
      const content = 'Hello, world!';

      mockSupabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Network error' },
        }),
      });

      await expect(chatService.sendMessage(chatId, userId, content))
        .rejects.toThrow('Network error');
    });

    it('should send media message with attachment', async () => {
      const chatId = 'chat-123';
      const userId = 'user-456';
      const mediaUrl = 'https://example.com/image.jpg';
      
      const mockMessage = {
        id: 'msg-789',
        chat_id: chatId,
        sender_id: userId,
        content: '',
        media_url: mediaUrl,
        media_type: 'image',
        created_at: new Date().toISOString(),
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockMessage,
          error: null,
        }),
      });

      const result = await chatService.sendMediaMessage(chatId, userId, mediaUrl, 'image');
      
      expect(result).toEqual(mockMessage);
    });
  });

  describe('getMessages', () => {
    it('should fetch messages for a chat', async () => {
      const chatId = 'chat-123';
      const mockMessages = [
        {
          id: 'msg-1',
          chat_id: chatId,
          content: 'Message 1',
          created_at: '2024-01-01T10:00:00Z',
        },
        {
          id: 'msg-2',
          chat_id: chatId,
          content: 'Message 2',
          created_at: '2024-01-01T10:01:00Z',
        },
      ];

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: mockMessages,
          error: null,
        }),
      });

      const result = await chatService.getMessages(chatId, 50);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('messages');
      expect(result).toEqual(mockMessages);
    });

    it('should handle fetch messages error', async () => {
      const chatId = 'chat-123';

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      });

      await expect(chatService.getMessages(chatId))
        .rejects.toThrow('Database error');
    });
  });

  describe('markAsRead', () => {
    it('should mark messages as read', async () => {
      const chatId = 'chat-123';
      const userId = 'user-456';
      const messageIds = ['msg-1', 'msg-2', 'msg-3'];

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      await chatService.markAsRead(chatId, userId, messageIds);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('message_reads');
    });
  });

  describe('deleteMessage', () => {
    it('should delete a message', async () => {
      const messageId = 'msg-123';

      mockSupabase.from = jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      await chatService.deleteMessage(messageId);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('messages');
    });

    it('should handle delete error', async () => {
      const messageId = 'msg-123';

      mockSupabase.from = jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Permission denied' },
        }),
      });

      await expect(chatService.deleteMessage(messageId))
        .rejects.toThrow('Permission denied');
    });
  });

  describe('typing indicators', () => {
    it('should set typing status', async () => {
      const chatId = 'chat-123';
      const userId = 'user-456';

      mockSupabase.from = jest.fn().mockReturnValue({
        upsert: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      await chatService.setTypingStatus(chatId, userId, true);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('typing_indicators');
    });
  });

  describe('uploadMedia', () => {
    it('should upload media file', async () => {
      const file = new Blob(['test'], { type: 'image/jpeg' });
      const fileName = 'test.jpg';
      
      mockSupabase.storage = {
        from: jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({
            data: { path: `chat-media/${fileName}` },
            error: null,
          }),
          getPublicUrl: jest.fn().mockReturnValue({
            data: { publicUrl: `https://storage.example.com/chat-media/${fileName}` },
          }),
        }),
      };

      const result = await chatService.uploadMedia(file, fileName);
      
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('chat-media');
      expect(result).toContain('https://storage.example.com');
    });

    it('should handle upload error', async () => {
      const file = new Blob(['test'], { type: 'image/jpeg' });
      const fileName = 'test.jpg';
      
      mockSupabase.storage = {
        from: jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Storage quota exceeded' },
          }),
        }),
      };

      await expect(chatService.uploadMedia(file, fileName))
        .rejects.toThrow('Storage quota exceeded');
    });
  });
});