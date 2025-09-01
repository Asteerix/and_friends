import { EventService, CreateEventData } from '../eventService';
import { supabase } from '@/shared/lib/supabase/client';

// Mock dependencies
jest.mock('@/shared/lib/supabase/client');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('EventService', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockEventData: CreateEventData = {
    title: 'Test Event',
    subtitle: 'A test event',
    description: 'This is a test event description',
    date: new Date('2024-01-15T19:00:00Z'),
    location: 'Test Location',
    locationDetails: {
      coordinates: { latitude: 48.8566, longitude: 2.3522 },
      address: 'Test Address, Paris, France',
      city: 'Paris',
      country: 'France',
    },
    isPrivate: false,
    coverData: {
      selectedBackground: '#FF6B6B',
      selectedTitleFont: 'Helvetica',
      coverImage: 'https://example.com/cover.jpg',
      placedStickers: [],
    },
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
      single: jest.fn().mockResolvedValue({
        data: { id: 'event-123', ...mockEventData },
        error: null,
      }),
    } as any);

    // Mock storage
    mockSupabase.storage.from.mockReturnValue({
      upload: jest.fn().mockResolvedValue({
        data: { path: 'event-covers/user-123/12345.jpg' },
        error: null,
      }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: 'https://storage.supabase.co/event-covers/user-123/12345.jpg' },
      }),
    } as any);
  });

  describe('createEvent', () => {
    it('should successfully create a basic event', async () => {
      const mockEvent = { id: 'event-123', title: 'Test Event' };
      
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'events') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockEvent, error: null }),
          };
        }
        if (table === 'event_participants') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        if (table === 'chats') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ 
              data: { id: 'chat-123', name: 'Test Event' }, 
              error: null 
            }),
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
        return {
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const result = await EventService.createEvent(mockEventData);

      expect(result.success).toBe(true);
      expect(result.event).toEqual(mockEvent);
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    });

    it('should fail when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      await expect(EventService.createEvent(mockEventData)).rejects.toThrow('Utilisateur non authentifié');
    });

    it('should handle event creation with uploaded cover image', async () => {
      const eventDataWithUpload = {
        ...mockEventData,
        coverData: {
          ...mockEventData.coverData,
          uploadedImage: 'file:///local/image.jpg',
        },
      };

      // Mock fetch for image upload
      global.fetch = jest.fn().mockResolvedValue({
        blob: jest.fn().mockResolvedValue(new Blob(['fake-image-data'])),
      } as any);

      const mockEvent = { id: 'event-123', title: 'Test Event' };
      
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'events') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockEvent, error: null }),
          };
        }
        return {
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const result = await EventService.createEvent(eventDataWithUpload);

      expect(result.success).toBe(true);
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('event-images');
    });

    it('should handle event creation with co-hosts', async () => {
      const eventDataWithCoHosts = {
        ...mockEventData,
        coHosts: [
          { id: 'user-456', name: 'Co-Host 1', avatar: 'https://example.com/avatar1.jpg' },
          { id: 'user-789', name: 'Co-Host 2', avatar: 'https://example.com/avatar2.jpg' },
        ],
      };

      const mockEvent = { id: 'event-123', title: 'Test Event' };
      
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'events') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockEvent, error: null }),
          };
        }
        if (table === 'event_participants') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const result = await EventService.createEvent(eventDataWithCoHosts);

      expect(result.success).toBe(true);
      // Should be called multiple times for creator + co-hosts
      expect(mockSupabase.from).toHaveBeenCalledWith('event_participants');
    });

    it('should handle event creation with costs', async () => {
      const eventDataWithCosts = {
        ...mockEventData,
        costs: [
          { amount: '10.00', currency: 'EUR', description: 'Entrance fee' },
          { amount: '5.00', currency: 'EUR', description: 'Drink' },
        ],
      };

      const mockEvent = { id: 'event-123', title: 'Test Event' };
      
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'events') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockEvent, error: null }),
          };
        }
        return {
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const result = await EventService.createEvent(eventDataWithCosts);

      expect(result.success).toBe(true);
    });

    it('should handle database insertion error', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'events') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Database connection failed', code: '08006' } 
            }),
          };
        }
        return {
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      await expect(EventService.createEvent(mockEventData)).rejects.toThrow();
    });

    it('should continue even if participant addition fails', async () => {
      const mockEvent = { id: 'event-123', title: 'Test Event' };
      
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'events') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockEvent, error: null }),
          };
        }
        if (table === 'event_participants') {
          return {
            insert: jest.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Constraint violation' } 
            }),
          };
        }
        return {
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const result = await EventService.createEvent(mockEventData);

      expect(result.success).toBe(true);
      expect(result.event).toEqual(mockEvent);
    });
  });

  describe('updateEvent', () => {
    const eventId = 'event-123';
    const updates = {
      title: 'Updated Event Title',
      description: 'Updated description',
    };

    it('should successfully update event', async () => {
      const mockUpdatedEvent = { id: eventId, ...updates };
      
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUpdatedEvent, error: null }),
      } as any);

      const result = await EventService.updateEvent(eventId, updates);

      expect(result.success).toBe(true);
      expect(result.event).toEqual(mockUpdatedEvent);
    });

    it('should handle update error', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Event not found' } 
        }),
      } as any);

      await expect(EventService.updateEvent(eventId, updates)).rejects.toThrow();
    });
  });

  describe('deleteEvent', () => {
    const eventId = 'event-123';

    it('should successfully delete event', async () => {
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      const result = await EventService.deleteEvent(eventId);

      expect(result.success).toBe(true);
    });

    it('should handle deletion error', async () => {
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Deletion failed' } 
        }),
      } as any);

      await expect(EventService.deleteEvent(eventId)).rejects.toThrow();
    });
  });

  describe('cancelEvent', () => {
    const eventId = 'event-123';

    it('should successfully cancel event and update chat', async () => {
      const mockEvent = {
        id: eventId,
        title: 'Test Event',
        chats: [{ id: 'chat-123', name: 'Test Event' }],
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'events') {
          if (mockSupabase.from(table).select) {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: mockEvent, error: null }),
            };
          } else {
            return {
              update: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
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
        return {
          select: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const result = await EventService.cancelEvent(eventId);

      expect(result.success).toBe(true);
    });

    it('should handle event not found error', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Event not found' } 
        }),
      } as any);

      await expect(EventService.cancelEvent(eventId)).rejects.toThrow();
    });
  });

  describe('uploadCoverImage', () => {
    const mockImageUri = 'file:///path/to/image.jpg';
    const mockUserId = 'user-123';

    it('should successfully upload cover image', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        blob: jest.fn().mockResolvedValue(new Blob(['fake-image-data'])),
      } as any);

      const result = await EventService.uploadCoverImage(mockImageUri, mockUserId);

      expect(result).toBe('https://storage.supabase.co/event-covers/user-123/12345.jpg');
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('event-images');
    });

    it('should handle upload error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        blob: jest.fn().mockResolvedValue(new Blob(['fake-image-data'])),
      } as any);

      mockSupabase.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Storage error' },
        }),
        getPublicUrl: jest.fn(),
      } as any);

      const result = await EventService.uploadCoverImage(mockImageUri, mockUserId);

      // Should return original URI as fallback
      expect(result).toBe(mockImageUri);
    });

    it('should handle fetch error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await EventService.uploadCoverImage(mockImageUri, mockUserId);

      expect(result).toBe(mockImageUri);
    });
  });

  describe('event chat management', () => {
    const eventId = 'event-123';
    const userId = 'user-456';

    describe('addParticipantToEventChat', () => {
      it('should add participant to event chat', async () => {
        const mockChat = { id: 'chat-123', name: 'Test Event' };
        
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'chats') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({ data: [mockChat], error: null }),
            };
          }
          if (table === 'chat_participants') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
              insert: jest.fn().mockResolvedValue({ data: null, error: null }),
            };
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

        await EventService.addParticipantToEventChat(eventId, userId);

        expect(mockSupabase.from).toHaveBeenCalledWith('chats');
        expect(mockSupabase.from).toHaveBeenCalledWith('chat_participants');
      });

      it('should handle case when chat does not exist', async () => {
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'chats') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
            };
          }
          return {};
        });

        // Should not throw error
        await expect(EventService.addParticipantToEventChat(eventId, userId)).resolves.toBeUndefined();
      });
    });

    describe('removeParticipantFromEventChat', () => {
      it('should remove participant from event chat', async () => {
        const mockChat = { id: 'chat-123', name: 'Test Event' };
        
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'chats') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({ data: [mockChat], error: null }),
            };
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
          if (table === 'chat_participants') {
            return {
              delete: jest.fn().mockReturnThis(),
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

        await EventService.removeParticipantFromEventChat(eventId, userId);

        expect(mockSupabase.from).toHaveBeenCalledWith('chat_participants');
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle invalid event data', async () => {
      const invalidEventData = {
        ...mockEventData,
        title: '', // Empty title
        date: new Date('invalid-date'), // Invalid date
      };

      // The service should still attempt to create the event
      // Database constraints should handle validation
      const mockEvent = { id: 'event-123' };
      
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'events') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockEvent, error: null }),
          };
        }
        return {
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const result = await EventService.createEvent(invalidEventData as any);
      expect(result.success).toBe(true);
    });

    it('should handle missing required parameters', async () => {
      await expect(EventService.addParticipantToEventChat('', '')).rejects.toThrow('Paramètres invalides');
    });

    it('should handle network timeout errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        return {
          insert: jest.fn().mockRejectedValue(new Error('Network timeout')),
          select: jest.fn().mockReturnThis(),
          single: jest.fn(),
        };
      });

      await expect(EventService.createEvent(mockEventData)).rejects.toThrow('Network timeout');
    });
  });

  describe('RSVP and extras management', () => {
    const eventId = 'event-123';

    it('should add RSVP settings', async () => {
      const deadline = new Date('2024-01-10T23:59:59Z');
      
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      await EventService.addRSVPSettings(eventId, deadline, true, '24h');

      expect(mockSupabase.from).toHaveBeenCalledWith('event_rsvp_settings');
    });

    it('should add event costs', async () => {
      const costs = [
        { amount: '10.00', currency: 'EUR', description: 'Entrance' },
      ];
      
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      await EventService.addEventCosts(eventId, costs);

      expect(mockSupabase.from).toHaveBeenCalledWith('event_costs');
    });

    it('should handle missing table errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { code: '42P01', message: 'Table does not exist' } 
        }),
      } as any);

      await expect(EventService.addRSVPSettings(eventId, new Date(), true, '24h')).rejects.toThrow();
    });
  });
});