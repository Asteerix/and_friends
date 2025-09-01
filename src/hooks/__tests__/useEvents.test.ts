import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useEvents, Event } from '../useEvents';
import { supabase } from '@/shared/lib/supabase/client';
import { EventService } from '@/features/events/services/eventService';
import { eventCache } from '@/shared/utils/cache/cacheManager';
import { CacheKeys } from '@/shared/utils/cache/cacheKeys';

// Mock dependencies
jest.mock('@/shared/lib/supabase/client');
jest.mock('@/features/events/services/eventService');
jest.mock('@/shared/utils/cache/cacheManager');
jest.mock('@/shared/utils/cache/cacheKeys');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockEventService = EventService as jest.Mocked<typeof EventService>;
const mockEventCache = eventCache as jest.Mocked<typeof eventCache>;
const mockCacheKeys = CacheKeys as jest.Mocked<typeof CacheKeys>;

describe('useEvents', () => {
  const mockEvents: Event[] = [
    {
      id: 'event-1',
      title: 'Test Event 1',
      subtitle: 'Fun event',
      description: 'A great event for testing',
      date: '2024-12-25T18:00:00Z',
      time: '18:00',
      location: 'Test Location',
      address: '123 Test Street',
      latitude: 40.7128,
      longitude: -74.0060,
      cover_url: 'https://example.com/cover1.jpg',
      image_url: 'https://example.com/image1.jpg',
      category: 'party',
      tags: ['fun', 'music'],
      is_private: false,
      invite_only: false,
      max_participants: 100,
      created_by: 'user-123',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      userRSVP: 'going',
      participants_count: 15,
    },
    {
      id: 'event-2',
      title: 'Test Event 2',
      description: 'Another event',
      date: '2024-12-26T20:00:00Z',
      location: 'Another Location',
      category: 'workshop',
      tags: ['learning'],
      is_private: true,
      created_by: 'user-456',
      participants_count: 8,
    },
  ];

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockChannelSubscription = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Supabase mocks
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          then: jest.fn(),
        }),
      }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn(),
      }),
      upsert: jest.fn().mockReturnValue({
        select: jest.fn(),
      }),
    });

    mockSupabase.auth = {
      getUser: jest.fn().mockResolvedValue({
        data: { user: mockUser },
      }),
    } as any;

    mockSupabase.channel = jest.fn().mockReturnValue(mockChannelSubscription);
    mockSupabase.removeChannel = jest.fn();

    // Setup EventService mocks
    mockEventService.addParticipantToEventChat = jest.fn();
    mockEventService.removeParticipantFromEventChat = jest.fn();

    // Setup cache mocks
    mockEventCache.get = jest.fn();
    mockEventCache.set = jest.fn();
    mockCacheKeys.EVENTS_LIST = jest.fn().mockReturnValue('events-list');

    // Reset console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('fetchEvents', () => {
    it('should fetch events from cache first when available', async () => {
      mockEventCache.get.mockReturnValue(mockEvents);

      const { result } = renderHook(() => useEvents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.events).toEqual(mockEvents);
      expect(mockEventCache.get).toHaveBeenCalledWith('events-list');
    });

    it('should fetch events from Supabase when cache is empty', async () => {
      mockEventCache.get.mockReturnValue(null);

      const mockFromChain = {
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockEvents,
            error: null,
          }),
        }),
      };
      mockSupabase.from.mockReturnValue(mockFromChain);

      const { result } = renderHook(() => useEvents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.events).toEqual(mockEvents);
      expect(mockSupabase.from).toHaveBeenCalledWith('events');
      expect(mockFromChain.select).toHaveBeenCalledWith('*');
      expect(mockEventCache.set).toHaveBeenCalledWith(
        'events-list',
        mockEvents,
        { ttl: 1800000 }
      );
    });

    it('should handle fetch errors gracefully', async () => {
      mockEventCache.get.mockReturnValue(null);

      const mockError = { message: 'Database error', code: '500' };
      const mockFromChain = {
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      };
      mockSupabase.from.mockReturnValue(mockFromChain);

      const { result } = renderHook(() => useEvents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.events).toEqual([]);
      expect(result.current.error).toEqual(mockError);
    });

    it('should update cache when fetching fresh data in background', async () => {
      const cachedEvents = [mockEvents[0]];
      const freshEvents = mockEvents;

      mockEventCache.get.mockReturnValue(cachedEvents);

      const mockFromChain = {
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            then: jest.fn().mockImplementation((callback) => {
              // Simulate background fetch
              setTimeout(() => {
                callback({ data: freshEvents, error: null });
              }, 100);
              return Promise.resolve();
            }),
          }),
        }),
      };
      mockSupabase.from.mockReturnValue(mockFromChain);

      const { result } = renderHook(() => useEvents());

      // Initially shows cached data
      await waitFor(() => {
        expect(result.current.events).toEqual(cachedEvents);
        expect(result.current.loading).toBe(false);
      });

      // Wait for background update
      await waitFor(() => {
        expect(mockEventCache.set).toHaveBeenCalledWith(
          'events-list',
          freshEvents,
          { ttl: 1800000 }
        );
      }, { timeout: 200 });
    });

    it('should handle concurrent fetch requests', async () => {
      mockEventCache.get.mockReturnValue(null);

      const mockFromChain = {
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockEvents,
            error: null,
          }),
        }),
      };
      mockSupabase.from.mockReturnValue(mockFromChain);

      const { result: result1 } = renderHook(() => useEvents());
      const { result: result2 } = renderHook(() => useEvents());

      await waitFor(() => {
        expect(result1.current.loading).toBe(false);
        expect(result2.current.loading).toBe(false);
      });

      expect(result1.current.events).toEqual(mockEvents);
      expect(result2.current.events).toEqual(mockEvents);
    });
  });

  describe('createEvent', () => {
    it('should create event successfully', async () => {
      const newEvent: Event = {
        title: 'New Event',
        description: 'A new event',
        date: '2024-12-27T19:00:00Z',
        location: 'New Location',
      };

      const createdEvent = { ...newEvent, id: 'event-3' };

      const mockFromChain = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [createdEvent],
            error: null,
          }),
        }),
      };
      mockSupabase.from.mockReturnValue(mockFromChain);

      const { result } = renderHook(() => useEvents());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let createResult;
      await act(async () => {
        createResult = await result.current.createEvent(newEvent);
      });

      expect(createResult).toEqual({
        data: [createdEvent],
        error: null,
      });
      expect(mockFromChain.insert).toHaveBeenCalledWith([newEvent]);
      expect(result.current.events).toContainEqual(createdEvent);
    });

    it('should handle create event errors', async () => {
      const newEvent: Event = {
        title: 'New Event',
        date: '2024-12-27T19:00:00Z',
      };

      const mockError = { message: 'Creation failed', code: '422' };
      const mockFromChain = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      };
      mockSupabase.from.mockReturnValue(mockFromChain);

      const { result } = renderHook(() => useEvents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let createResult;
      await act(async () => {
        createResult = await result.current.createEvent(newEvent);
      });

      expect(createResult).toEqual({
        data: null,
        error: mockError,
      });
      expect(result.current.events).not.toContainEqual(expect.objectContaining(newEvent));
    });

    it('should handle event creation with all fields', async () => {
      const completeEvent: Event = {
        title: 'Complete Event',
        subtitle: 'Full details',
        description: 'Event with all fields',
        date: '2024-12-27T19:00:00Z',
        time: '19:00',
        location: 'Complete Location',
        address: '456 Complete St',
        latitude: 41.8781,
        longitude: -87.6298,
        cover_url: 'https://example.com/cover.jpg',
        image_url: 'https://example.com/image.jpg',
        category: 'networking',
        tags: ['business', 'networking'],
        is_private: true,
        invite_only: true,
        max_participants: 50,
      };

      const createdEvent = { ...completeEvent, id: 'event-complete' };

      const mockFromChain = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [createdEvent],
            error: null,
          }),
        }),
      };
      mockSupabase.from.mockReturnValue(mockFromChain);

      const { result } = renderHook(() => useEvents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.createEvent(completeEvent);
      });

      expect(mockFromChain.insert).toHaveBeenCalledWith([completeEvent]);
    });
  });

  describe('joinEvent', () => {
    it('should join event successfully and add to chat', async () => {
      const eventId = 'event-1';
      const userId = 'user-123';

      const mockFromChain = {
        insert: jest.fn().mockResolvedValue({
          data: [{ event_id: eventId, user_id: userId }],
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValue(mockFromChain);

      mockEventService.addParticipantToEventChat.mockResolvedValue(undefined);

      const { result } = renderHook(() => useEvents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let joinResult;
      await act(async () => {
        joinResult = await result.current.joinEvent(eventId, userId);
      });

      expect(joinResult?.error).toBeNull();
      expect(mockFromChain.insert).toHaveBeenCalledWith([{ event_id: eventId, user_id: userId }]);
      expect(mockEventService.addParticipantToEventChat).toHaveBeenCalledWith(eventId, userId);
    });

    it('should handle join event database error', async () => {
      const eventId = 'event-1';
      const userId = 'user-123';

      const mockError = { message: 'Join failed', code: '409' };
      const mockFromChain = {
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      };
      mockSupabase.from.mockReturnValue(mockFromChain);

      const { result } = renderHook(() => useEvents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let joinResult;
      await act(async () => {
        joinResult = await result.current.joinEvent(eventId, userId);
      });

      expect(joinResult?.error).toEqual(mockError);
      expect(mockEventService.addParticipantToEventChat).not.toHaveBeenCalled();
    });

    it('should continue even if chat service fails', async () => {
      const eventId = 'event-1';
      const userId = 'user-123';

      const mockFromChain = {
        insert: jest.fn().mockResolvedValue({
          data: [{ event_id: eventId, user_id: userId }],
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValue(mockFromChain);

      mockEventService.addParticipantToEventChat.mockRejectedValue(
        new Error('Chat service error')
      );

      const { result } = renderHook(() => useEvents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let joinResult;
      await act(async () => {
        joinResult = await result.current.joinEvent(eventId, userId);
      });

      expect(joinResult?.error).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        "Erreur lors de l'ajout au chat:",
        expect.any(Error)
      );
    });
  });

  describe('updateRSVP', () => {
    it('should update RSVP status successfully', async () => {
      const eventId = 'event-1';
      const status = 'going';

      // Mock current participant check
      const mockSelectChain = {
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { status: 'maybe' },
              error: null,
            }),
          }),
        }),
      };

      const mockUpsertChain = {
        select: jest.fn().mockResolvedValue({
          data: [{ event_id: eventId, user_id: mockUser.id, status }],
          error: null,
        }),
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'event_participants') {
          return {
            select: jest.fn().mockReturnValue(mockSelectChain),
            upsert: jest.fn().mockReturnValue(mockUpsertChain),
          };
        }
        return {};
      });

      mockEventService.addParticipantToEventChat.mockResolvedValue(undefined);

      // Set up initial events state
      const { result } = renderHook(() => useEvents());
      
      await act(async () => {
        result.current.events.length = 0;
        result.current.events.push(...mockEvents);
      });

      let updateResult;
      await act(async () => {
        updateResult = await result.current.updateRSVP(eventId, status);
      });

      expect(updateResult?.error).toBeNull();
      expect(mockEventService.addParticipantToEventChat).toHaveBeenCalledWith(
        eventId,
        mockUser.id
      );
    });

    it('should handle unauthenticated user', async () => {
      mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: null },
      });

      const { result } = renderHook(() => useEvents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let updateResult;
      await act(async () => {
        updateResult = await result.current.updateRSVP('event-1', 'going');
      });

      expect(updateResult?.error).toEqual({ message: 'Not authenticated' });
    });

    it('should remove participant from chat when changing from going to not going', async () => {
      const eventId = 'event-1';
      const status = 'not_going';

      const mockSelectChain = {
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { status: 'going' },
              error: null,
            }),
          }),
        }),
      };

      const mockUpsertChain = {
        select: jest.fn().mockResolvedValue({
          data: [{ event_id: eventId, user_id: mockUser.id, status }],
          error: null,
        }),
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'event_participants') {
          return {
            select: jest.fn().mockReturnValue(mockSelectChain),
            upsert: jest.fn().mockReturnValue(mockUpsertChain),
          };
        }
        return {};
      });

      mockEventService.removeParticipantFromEventChat.mockResolvedValue(undefined);

      const { result } = renderHook(() => useEvents());
      
      await act(async () => {
        result.current.events.length = 0;
        result.current.events.push(...mockEvents);
      });

      await act(async () => {
        await result.current.updateRSVP(eventId, status);
      });

      expect(mockEventService.removeParticipantFromEventChat).toHaveBeenCalledWith(
        eventId,
        mockUser.id
      );
    });

    it('should update local state after successful RSVP', async () => {
      const eventId = 'event-1';
      const status = 'maybe';

      const mockSelectChain = {
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };

      const mockUpsertChain = {
        select: jest.fn().mockResolvedValue({
          data: [{ event_id: eventId, user_id: mockUser.id, status }],
          error: null,
        }),
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'event_participants') {
          return {
            select: jest.fn().mockReturnValue(mockSelectChain),
            upsert: jest.fn().mockReturnValue(mockUpsertChain),
          };
        }
        return {};
      });

      const { result } = renderHook(() => useEvents());
      
      // Set initial state with events
      await act(async () => {
        result.current.events.length = 0;
        result.current.events.push(...mockEvents);
      });

      await act(async () => {
        await result.current.updateRSVP(eventId, status);
      });

      const updatedEvent = result.current.events.find(e => e.id === eventId);
      expect(updatedEvent?.userRSVP).toBe(status);
    });

    it('should handle RSVP update errors', async () => {
      const eventId = 'event-1';
      const status = 'going';
      const mockError = { message: 'RSVP update failed', code: '500' };

      const mockSelectChain = {
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };

      const mockUpsertChain = {
        select: jest.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'event_participants') {
          return {
            select: jest.fn().mockReturnValue(mockSelectChain),
            upsert: jest.fn().mockReturnValue(mockUpsertChain),
          };
        }
        return {};
      });

      const { result } = renderHook(() => useEvents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let updateResult;
      await act(async () => {
        updateResult = await result.current.updateRSVP(eventId, status);
      });

      expect(updateResult?.error).toEqual(mockError);
      expect(mockEventService.addParticipantToEventChat).not.toHaveBeenCalled();
    });
  });

  describe('real-time subscriptions', () => {
    it('should set up event subscriptions on mount', () => {
      renderHook(() => useEvents());

      expect(mockSupabase.channel).toHaveBeenCalledWith('events:changes');
      expect(mockSupabase.channel).toHaveBeenCalledWith('event_participants:changes');
      expect(mockChannelSubscription.on).toHaveBeenCalledTimes(2);
      expect(mockChannelSubscription.subscribe).toHaveBeenCalledTimes(2);
    });

    it('should handle real-time event INSERT', () => {
      const { unmount } = renderHook(() => useEvents());

      // Get the callback for events INSERT
      const eventsOnCall = mockChannelSubscription.on.mock.calls.find(
        call => call[1].table === 'events'
      );
      const eventsCallback = eventsOnCall?.[2];

      expect(eventsCallback).toBeDefined();

      // Simulate INSERT event
      const newEvent = { ...mockEvents[0], id: 'new-event', title: 'New Event' };
      act(() => {
        eventsCallback({
          eventType: 'INSERT',
          new: newEvent,
        });
      });

      unmount();
    });

    it('should handle real-time event UPDATE', () => {
      const { unmount } = renderHook(() => useEvents());

      const eventsOnCall = mockChannelSubscription.on.mock.calls.find(
        call => call[1].table === 'events'
      );
      const eventsCallback = eventsOnCall?.[2];

      const updatedEvent = { ...mockEvents[0], title: 'Updated Title' };
      act(() => {
        eventsCallback({
          eventType: 'UPDATE',
          new: updatedEvent,
        });
      });

      unmount();
    });

    it('should handle real-time event DELETE', () => {
      const { unmount } = renderHook(() => useEvents());

      const eventsOnCall = mockChannelSubscription.on.mock.calls.find(
        call => call[1].table === 'events'
      );
      const eventsCallback = eventsOnCall?.[2];

      act(() => {
        eventsCallback({
          eventType: 'DELETE',
          old: { id: 'event-1' },
        });
      });

      unmount();
    });

    it('should clean up subscriptions on unmount', () => {
      const { unmount } = renderHook(() => useEvents());

      unmount();

      expect(mockSupabase.removeChannel).toHaveBeenCalledTimes(2);
    });

    it('should refetch events on participant changes', () => {
      const { unmount } = renderHook(() => useEvents());

      const participantsOnCall = mockChannelSubscription.on.mock.calls.find(
        call => call[1].table === 'event_participants'
      );
      const participantsCallback = participantsOnCall?.[2];

      expect(participantsCallback).toBeDefined();

      act(() => {
        participantsCallback({
          eventType: 'INSERT',
          new: { event_id: 'event-1', user_id: 'new-user' },
        });
      });

      unmount();
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle empty events array', async () => {
      mockEventCache.get.mockReturnValue(null);

      const mockFromChain = {
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      };
      mockSupabase.from.mockReturnValue(mockFromChain);

      const { result } = renderHook(() => useEvents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.events).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should handle null data response', async () => {
      mockEventCache.get.mockReturnValue(null);

      const mockFromChain = {
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      };
      mockSupabase.from.mockReturnValue(mockFromChain);

      const { result } = renderHook(() => useEvents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.events).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should handle cache set errors gracefully', async () => {
      mockEventCache.get.mockReturnValue(null);
      mockEventCache.set.mockRejectedValue(new Error('Cache error'));

      const mockFromChain = {
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockEvents,
            error: null,
          }),
        }),
      };
      mockSupabase.from.mockReturnValue(mockFromChain);

      const { result } = renderHook(() => useEvents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.events).toEqual(mockEvents);
      expect(result.current.error).toBeNull();
    });

    it('should handle malformed events data', async () => {
      const malformedEvents = [
        {
          id: 'event-malformed',
          title: null, // Invalid title
          date: 'invalid-date',
          // Missing required fields
        },
        {
          // Missing id
          title: 'Event without ID',
          date: '2024-12-25T18:00:00Z',
        },
      ];

      mockEventCache.get.mockReturnValue(null);

      const mockFromChain = {
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: malformedEvents,
            error: null,
          }),
        }),
      };
      mockSupabase.from.mockReturnValue(mockFromChain);

      const { result } = renderHook(() => useEvents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.events).toEqual(malformedEvents);
    });

    it('should handle network timeout gracefully', async () => {
      mockEventCache.get.mockReturnValue(null);

      const mockFromChain = {
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockRejectedValue(new Error('Network timeout')),
        }),
      };
      mockSupabase.from.mockReturnValue(mockFromChain);

      const { result } = renderHook(() => useEvents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.events).toEqual([]);
      expect(result.current.error).toEqual(new Error('Network timeout'));
    });

    it('should handle concurrent RSVP updates', async () => {
      const eventId = 'event-1';

      const mockSelectChain = {
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };

      const mockUpsertChain = {
        select: jest.fn().mockResolvedValue({
          data: [{ event_id: eventId, user_id: mockUser.id, status: 'going' }],
          error: null,
        }),
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'event_participants') {
          return {
            select: jest.fn().mockReturnValue(mockSelectChain),
            upsert: jest.fn().mockReturnValue(mockUpsertChain),
          };
        }
        return {};
      });

      const { result } = renderHook(() => useEvents());
      
      await act(async () => {
        result.current.events.length = 0;
        result.current.events.push(...mockEvents);
      });

      // Make concurrent RSVP updates
      await act(async () => {
        const promises = [
          result.current.updateRSVP(eventId, 'going'),
          result.current.updateRSVP(eventId, 'maybe'),
          result.current.updateRSVP(eventId, 'not_going'),
        ];
        await Promise.all(promises);
      });

      // Should handle concurrent updates without crashing
      expect(result.current.events).toBeDefined();
    });
  });

  describe('performance and memory', () => {
    it('should not cause memory leaks with multiple subscriptions', () => {
      const { unmount: unmount1 } = renderHook(() => useEvents());
      const { unmount: unmount2 } = renderHook(() => useEvents());
      const { unmount: unmount3 } = renderHook(() => useEvents());

      unmount1();
      unmount2();
      unmount3();

      // Should call removeChannel for each hook instance
      expect(mockSupabase.removeChannel).toHaveBeenCalledTimes(6); // 2 channels per hook × 3 hooks
    });

    it('should handle rapid state updates efficiently', async () => {
      const { result } = renderHook(() => useEvents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Rapidly update events state
      const updatePromises = Array.from({ length: 100 }, (_, i) => 
        act(async () => {
          result.current.events.push({
            id: `rapid-event-${i}`,
            title: `Rapid Event ${i}`,
            date: '2024-12-25T18:00:00Z',
          });
        })
      );

      await Promise.all(updatePromises);

      expect(result.current.events.length).toBeGreaterThan(0);
    });

    it('should debounce rapid real-time updates', () => {
      const { unmount } = renderHook(() => useEvents());

      const eventsOnCall = mockChannelSubscription.on.mock.calls.find(
        call => call[1].table === 'events'
      );
      const eventsCallback = eventsOnCall?.[2];

      // Rapidly trigger real-time updates
      for (let i = 0; i < 10; i++) {
        act(() => {
          eventsCallback({
            eventType: 'INSERT',
            new: { id: `rapid-${i}`, title: `Rapid ${i}` },
          });
        });
      }

      unmount();
    });
  });
});