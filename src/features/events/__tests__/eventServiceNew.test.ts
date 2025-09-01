import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { EventService } from '../services/eventService';
import { supabase } from '@/shared/lib/supabase/client';
import { Event, EventCategory, EventVisibility } from '@/entities/event/types';

jest.mock('@/shared/lib/supabase/client');

describe('EventService', () => {
  let eventService: EventService;
  const mockUserId = 'user123';

  beforeEach(() => {
    jest.clearAllMocks();
    eventService = new EventService();
  });

  describe('Event Creation', () => {
    it('should create an event successfully', async () => {
      const newEvent = {
        title: 'Test Event',
        description: 'Test Description',
        date: new Date().toISOString(),
        location: 'Paris, France',
        category: EventCategory.PARTY,
        visibility: EventVisibility.PUBLIC,
        max_attendees: 50,
        host_id: mockUserId,
      };

      const createdEvent = { ...newEvent, id: 'event123' };

      supabase.from = jest.fn(() => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: createdEvent, error: null })),
          })),
        })),
      }));

      const result = await eventService.createEvent(newEvent);

      expect(result).toEqual(createdEvent);
      expect(supabase.from).toHaveBeenCalledWith('events');
    });

    it('should validate required fields', async () => {
      const invalidEvent = {
        title: '', // Empty title
        date: new Date().toISOString(),
        host_id: mockUserId,
      };

      await expect(eventService.createEvent(invalidEvent)).rejects.toThrow('Title is required');
    });

    it('should handle date validation', async () => {
      const pastEvent = {
        title: 'Past Event',
        date: new Date('2020-01-01').toISOString(),
        host_id: mockUserId,
      };

      await expect(eventService.createEvent(pastEvent)).rejects.toThrow('Event date must be in the future');
    });

    it('should enforce capacity limits', async () => {
      const event = {
        title: 'Test Event',
        date: new Date().toISOString(),
        max_attendees: 1001, // Exceeds max limit
        host_id: mockUserId,
      };

      await expect(eventService.createEvent(event)).rejects.toThrow('Maximum attendees cannot exceed 1000');
    });
  });

  describe('Event Retrieval', () => {
    it('should fetch events with proper filtering', async () => {
      const mockEvents = [
        { id: '1', title: 'Event 1', category: EventCategory.PARTY },
        { id: '2', title: 'Event 2', category: EventCategory.SPORTS },
      ];

      supabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => Promise.resolve({ data: mockEvents, error: null })),
              })),
            })),
          })),
        })),
      }));

      const result = await eventService.getUpcomingEvents({
        category: EventCategory.PARTY,
        limit: 10,
      });

      expect(result).toEqual(mockEvents);
    });

    it('should handle pagination correctly', async () => {
      const page1Events = Array(10).fill(null).map((_, i) => ({
        id: `event${i}`,
        title: `Event ${i}`,
      }));

      supabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          range: jest.fn(() => Promise.resolve({ data: page1Events, error: null })),
        })),
      }));

      const result = await eventService.getEventsPaginated({
        page: 1,
        pageSize: 10,
      });

      expect(result.data).toHaveLength(10);
      expect(result.hasMore).toBeDefined();
    });
  });

  describe('RSVP Management', () => {
    it('should handle RSVP creation', async () => {
      const rsvpData = {
        event_id: 'event123',
        user_id: mockUserId,
        status: 'attending',
      };

      supabase.from = jest.fn(() => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: rsvpData, error: null })),
          })),
        })),
      }));

      const result = await eventService.createRSVP(rsvpData);
      expect(result).toEqual(rsvpData);
    });

    it('should prevent duplicate RSVPs', async () => {
      supabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ 
                data: { id: 'existing-rsvp' }, 
                error: null 
              })),
            })),
          })),
        })),
      }));

      await expect(
        eventService.createRSVP({
          event_id: 'event123',
          user_id: mockUserId,
          status: 'attending',
        })
      ).rejects.toThrow('RSVP already exists');
    });

    it('should enforce event capacity', async () => {
      // Mock event with max capacity reached
      supabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ 
              data: { 
                max_attendees: 2,
                current_attendees: 2,
              }, 
              error: null 
            })),
          })),
        })),
      }));

      await expect(
        eventService.createRSVP({
          event_id: 'event123',
          user_id: 'newuser',
          status: 'attending',
        })
      ).rejects.toThrow('Event is at full capacity');
    });
  });

  describe('Event Updates', () => {
    it('should update event details', async () => {
      const updates = {
        title: 'Updated Title',
        description: 'Updated Description',
      };

      const updatedEvent = { 
        id: 'event123',
        ...updates,
      };

      supabase.from = jest.fn(() => ({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: updatedEvent, error: null })),
            })),
          })),
        })),
      }));

      const result = await eventService.updateEvent('event123', updates);
      expect(result).toEqual(updatedEvent);
    });

    it('should only allow host to update event', async () => {
      supabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ 
              data: { host_id: 'otheruser' }, 
              error: null 
            })),
          })),
        })),
      }));

      await expect(
        eventService.updateEvent('event123', { title: 'New Title' }, mockUserId)
      ).rejects.toThrow('Unauthorized to update this event');
    });

    it('should handle event cancellation', async () => {
      supabase.from = jest.fn(() => ({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ 
                data: { id: 'event123', status: 'cancelled' }, 
                error: null 
              })),
            })),
          })),
        })),
      }));

      const result = await eventService.cancelEvent('event123', mockUserId);
      expect(result.status).toBe('cancelled');
    });
  });

  describe('Search and Filtering', () => {
    it('should search events by title', async () => {
      const searchResults = [
        { id: '1', title: 'Birthday Party' },
        { id: '2', title: 'Surprise Party' },
      ];

      supabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          ilike: jest.fn(() => Promise.resolve({ data: searchResults, error: null })),
        })),
      }));

      const results = await eventService.searchEvents('party');
      expect(results).toEqual(searchResults);
    });

    it('should filter by location radius', async () => {
      const nearbyEvents = [
        { id: '1', title: 'Local Event', distance: 2.5 },
      ];

      // Mock location-based query
      supabase.rpc = jest.fn(() => Promise.resolve({ 
        data: nearbyEvents, 
        error: null 
      }));

      const results = await eventService.getNearbyEvents({
        latitude: 48.8566,
        longitude: 2.3522,
        radius: 5, // 5km
      });

      expect(results).toEqual(nearbyEvents);
    });

    it('should filter by date range', async () => {
      const weekendEvents = [
        { id: '1', date: '2024-03-30' },
        { id: '2', date: '2024-03-31' },
      ];

      supabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          gte: jest.fn(() => ({
            lte: jest.fn(() => Promise.resolve({ data: weekendEvents, error: null })),
          })),
        })),
      }));

      const results = await eventService.getEventsByDateRange({
        startDate: '2024-03-30',
        endDate: '2024-03-31',
      });

      expect(results).toEqual(weekendEvents);
    });
  });
});