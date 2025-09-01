import { conversationService } from '../conversationService';
import { supabase } from '@/shared/lib/supabase/client';

jest.mock('@/shared/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    })),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

describe('ConversationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConversations', () => {
    it('should fetch conversations for a user', async () => {
      const userId = 'user-1';
      const mockConversations = [
        {
          id: 'conv-1',
          type: 'direct',
          created_at: '2025-01-01T10:00:00Z',
          participants: [
            { user_id: 'user-1', full_name: 'User 1' },
            { user_id: 'user-2', full_name: 'User 2' },
          ],
        },
      ];

      const fromMock = supabase.from('conversations');
      (fromMock.order as jest.Mock).mockResolvedValue({
        data: mockConversations,
        error: null,
      });

      const result = await conversationService.getConversations(userId);

      expect(result).toEqual(mockConversations);
      expect(fromMock.select).toHaveBeenCalled();
      expect(fromMock.or).toHaveBeenCalledWith(
        expect.stringContaining(`participants.cs.{"user_id":"${userId}"}`)
      );
    });

    it('should handle error when fetching conversations', async () => {
      const userId = 'user-1';
      const fromMock = supabase.from('conversations');
      (fromMock.order as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch conversations' },
      });

      await expect(conversationService.getConversations(userId)).rejects.toThrow(
        'Failed to fetch conversations'
      );
    });
  });

  describe('createConversation', () => {
    it('should create a direct conversation', async () => {
      const participants = ['user-1', 'user-2'];
      const mockConversation = {
        id: 'conv-1',
        type: 'direct',
        participants,
      };

      const fromMock = supabase.from('conversations');
      (fromMock.single as jest.Mock).mockResolvedValue({
        data: mockConversation,
        error: null,
      });

      const result = await conversationService.createConversation({
        type: 'direct',
        participants,
      });

      expect(result).toEqual(mockConversation);
      expect(fromMock.insert).toHaveBeenCalledWith({
        type: 'direct',
        participants,
      });
    });

    it('should create a group conversation with name', async () => {
      const participants = ['user-1', 'user-2', 'user-3'];
      const mockConversation = {
        id: 'conv-2',
        type: 'group',
        name: 'Test Group',
        participants,
      };

      const fromMock = supabase.from('conversations');
      (fromMock.single as jest.Mock).mockResolvedValue({
        data: mockConversation,
        error: null,
      });

      const result = await conversationService.createConversation({
        type: 'group',
        name: 'Test Group',
        participants,
      });

      expect(result).toEqual(mockConversation);
      expect(fromMock.insert).toHaveBeenCalledWith({
        type: 'group',
        name: 'Test Group',
        participants,
      });
    });
  });

  describe('sendMessage', () => {
    it('should send a text message', async () => {
      const conversationId = 'conv-1';
      const userId = 'user-1';
      const content = 'Hello, world!';

      const mockMessage = {
        id: 'msg-1',
        conversation_id: conversationId,
        sender_id: userId,
        content,
        type: 'text',
        created_at: '2025-01-01T10:00:00Z',
      };

      const fromMock = supabase.from('messages');
      (fromMock.single as jest.Mock).mockResolvedValue({
        data: mockMessage,
        error: null,
      });

      const result = await conversationService.sendMessage({
        conversation_id: conversationId,
        sender_id: userId,
        content,
        type: 'text',
      });

      expect(result).toEqual(mockMessage);
      expect(fromMock.insert).toHaveBeenCalledWith({
        conversation_id: conversationId,
        sender_id: userId,
        content,
        type: 'text',
      });
    });

    it('should send a media message', async () => {
      const conversationId = 'conv-1';
      const userId = 'user-1';
      const mediaUrl = 'https://example.com/image.jpg';

      const mockMessage = {
        id: 'msg-2',
        conversation_id: conversationId,
        sender_id: userId,
        media_url: mediaUrl,
        type: 'image',
        created_at: '2025-01-01T10:00:00Z',
      };

      const fromMock = supabase.from('messages');
      (fromMock.single as jest.Mock).mockResolvedValue({
        data: mockMessage,
        error: null,
      });

      const result = await conversationService.sendMessage({
        conversation_id: conversationId,
        sender_id: userId,
        media_url: mediaUrl,
        type: 'image',
      });

      expect(result).toEqual(mockMessage);
    });
  });

  describe('getMessages', () => {
    it('should fetch messages for a conversation', async () => {
      const conversationId = 'conv-1';
      const mockMessages = [
        {
          id: 'msg-1',
          conversation_id: conversationId,
          sender_id: 'user-1',
          content: 'Hello',
          created_at: '2025-01-01T10:00:00Z',
        },
        {
          id: 'msg-2',
          conversation_id: conversationId,
          sender_id: 'user-2',
          content: 'Hi there!',
          created_at: '2025-01-01T10:01:00Z',
        },
      ];

      const fromMock = supabase.from('messages');
      (fromMock.order as jest.Mock).mockResolvedValue({
        data: mockMessages,
        error: null,
      });

      const result = await conversationService.getMessages(conversationId);

      expect(result).toEqual(mockMessages);
      expect(fromMock.eq).toHaveBeenCalledWith('conversation_id', conversationId);
      expect(fromMock.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  describe('markAsRead', () => {
    it('should mark messages as read', async () => {
      const conversationId = 'conv-1';
      const userId = 'user-1';

      const fromMock = supabase.from('message_reads');
      (fromMock.eq as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      });

      await conversationService.markAsRead(conversationId, userId);

      expect(fromMock.insert).toHaveBeenCalledWith({
        conversation_id: conversationId,
        user_id: userId,
        read_at: expect.any(String),
      });
    });
  });
});