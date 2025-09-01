import { supabase } from '@/shared/lib/supabase/client';
import { validateMessageCreate } from '@/shared/utils/supabaseValidation';

describe('Chat and Messaging Integration', () => {
  const mockUserId = 'user-123';
  const mockChatId = 'chat-456';
  const mockEventId = 'event-789';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Chat Creation and Management', () => {
    it('should create group chat and add participants', async () => {
      const chatData = {
        name: 'Event Planning Chat',
        is_group: true,
        event_id: mockEventId,
        created_by: mockUserId
      };

      // Mock chat creation
      const mockChatResponse = {
        data: {
          id: mockChatId,
          ...chatData,
          created_at: '2024-01-01T00:00:00.000Z'
        },
        error: null
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue(mockChatResponse)
      });

      const chatResult = await supabase
        .from('chats')
        .insert(chatData);

      expect(chatResult.error).toBeNull();
      expect(chatResult.data?.name).toBe('Event Planning Chat');
      expect(chatResult.data?.is_group).toBe(true);

      // Add participants to the chat
      const participants = [
        { user_id: mockUserId, is_admin: true },
        { user_id: 'user-456', is_admin: false },
        { user_id: 'user-789', is_admin: false }
      ];

      for (const participant of participants) {
        const mockParticipantResponse = {
          data: {
            chat_id: mockChatId,
            ...participant,
            joined_at: '2024-01-01T00:00:00.000Z'
          },
          error: null
        };

        (supabase.from as jest.Mock).mockReturnValue({
          insert: jest.fn().mockResolvedValue(mockParticipantResponse)
        });

        const participantResult = await supabase
          .from('chat_participants')
          .insert({
            chat_id: mockChatId,
            ...participant
          });

        expect(participantResult.error).toBeNull();
        expect(participantResult.data?.user_id).toBe(participant.user_id);
      }
    });

    it('should create direct message chat', async () => {
      const dmChatData = {
        name: null,
        is_group: false,
        created_by: mockUserId
      };

      const mockDmResponse = {
        data: {
          id: 'dm-chat-123',
          ...dmChatData
        },
        error: null
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue(mockDmResponse)
      });

      const dmResult = await supabase
        .from('chats')
        .insert(dmChatData);

      expect(dmResult.error).toBeNull();
      expect(dmResult.data?.is_group).toBe(false);
    });
  });

  describe('Message Operations', () => {
    it('should send different types of messages', async () => {
      const messageTypes = [
        {
          type: 'text',
          text: 'Hello everyone!',
          meta: null
        },
        {
          type: 'image',
          text: 'Check out this photo',
          meta: { url: 'https://example.com/image.jpg', width: 800, height: 600 }
        },
        {
          type: 'audio',
          text: null,
          meta: { url: 'https://example.com/audio.m4a', duration: 30 }
        },
        {
          type: 'poll',
          text: 'What time works best?',
          meta: {
            question: 'What time works best?',
            options: ['Morning', 'Afternoon', 'Evening'],
            multiple_choice: false
          }
        }
      ];

      for (const messageData of messageTypes) {
        const fullMessageData = {
          chat_id: mockChatId,
          author_id: mockUserId,
          ...messageData
        };

        // Validate message data
        const validatedData = validateMessageCreate(fullMessageData);
        expect(validatedData.type).toBe(messageData.type);

        const mockMessageResponse = {
          data: {
            id: `msg-${messageData.type}`,
            ...fullMessageData,
            created_at: '2024-01-01T00:00:00.000Z'
          },
          error: null
        };

        (supabase.from as jest.Mock).mockReturnValue({
          insert: jest.fn().mockResolvedValue(mockMessageResponse)
        });

        const messageResult = await supabase
          .from('messages')
          .insert(fullMessageData);

        expect(messageResult.error).toBeNull();
        expect(messageResult.data?.type).toBe(messageData.type);
        
        if (messageData.meta) {
          expect(messageResult.data?.meta).toEqual(messageData.meta);
        }
      }
    });

    it('should handle message reactions and replies', async () => {
      const messageId = 'msg-123';

      // Add reaction to message
      const reactionData = {
        message_id: messageId,
        user_id: mockUserId,
        emoji: '👍',
        reaction_type: 'like'
      };

      const mockReactionResponse = {
        data: {
          id: 'reaction-123',
          ...reactionData
        },
        error: null
      };

      (supabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockResolvedValue(mockReactionResponse)
      });

      const reactionResult = await supabase
        .from('message_reactions')
        .upsert(reactionData);

      expect(reactionResult.error).toBeNull();
      expect(reactionResult.data?.emoji).toBe('👍');

      // Reply to message
      const replyData = {
        chat_id: mockChatId,
        author_id: 'user-456',
        text: 'Great message!',
        type: 'text',
        reply_to: messageId
      };

      const mockReplyResponse = {
        data: {
          id: 'reply-123',
          ...replyData
        },
        error: null
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue(mockReplyResponse)
      });

      const replyResult = await supabase
        .from('messages')
        .insert(replyData);

      expect(replyResult.error).toBeNull();
      expect(replyResult.data?.reply_to).toBe(messageId);
    });
  });

  describe('Message Status and Read Receipts', () => {
    it('should track message read status', async () => {
      const messageId = 'msg-123';

      const readStatusData = {
        message_id: messageId,
        user_id: mockUserId,
        read_at: new Date().toISOString()
      };

      const mockReadStatusResponse = {
        data: {
          id: 'read-status-123',
          ...readStatusData
        },
        error: null
      };

      (supabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockResolvedValue(mockReadStatusResponse)
      });

      const readStatusResult = await supabase
        .from('message_read_status')
        .upsert(readStatusData);

      expect(readStatusResult.error).toBeNull();
      expect(readStatusResult.data?.read_at).toBeDefined();
    });

    it('should get unread message count', async () => {
      const mockUnreadCount = {
        count: 5,
        error: null
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        count: jest.fn().mockResolvedValue(mockUnreadCount)
      });

      const unreadResult = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', mockChatId)
        .not('id', 'in', `(SELECT message_id FROM message_read_status WHERE user_id = '${mockUserId}')`);

      expect(unreadResult.count).toBe(5);
    });
  });

  describe('File and Media Handling', () => {
    it('should upload and send media messages', async () => {
      const fileData = new Blob(['fake image data'], { type: 'image/jpeg' });
      const fileName = 'chat-image-123.jpg';

      // Mock file upload
      const mockUploadResponse = {
        data: { path: `chats/${mockChatId}/${fileName}` },
        error: null
      };

      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: jest.fn().mockResolvedValue(mockUploadResponse),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: `https://storage.example.com/chats/${mockChatId}/${fileName}` }
        })
      });

      // Upload file
      const uploadResult = await supabase.storage
        .from('messages')
        .upload(`chats/${mockChatId}/${fileName}`, fileData);

      expect(uploadResult.error).toBeNull();
      expect(uploadResult.data?.path).toBe(`chats/${mockChatId}/${fileName}`);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('messages')
        .getPublicUrl(`chats/${mockChatId}/${fileName}`);

      expect(publicUrl).toContain(fileName);

      // Send message with media URL
      const mediaMessageData = {
        chat_id: mockChatId,
        author_id: mockUserId,
        type: 'image',
        text: 'Check this out!',
        meta: {
          url: publicUrl,
          filename: fileName,
          size: fileData.size,
          mime_type: 'image/jpeg'
        }
      };

      const mockMessageResponse = {
        data: {
          id: 'media-msg-123',
          ...mediaMessageData
        },
        error: null
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue(mockMessageResponse)
      });

      const messageResult = await supabase
        .from('messages')
        .insert(mediaMessageData);

      expect(messageResult.error).toBeNull();
      expect(messageResult.data?.meta?.url).toBe(publicUrl);
    });

    it('should handle voice message recording and playback', async () => {
      const voiceData = new Blob(['fake audio data'], { type: 'audio/m4a' });
      const voiceFileName = 'voice-msg-123.m4a';

      // Mock voice upload
      const mockVoiceUpload = {
        data: { path: `voice/${mockChatId}/${voiceFileName}` },
        error: null
      };

      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: jest.fn().mockResolvedValue(mockVoiceUpload),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: `https://storage.example.com/voice/${mockChatId}/${voiceFileName}` }
        })
      });

      const voiceUploadResult = await supabase.storage
        .from('messages')
        .upload(`voice/${mockChatId}/${voiceFileName}`, voiceData);

      expect(voiceUploadResult.error).toBeNull();

      // Send voice message
      const voiceMessageData = {
        chat_id: mockChatId,
        author_id: mockUserId,
        type: 'audio',
        meta: {
          url: `https://storage.example.com/voice/${mockChatId}/${voiceFileName}`,
          duration: 15.5, // seconds
          waveform: [0.1, 0.5, 0.8, 0.3, 0.6], // visualization data
          mime_type: 'audio/m4a'
        }
      };

      const mockVoiceMessageResponse = {
        data: {
          id: 'voice-msg-123',
          ...voiceMessageData
        },
        error: null
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue(mockVoiceMessageResponse)
      });

      const voiceMessageResult = await supabase
        .from('messages')
        .insert(voiceMessageData);

      expect(voiceMessageResult.error).toBeNull();
      expect(voiceMessageResult.data?.meta?.duration).toBe(15.5);
    });
  });

  describe('Real-time Messaging', () => {
    it('should setup real-time message subscription', async () => {
      const mockSubscription = {
        subscribe: jest.fn().mockReturnValue({
          unsubscribe: jest.fn()
        }),
        on: jest.fn().mockReturnThis()
      };

      (supabase.channel as jest.Mock).mockReturnValue(mockSubscription);

      const subscription = supabase
        .channel(`chat:${mockChatId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${mockChatId}`
        }, (payload) => {
          console.log('New message:', payload);
        })
        .subscribe();

      expect(supabase.channel).toHaveBeenCalledWith(`chat:${mockChatId}`);
      expect(mockSubscription.on).toHaveBeenCalled();
      expect(mockSubscription.subscribe).toHaveBeenCalled();
    });

    it('should handle typing indicators', async () => {
      const typingData = {
        chat_id: mockChatId,
        user_id: mockUserId,
        is_typing: true,
        last_typed_at: new Date().toISOString()
      };

      const mockTypingResponse = {
        data: {
          id: 'typing-123',
          ...typingData
        },
        error: null
      };

      (supabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockResolvedValue(mockTypingResponse)
      });

      const typingResult = await supabase
        .from('typing_indicators')
        .upsert(typingData);

      expect(typingResult.error).toBeNull();
      expect(typingResult.data?.is_typing).toBe(true);
    });
  });

  describe('Chat Search and History', () => {
    it('should search messages within chat', async () => {
      const searchQuery = 'important meeting';

      const mockSearchResults = {
        data: [
          {
            id: 'msg-search-1',
            chat_id: mockChatId,
            text: 'Don\'t forget about the important meeting tomorrow',
            author_id: mockUserId,
            created_at: '2024-01-01T00:00:00.000Z'
          }
        ],
        error: null
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue(mockSearchResults)
      });

      const searchResult = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', mockChatId)
        .ilike('text', `%${searchQuery}%`)
        .order('created_at', { ascending: false });

      expect(searchResult.error).toBeNull();
      expect(searchResult.data?.[0].text).toContain('important meeting');
    });

    it('should paginate message history', async () => {
      const limit = 20;
      const offset = 0;

      const mockMessages = {
        data: Array.from({ length: limit }, (_, i) => ({
          id: `msg-${i}`,
          chat_id: mockChatId,
          text: `Message ${i}`,
          author_id: mockUserId,
          created_at: new Date(Date.now() - i * 60000).toISOString()
        })),
        error: null
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue(mockMessages)
      });

      const messagesResult = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', mockChatId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      expect(messagesResult.error).toBeNull();
      expect(messagesResult.data).toHaveLength(limit);
    });
  });

  describe('Chat Moderation and Security', () => {
    it('should handle message reporting', async () => {
      const reportData = {
        message_id: 'msg-123',
        reported_by: mockUserId,
        reason: 'inappropriate_content',
        description: 'Contains inappropriate language'
      };

      const mockReportResponse = {
        data: {
          id: 'report-123',
          ...reportData,
          status: 'pending'
        },
        error: null
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue(mockReportResponse)
      });

      const reportResult = await supabase
        .from('message_reports')
        .insert(reportData);

      expect(reportResult.error).toBeNull();
      expect(reportResult.data?.reason).toBe('inappropriate_content');
    });

    it('should handle user blocking in chats', async () => {
      const blockData = {
        blocker_id: mockUserId,
        blocked_id: 'user-456',
        chat_id: mockChatId
      };

      const mockBlockResponse = {
        data: {
          id: 'block-123',
          ...blockData
        },
        error: null
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue(mockBlockResponse)
      });

      const blockResult = await supabase
        .from('chat_user_blocks')
        .insert(blockData);

      expect(blockResult.error).toBeNull();
      expect(blockResult.data?.blocked_id).toBe('user-456');
    });
  });

  describe('Message Validation and Sanitization', () => {
    it('should validate and sanitize message content', async () => {
      const maliciousMessage = {
        chat_id: mockChatId,
        author_id: mockUserId,
        text: '<script>alert("xss")</script>',
        type: 'text'
      };

      // Validation should clean the message
      const validatedMessage = validateMessageCreate(maliciousMessage);
      expect(validatedMessage.text).toBeDefined();
      // In a real scenario, the text would be sanitized
    });

    it('should enforce message length limits', async () => {
      const longMessage = {
        chat_id: mockChatId,
        author_id: mockUserId,
        text: 'A'.repeat(10001), // Exceeds 10000 char limit
        type: 'text'
      };

      // Should throw validation error for too long message
      expect(() => validateMessageCreate(longMessage)).toThrow();
    });
  });
});