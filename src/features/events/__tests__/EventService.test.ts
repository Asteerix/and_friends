import { eventService } from '../services/eventService';
import { supabase } from '@/shared/lib/supabase/client';
import { Event, EventCreationData, EventUpdateData } from '@/entities/event/types';

jest.mock('@/shared/lib/supabase/client');

describe('EventService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEvent', () => {
    it('should create a new event successfully', async () => {
      const mockEvent: EventCreationData = {
        title: 'Test Event',
        description: 'Test Description',
        start_date: '2025-01-15T18:00:00Z',
        end_date: '2025-01-15T23:00:00Z',
        location: 'Paris, France',
        latitude: 48.8566,
        longitude: 2.3522,
        max_participants: 50,
        is_private: false,
        category: 'party',
        cover_image: 'https://example.com/cover.jpg',
      };

      const mockResponse = {
        id: 'event-123',
        ...mockEvent,
        created_by: 'user-123',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockResponse,
          error: null,
        }),
      });

      const result = await eventService.createEvent(mockEvent);

      expect(result.data).toEqual(mockResponse);
      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('events');
    });

    it('should handle event creation errors', async () => {
      const mockEvent: EventCreationData = {
        title: 'Test Event',
        description: 'Test Description',
        start_date: '2025-01-15T18:00:00Z',
        end_date: '2025-01-15T23:00:00Z',
        location: 'Paris, France',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      });

      const result = await eventService.createEvent(mockEvent);

      expect(result.data).toBeNull();
      expect(result.error).toEqual({ message: 'Database error' });
    });

    it('should validate required fields', async () => {
      const invalidEvent = {
        description: 'Missing title',
      } as EventCreationData;

      const result = await eventService.createEvent(invalidEvent);

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('required');
    });
  });

  describe('getEvents', () => {
    it('should fetch upcoming events', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          title: 'Event 1',
          start_date: '2025-01-20T18:00:00Z',
        },
        {
          id: 'event-2',
          title: 'Event 2',
          start_date: '2025-01-25T18:00:00Z',
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: mockEvents,
          error: null,
        }),
      });

      const result = await eventService.getUpcomingEvents();

      expect(result.data).toEqual(mockEvents);
      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('events');
    });

    it('should fetch events by location', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          title: 'Paris Event',
          latitude: 48.8566,
          longitude: 2.3522,
        },
      ];

      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: mockEvents,
        error: null,
      });

      const result = await eventService.getEventsByLocation(48.8566, 2.3522, 10);

      expect(result.data).toEqual(mockEvents);
      expect(result.error).toBeNull();
      expect(supabase.rpc).toHaveBeenCalledWith('get_events_by_distance', {
        lat: 48.8566,
        lng: 2.3522,
        max_distance: 10,
      });
    });

    it('should fetch user events', async () => {
      const userId = 'user-123';
      const mockEvents = [
        {
          id: 'event-1',
          title: 'My Event',
          created_by: userId,
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockEvents,
          error: null,
        }),
      });

      const result = await eventService.getUserEvents(userId);

      expect(result.data).toEqual(mockEvents);
      expect(result.error).toBeNull();
    });
  });

  describe('updateEvent', () => {
    it('should update event successfully', async () => {
      const eventId = 'event-123';
      const updates: EventUpdateData = {
        title: 'Updated Title',
        description: 'Updated Description',
      };

      const mockUpdatedEvent = {
        id: eventId,
        ...updates,
      };

      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUpdatedEvent,
          error: null,
        }),
      });

      const result = await eventService.updateEvent(eventId, updates);

      expect(result.data).toEqual(mockUpdatedEvent);
      expect(result.error).toBeNull();
    });

    it('should handle update errors', async () => {
      const eventId = 'event-123';
      const updates: EventUpdateData = {
        title: 'Updated Title',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Event not found' },
        }),
      });

      const result = await eventService.updateEvent(eventId, updates);

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Event not found');
    });
  });

  describe('deleteEvent', () => {
    it('should delete event successfully', async () => {
      const eventId = 'event-123';

      (supabase.from as jest.Mock).mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      const result = await eventService.deleteEvent(eventId);

      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('events');
    });

    it('should handle deletion errors', async () => {
      const eventId = 'event-123';

      (supabase.from as jest.Mock).mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Permission denied' },
        }),
      });

      const result = await eventService.deleteEvent(eventId);

      expect(result.error?.message).toBe('Permission denied');
    });
  });

  describe('RSVP Management', () => {
    it('should add participant to event', async () => {
      const eventId = 'event-123';
      const userId = 'user-456';

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          data: { event_id: eventId, user_id: userId, status: 'attending' },
          error: null,
        }),
      });

      const result = await eventService.addParticipant(eventId, userId);

      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('event_participants');
    });

    it('should update participant status', async () => {
      const eventId = 'event-123';
      const userId = 'user-456';
      const status = 'maybe';

      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: { event_id: eventId, user_id: userId, status },
          error: null,
        }),
      });

      const result = await eventService.updateParticipantStatus(eventId, userId, status);

      expect(result.error).toBeNull();
    });

    it('should get event participants', async () => {
      const eventId = 'event-123';
      const mockParticipants = [
        { user_id: 'user-1', status: 'attending', user: { name: 'Alice' } },
        { user_id: 'user-2', status: 'maybe', user: { name: 'Bob' } },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: mockParticipants,
          error: null,
        }),
      });

      const result = await eventService.getEventParticipants(eventId);

      expect(result.data).toEqual(mockParticipants);
      expect(result.error).toBeNull();
    });

    it('should check if event is at capacity', async () => {
      const eventId = 'event-123';

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { max_participants: 10 },
          error: null,
        }),
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        count: jest.fn().mockResolvedValue({
          data: 10,
          error: null,
        }),
      });

      const result = await eventService.isEventAtCapacity(eventId);

      expect(result).toBe(true);
    });
  });
});