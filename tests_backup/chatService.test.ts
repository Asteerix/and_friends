import { chatService } from '../services/chatService';

// Mock data
const mockChat = {
  id: 'chat-1',
  name: 'Test Chat',
  is_group: false,
  created_by: 'user-1',
  participants: ['user-1', 'user-2'],
};

const mockMessage = {
  id: 'msg-1',
  chat_id: 'chat-1',
  author_id: 'user-1',
  type: 'text' as const,
  text: 'Hello world',
  created_at: new Date().toISOString(),
};

describe('chatService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserChats', () => {
    it('should fetch user chats successfully', async () => {
      const result = await chatService.getUserChats('user-1');
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle empty user ID', async () => {
      await expect(chatService.getUserChats('')).rejects.toThrow();
    });
  });

  describe('createChat', () => {
    const mockChatData = {
      name: 'New Chat',
      is_group: true,
      participantIds: ['user-1', 'user-2'],
    };

    it('should create chat successfully', async () => {
      const result = await chatService.createChat(mockChatData);
      expect(result).toBeDefined();
    });

    it('should validate participant count for group chats', async () => {
      const invalidData = { ...mockChatData, participantIds: ['user-1'] };
      await expect(chatService.createChat(invalidData)).rejects.toThrow();
    });
  });

  describe('sendMessage', () => {
    const mockMessageData = {
      chatId: 'chat-1',
      type: 'text' as const,
      text: 'Test message',
    };

    it('should send message successfully', async () => {
      const result = await chatService.sendMessage(mockMessageData);
      expect(result).toBeDefined();
    });

    it('should validate message content', async () => {
      const invalidData = { ...mockMessageData, text: '' };
      await expect(chatService.sendMessage(invalidData)).rejects.toThrow();
    });
  });

  describe('getChatMessages', () => {
    it('should fetch chat messages successfully', async () => {
      const result = await chatService.getChatMessages('chat-1');
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle pagination correctly', async () => {
      const result = await chatService.getChatMessages('chat-1', { limit: 10, offset: 0 });
      expect(result).toBeDefined();
    });
  });

  describe('markMessageAsRead', () => {
    it('should mark message as read successfully', async () => {
      await expect(chatService.markMessageAsRead('msg-1', 'user-1')).resolves.not.toThrow();
    });

    it('should handle invalid message ID', async () => {
      await expect(chatService.markMessageAsRead('', 'user-1')).rejects.toThrow();
    });
  });

  describe('deleteMessage', () => {
    it('should delete message successfully', async () => {
      await expect(chatService.deleteMessage('msg-1', 'user-1')).resolves.not.toThrow();
    });

    it('should prevent deletion by non-author', async () => {
      await expect(chatService.deleteMessage('msg-1', 'user-2')).rejects.toThrow();
    });
  });
});
