import { eventService } from '../services/eventService';

// Mock Supabase responses
const mockSupabaseResponse = {
  data: [
    {
      id: 'test-event-1',
      title: 'Test Event',
      description: 'A test event',
      date: '2024-01-01',
      location: 'Test Location',
      created_by: 'user-1',
      tags: ['test'],
      is_private: false,
    },
  ],
  error: null,
};

// Test suite for event service
describe('eventService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllEvents', () => {
    it('should fetch all events successfully', async () => {
      // Mock the Supabase client response
      const mockSelect = jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockSupabaseResponse),
        }),
      });

      jest.doMock('@/shared/lib/supabase/client', () => ({
        supabase: {
          from: jest.fn(() => ({ select: mockSelect })),
        },
      }));

      const result = await eventService.getAllEvents();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      });

      jest.doMock('@/shared/lib/supabase/client', () => ({
        supabase: {
          from: jest.fn(() => ({ select: mockSelect })),
        },
      }));

      await expect(eventService.getAllEvents()).rejects.toThrow();
    });
  });

  describe('createEvent', () => {
    const mockEventData = {
      title: 'New Event',
      description: 'Test description',
      date: '2024-12-31',
      location: 'Test Location',
      tags: ['test'],
      is_private: false,
    };

    it('should create event successfully', async () => {
      const result = await eventService.createEvent(mockEventData);
      expect(result).toBeDefined();
    });

    it('should validate required fields', async () => {
      const invalidData = { ...mockEventData, title: '' };
      await expect(eventService.createEvent(invalidData as any)).rejects.toThrow();
    });
  });

  describe('getUserEvents', () => {
    it('should fetch user events successfully', async () => {
      const result = await eventService.getUserEvents('user-1');
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle invalid user ID', async () => {
      await expect(eventService.getUserEvents('')).rejects.toThrow();
    });
  });
});
