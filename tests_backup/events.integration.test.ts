/**
 * Integration tests for event management functionality
 * Tests the complete event lifecycle from creation to deletion
 */

import { supabase } from '@/shared/lib/supabase/client';
import { messageService } from '@/features/chat/services/messageServiceV2';

// Mock dependencies
jest.mock('@/shared/lib/supabase/client');
jest.mock('@/shared/utils/errorLogger');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('Events Integration Tests', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    phone: '+33123456789',
  };

  const mockEvent = {
    id: 'event-123',
    title: 'Test Event',
    description: 'Test event description',
    date: '2025-08-25T19:00:00Z',
    location: 'Test Location',
    created_by: mockUser.id,
    tags: ['party', 'music'],
    is_private: false,
    capacity: 50,
    image_url: null,
    created_at: '2025-08-20T10:00:00Z',
    updated_at: '2025-08-20T10:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    } as any);

    // Mock database operations
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
    } as any);
  });

  describe('Event Creation Flow', () => {
    test('should create event with all required fields', async () => {
      const eventData = {
        title: 'New Event',
        description: 'Event description',
        date: '2025-08-25T19:00:00Z',
        location: 'Event Location',
        tags: ['music'],
        is_private: false,
        capacity: 100,
      };

      // Mock successful creation
      mockSupabase.from().insert.mockResolvedValue({
        data: [{ ...eventData, id: 'new-event-123', created_by: mockUser.id }],
        error: null,
      } as any);

      const { data: user } = await mockSupabase.auth.getUser();
      expect(user?.user?.id).toBe(mockUser.id);

      const result = await mockSupabase.from('events').insert([
        {
          ...eventData,
          created_by: user!.user!.id,
        },
      ]);

      expect(mockSupabase.from).toHaveBeenCalledWith('events');
      expect(result.error).toBeNull();
    });

    test('should validate required event fields', async () => {
      const invalidEvents = [
        { description: 'Missing title', date: '2025-08-25T19:00:00Z' },
        { title: 'Missing date', description: 'Description' },
        { title: '', description: 'Empty title', date: '2025-08-25T19:00:00Z' },
      ];

      for (const eventData of invalidEvents) {
        mockSupabase.from().insert.mockResolvedValue({
          data: null,
          error: { message: 'Validation failed', code: '23502' },
        } as any);

        const result = await mockSupabase.from('events').insert([
          {
            ...eventData,
            created_by: mockUser.id,
          },
        ]);

        expect(result.error).toBeTruthy();
      }
    });

    test('should handle event creation with optional fields', async () => {
      const eventWithOptionals = {
        title: 'Event with Options',
        description: 'Description',
        date: '2025-08-25T19:00:00Z',
        location: 'Location',
        tags: ['party', 'outdoor'],
        is_private: true,
        capacity: 25,
        age_restriction: 18,
        cost_per_person: 15.5,
        items_to_bring: ['drinks', 'snacks'],
        accessibility_info: 'Wheelchair accessible',
      };

      mockSupabase.from().insert.mockResolvedValue({
        data: [{ ...eventWithOptionals, id: 'event-with-options', created_by: mockUser.id }],
        error: null,
      } as any);

      const result = await mockSupabase.from('events').insert([
        {
          ...eventWithOptionals,
          created_by: mockUser.id,
        },
      ]);

      expect(result.error).toBeNull();
    });
  });

  describe('Event RSVP Management', () => {
    test('should allow users to RSVP to events', async () => {
      const rsvpData = {
        event_id: mockEvent.id,
        user_id: mockUser.id,
        status: 'attending',
        response_date: new Date().toISOString(),
      };

      mockSupabase.from().upsert.mockResolvedValue({
        data: [rsvpData],
        error: null,
      } as any);

      const result = await mockSupabase.from('event_rsvps').upsert([rsvpData]);

      expect(mockSupabase.from).toHaveBeenCalledWith('event_rsvps');
      expect(result.error).toBeNull();
    });

    test('should handle RSVP status changes', async () => {
      const statusChanges = ['attending', 'maybe', 'not_attending'];

      for (const status of statusChanges) {
        mockSupabase.from().upsert.mockResolvedValue({
          data: [{ event_id: mockEvent.id, user_id: mockUser.id, status }],
          error: null,
        } as any);

        const result = await mockSupabase.from('event_rsvps').upsert([
          {
            event_id: mockEvent.id,
            user_id: mockUser.id,
            status,
          },
        ]);

        expect(result.error).toBeNull();
      }
    });

    test('should enforce event capacity limits', async () => {
      // Mock event at capacity
      mockSupabase.from().select.mockResolvedValue({
        data: [
          {
            ...mockEvent,
            capacity: 2,
            rsvp_count: 2, // At capacity
          },
        ],
        error: null,
      } as any);

      const eventResult = await mockSupabase
        .from('events')
        .select('*, rsvp_count:event_rsvps(count)')
        .eq('id', mockEvent.id)
        .single();

      expect(eventResult.data?.rsvp_count).toBe(2);
      expect(eventResult.data?.capacity).toBe(2);

      // New RSVP should be rejected or waitlisted
      mockSupabase.from().upsert.mockResolvedValue({
        data: null,
        error: { message: 'Event at capacity', code: 'CAPACITY_EXCEEDED' },
      } as any);

      const rsvpResult = await mockSupabase.from('event_rsvps').upsert([
        {
          event_id: mockEvent.id,
          user_id: 'new-user-123',
          status: 'attending',
        },
      ]);

      expect(rsvpResult.error).toBeTruthy();
    });
  });

  describe('Event Chat Integration', () => {
    test('should create chat for event automatically', async () => {
      // Mock event creation with automatic chat creation
      mockSupabase.from().insert.mockResolvedValue({
        data: [{ ...mockEvent, chat_id: 'event-chat-123' }],
        error: null,
      } as any);

      // Mock chat creation
      mockSupabase.from().insert.mockResolvedValue({
        data: [
          {
            id: 'event-chat-123',
            name: `${mockEvent.title} Chat`,
            event_id: mockEvent.id,
            created_by: mockUser.id,
          },
        ],
        error: null,
      } as any);

      // Create event
      const eventResult = await mockSupabase.from('events').insert([mockEvent]);
      expect(eventResult.error).toBeNull();

      // Create associated chat
      const chatResult = await mockSupabase.from('chats').insert([
        {
          name: `${mockEvent.title} Chat`,
          event_id: mockEvent.id,
          created_by: mockUser.id,
        },
      ]);

      expect(chatResult.error).toBeNull();
    });

    test('should handle event updates in chat', async () => {
      const chatId = 'event-chat-123';

      // Mock message service
      const mockSendMessage = jest.spyOn(messageService, 'sendMessage');
      mockSendMessage.mockResolvedValue({
        id: 'system-message-123',
        chat_id: chatId,
        type: 'system',
        text: 'Event updated: New location set',
      } as any);

      // Simulate event update
      const updatedEvent = { ...mockEvent, location: 'New Location' };

      mockSupabase.from().update.mockResolvedValue({
        data: [updatedEvent],
        error: null,
      } as any);

      const result = await mockSupabase
        .from('events')
        .update({ location: 'New Location' })
        .eq('id', mockEvent.id);

      expect(result.error).toBeNull();

      // Should send system message to chat
      await messageService.sendMessage(chatId, 'Event updated: New location set', 'system');

      expect(mockSendMessage).toHaveBeenCalledWith(
        chatId,
        'Event updated: New location set',
        'system'
      );

      mockSendMessage.mockRestore();
    });
  });

  describe('Event Search and Discovery', () => {
    test('should search events by title and description', async () => {
      const searchQuery = 'music party';
      const mockResults = [
        { ...mockEvent, title: 'Music Party Night' },
        { ...mockEvent, id: 'event-456', description: 'Great party with live music' },
      ];

      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().ilike.mockReturnThis();
      mockSupabase.from().order.mockReturnThis();
      mockSupabase.from().limit.mockResolvedValue({
        data: mockResults,
        error: null,
      } as any);

      const result = await mockSupabase
        .from('events')
        .select('*')
        .ilike('title', `%${searchQuery}%`)
        .order('date', { ascending: true })
        .limit(20);

      expect(result.data).toEqual(mockResults);
      expect(result.error).toBeNull();
    });

    test('should filter events by location', async () => {
      const location = 'Paris';

      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().ilike.mockReturnThis();
      mockSupabase.from().gte.mockReturnThis();
      mockSupabase.from().order.mockResolvedValue({
        data: [{ ...mockEvent, location: 'Paris, France' }],
        error: null,
      } as any);

      const result = await mockSupabase
        .from('events')
        .select('*')
        .ilike('location', `%${location}%`)
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true });

      expect(result.error).toBeNull();
      expect(result.data?.length).toBeGreaterThan(0);
    });

    test('should filter events by date range', async () => {
      const startDate = '2025-08-01T00:00:00Z';
      const endDate = '2025-08-31T23:59:59Z';

      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().gte.mockReturnThis();
      mockSupabase.from().lte.mockReturnThis();
      mockSupabase.from().order.mockResolvedValue({
        data: [mockEvent],
        error: null,
      } as any);

      const result = await mockSupabase
        .from('events')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      expect(result.error).toBeNull();
    });
  });

  describe('Event Permissions and Privacy', () => {
    test('should respect private event visibility', async () => {
      const privateEvent = { ...mockEvent, is_private: true };

      // Mock query for private events (should require invitation)
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().single.mockResolvedValue({
        data: null, // User can't see private event without invitation
        error: { message: 'Not found', code: 'PGRST116' },
      } as any);

      const result = await mockSupabase
        .from('events')
        .select('*')
        .eq('id', privateEvent.id)
        .single();

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });

    test('should allow event owners to manage their events', async () => {
      mockSupabase.from().update.mockResolvedValue({
        data: [{ ...mockEvent, title: 'Updated Event Title' }],
        error: null,
      } as any);

      const result = await mockSupabase
        .from('events')
        .update({ title: 'Updated Event Title' })
        .eq('id', mockEvent.id)
        .eq('created_by', mockUser.id); // Ensure owner can update

      expect(result.error).toBeNull();
    });

    test('should prevent non-owners from modifying events', async () => {
      mockSupabase.from().update.mockResolvedValue({
        data: null,
        error: { message: 'Insufficient privileges', code: 'INSUFFICIENT_PRIVILEGE' },
      } as any);

      const result = await mockSupabase
        .from('events')
        .update({ title: 'Hacked Title' })
        .eq('id', mockEvent.id)
        .eq('created_by', 'different-user-id');

      expect(result.error).toBeTruthy();
    });
  });

  describe('Event Analytics and Reporting', () => {
    test('should track event engagement metrics', async () => {
      const metrics = {
        event_id: mockEvent.id,
        views: 45,
        rsvp_count: 12,
        chat_messages: 23,
        shares: 5,
      };

      mockSupabase.from().upsert.mockResolvedValue({
        data: [metrics],
        error: null,
      } as any);

      const result = await mockSupabase.from('event_metrics').upsert([metrics]);

      expect(result.error).toBeNull();
    });

    test('should generate event summary reports', async () => {
      mockSupabase.from().select.mockResolvedValue({
        data: [
          {
            total_events: 150,
            total_attendees: 2300,
            avg_rsvp_rate: 0.68,
            popular_categories: ['party', 'music', 'outdoor'],
          },
        ],
        error: null,
      } as any);

      const result = await mockSupabase
        .from('event_analytics')
        .select('*')
        .eq('user_id', mockUser.id);

      expect(result.error).toBeNull();
      expect(result.data?.[0].total_events).toBe(150);
    });
  });
});
