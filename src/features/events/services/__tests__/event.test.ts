import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { supabase } from '@/shared/lib/supabase/client';
import { eventService } from '../eventService';

// Mock Supabase
jest.mock('@/shared/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
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
    rpc: jest.fn(),
  },
}));

describe('Event Management System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Event Creation', () => {
    it('should create a new event', async () => {
      const mockEvent = {
        id: 'event-1',
        title: 'Summer Party',
        description: 'Annual summer celebration',
        start_date: '2024-07-01T18:00:00Z',
        end_date: '2024-07-01T23:00:00Z',
        location: 'Paris, France',
        host_id: 'user-1',
        category: 'party',
        max_attendees: 50,
        created_at: new Date().toISOString(),
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          data: mockEvent,
          error: null,
        }),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockEvent,
          error: null,
        }),
      });

      const result = await eventService.createEvent({
        title: 'Summer Party',
        description: 'Annual summer celebration',
        startDate: '2024-07-01T18:00:00Z',
        endDate: '2024-07-01T23:00:00Z',
        location: 'Paris, France',
        category: 'party',
        maxAttendees: 50,
      });

      expect(result.title).toBe('Summer Party');
      expect(result.category).toBe('party');
      expect(result.max_attendees).toBe(50);
    });

    it('should validate event dates', () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 86400000); // Yesterday
      const futureDate = new Date(now.getTime() + 86400000); // Tomorrow
      const laterDate = new Date(now.getTime() + 172800000); // Day after tomorrow

      // Start date must be in the future
      expect(eventService.validateEventDates(pastDate, futureDate)).toBe(false);
      
      // End date must be after start date
      expect(eventService.validateEventDates(laterDate, futureDate)).toBe(false);
      
      // Valid dates
      expect(eventService.validateEventDates(futureDate, laterDate)).toBe(true);
    });

    it('should handle event cover image upload', async () => {
      const mockUpload = jest.fn().mockResolvedValue({
        data: { path: 'event-covers/event-1.jpg' },
        error: null,
      });

      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.example.com/event-1.jpg' },
        }),
      });

      const file = new Blob(['image'], { type: 'image/jpeg' });
      const result = await eventService.uploadEventCover('event-1', file);

      expect(result.url).toBe('https://storage.example.com/event-1.jpg');
    });

    it('should create recurring events', async () => {
      const baseEvent = {
        title: 'Weekly Meetup',
        description: 'Regular team meeting',
        location: 'Office',
        recurrence: {
          frequency: 'weekly',
          interval: 1,
          endDate: '2024-12-31',
        },
      };

      const mockEvents = Array.from({ length: 4 }, (_, i) => ({
        id: `event-${i + 1}`,
        ...baseEvent,
        start_date: new Date(2024, 6, 1 + i * 7, 10, 0).toISOString(),
      }));

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          data: mockEvents,
          error: null,
        }),
      });

      const result = await eventService.createRecurringEvent(baseEvent);
      
      expect(result).toHaveLength(4);
      expect(result[0].title).toBe('Weekly Meetup');
    });
  });

  describe('Event Discovery', () => {
    it('should fetch upcoming events', async () => {
      const mockEvents = [
        { id: 'event-1', title: 'Event 1', start_date: '2024-07-01T10:00:00Z' },
        { id: 'event-2', title: 'Event 2', start_date: '2024-07-02T10:00:00Z' },
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
      
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('event-1');
    });

    it('should filter events by category', async () => {
      const mockEvents = [
        { id: 'event-1', title: 'Party 1', category: 'party' },
        { id: 'event-2', title: 'Party 2', category: 'party' },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockEvents,
          error: null,
        }),
      });

      const result = await eventService.getEventsByCategory('party');
      
      expect(result).toHaveLength(2);
      expect(result.every(e => e.category === 'party')).toBe(true);
    });

    it('should search events by location', async () => {
      const mockEvents = [
        { id: 'event-1', title: 'Paris Event', location: 'Paris, France' },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockEvents,
          error: null,
        }),
      });

      const result = await eventService.searchEventsByLocation('Paris');
      
      expect(result).toHaveLength(1);
      expect(result[0].location).toContain('Paris');
    });

    it('should get events for a specific date range', async () => {
      const mockEvents = [
        { id: 'event-1', start_date: '2024-07-15T10:00:00Z' },
        { id: 'event-2', start_date: '2024-07-20T10:00:00Z' },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockEvents,
          error: null,
        }),
      });

      const result = await eventService.getEventsInDateRange(
        '2024-07-01',
        '2024-07-31'
      );
      
      expect(result).toHaveLength(2);
    });
  });

  describe('RSVP Management', () => {
    it('should handle event RSVP', async () => {
      const mockRSVP = {
        id: 'rsvp-1',
        event_id: 'event-1',
        user_id: 'user-1',
        status: 'attending',
        created_at: new Date().toISOString(),
      };

      (supabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockResolvedValue({
          data: mockRSVP,
          error: null,
        }),
      });

      const result = await eventService.rsvpToEvent('event-1', 'user-1', 'attending');
      
      expect(result.status).toBe('attending');
      expect(result.event_id).toBe('event-1');
    });

    it('should check event capacity before RSVP', async () => {
      // Mock event with limited capacity
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'event-1', max_attendees: 2 },
          error: null,
        }),
      });

      // Mock current attendees count
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        count: jest.fn().mockResolvedValue({
          data: 2,
          error: null,
        }),
      });

      const canRSVP = await eventService.checkEventCapacity('event-1');
      
      expect(canRSVP).toBe(false);
    });

    it('should get event attendees', async () => {
      const mockAttendees = [
        { user_id: 'user-1', status: 'attending', user: { full_name: 'John' } },
        { user_id: 'user-2', status: 'attending', user: { full_name: 'Jane' } },
        { user_id: 'user-3', status: 'maybe', user: { full_name: 'Bob' } },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockAttendees,
          error: null,
        }),
      });

      const result = await eventService.getEventAttendees('event-1');
      
      expect(result).toHaveLength(3);
      expect(result.filter(a => a.status === 'attending')).toHaveLength(2);
    });

    it('should update RSVP status', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({
        data: { status: 'not_attending' },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        eq: jest.fn().mockReturnThis(),
      });

      await eventService.updateRSVP('event-1', 'user-1', 'not_attending');
      
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'not_attending' });
    });
  });

  describe('Event Updates and Notifications', () => {
    it('should update event details', async () => {
      const updates = {
        title: 'Updated Party',
        description: 'New description',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockResolvedValue({
          data: { ...updates, id: 'event-1' },
          error: null,
        }),
        eq: jest.fn().mockReturnThis(),
      });

      const result = await eventService.updateEvent('event-1', updates);
      
      expect(result.title).toBe('Updated Party');
    });

    it('should cancel an event', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockResolvedValue({
          data: { status: 'cancelled', cancelled_at: new Date().toISOString() },
          error: null,
        }),
        eq: jest.fn().mockReturnThis(),
      });

      const result = await eventService.cancelEvent('event-1', 'Weather conditions');
      
      expect(result.status).toBe('cancelled');
    });

    it('should notify attendees of event changes', async () => {
      const mockAttendees = [
        { user_id: 'user-1' },
        { user_id: 'user-2' },
      ];

      // Get attendees
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        resolvedValue: jest.fn().mockResolvedValue({
          data: mockAttendees,
          error: null,
        }),
      });

      // Create notifications
      (supabase.from as jest.Mock).mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          data: mockAttendees.map(a => ({
            user_id: a.user_id,
            type: 'event_update',
            event_id: 'event-1',
          })),
          error: null,
        }),
      });

      await eventService.notifyEventUpdate('event-1', 'Event location changed');
      
      expect(supabase.from).toHaveBeenCalledWith('event_attendees');
      expect(supabase.from).toHaveBeenCalledWith('notifications');
    });
  });

  describe('Event Permissions', () => {
    it('should check if user is event host', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { host_id: 'user-1', co_hosts: ['user-2'] },
          error: null,
        }),
      });

      const isHost = await eventService.isEventHost('event-1', 'user-1');
      const isCoHost = await eventService.isEventHost('event-1', 'user-2');
      const isNotHost = await eventService.isEventHost('event-1', 'user-3');
      
      expect(isHost).toBe(true);
      expect(isCoHost).toBe(true);
      expect(isNotHost).toBe(false);
    });

    it('should validate event access permissions', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            visibility: 'private',
            invited_users: ['user-1', 'user-2'],
          },
          error: null,
        }),
      });

      const hasAccess = await eventService.hasEventAccess('event-1', 'user-1');
      const noAccess = await eventService.hasEventAccess('event-1', 'user-3');
      
      expect(hasAccess).toBe(true);
      expect(noAccess).toBe(false);
    });
  });

  describe('Event Statistics', () => {
    it('should calculate event statistics', async () => {
      const mockStats = {
        total_attendees: 25,
        attending: 20,
        maybe: 3,
        not_attending: 2,
      };

      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: mockStats,
        error: null,
      });

      const result = await eventService.getEventStatistics('event-1');
      
      expect(result.total_attendees).toBe(25);
      expect(result.attending).toBe(20);
    });

    it('should get user event history', async () => {
      const mockHistory = [
        { event_id: 'event-1', attended_at: '2024-06-01T10:00:00Z' },
        { event_id: 'event-2', attended_at: '2024-05-01T10:00:00Z' },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockHistory,
          error: null,
        }),
      });

      const result = await eventService.getUserEventHistory('user-1');
      
      expect(result).toHaveLength(2);
    });
  });

  describe('Event Recommendations', () => {
    it('should recommend events based on user preferences', async () => {
      const mockRecommendations = [
        { id: 'event-1', title: 'Music Festival', score: 0.9 },
        { id: 'event-2', title: 'Art Exhibition', score: 0.8 },
      ];

      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: mockRecommendations,
        error: null,
      });

      const result = await eventService.getRecommendedEvents('user-1');
      
      expect(result).toHaveLength(2);
      expect(result[0].score).toBeGreaterThan(result[1].score);
    });
  });
});