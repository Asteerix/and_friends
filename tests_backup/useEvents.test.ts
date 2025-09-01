import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useEvents } from '@/hooks/useEvents';
import { useEventsAdvanced } from '@/hooks/useEventsAdvanced';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  })),
};

jest.mock('@/shared/lib/supabase/client', () => ({
  supabase: mockSupabase,
}));

// Mock user session
const mockSession = {
  user: {
    id: 'user-1',
    email: 'test@example.com',
  },
};

jest.mock('@/shared/providers/SessionContext', () => ({
  useSession: () => ({ session: mockSession }),
}));

describe('Events Hooks', () => {
  const mockEvents = [
    {
      id: '1',
      title: 'Test Event 1',
      description: 'Test Description 1',
      date: '2025-08-23T19:00:00Z',
      location: 'Test Location 1',
      created_by: 'user-1',
      tags: ['party'],
      is_private: false,
      created_at: '2025-08-20T10:00:00Z',
      updated_at: '2025-08-20T10:00:00Z',
    },
    {
      id: '2',
      title: 'Test Event 2',
      description: 'Test Description 2',
      date: '2025-08-24T20:00:00Z',
      location: 'Test Location 2',
      created_by: 'user-2',
      tags: ['music'],
      is_private: true,
      created_at: '2025-08-21T10:00:00Z',
      updated_at: '2025-08-21T10:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useEvents', () => {
    test('fetches events successfully', async () => {
      // Mock successful response
      mockSupabase.from().single.mockResolvedValueOnce({
        data: mockEvents,
        error: null,
      });

      const { result } = renderHook(() => useEvents());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.events).toEqual(mockEvents);
      expect(result.current.error).toBeNull();
    });

    test('handles fetch error', async () => {
      const mockError = new Error('Failed to fetch events');
      mockSupabase.from().single.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useEvents());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.events).toEqual([]);
      expect(result.current.error).toEqual(mockError);
    });

    test('refreshes events', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: mockEvents,
        error: null,
      });

      const { result } = renderHook(() => useEvents());

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockSupabase.from).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });

  describe('useEventsAdvanced', () => {
    test('filters events by category', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: mockEvents.filter((e) => e.tags.includes('party')),
        error: null,
      });

      const { result } = renderHook(() => useEventsAdvanced({ category: 'party' }));

      await waitFor(() => {
        expect(result.current.events).toHaveLength(1);
        expect(result.current.events[0].tags).toContain('party');
      });
    });

    test('searches events by query', async () => {
      const searchQuery = 'Test Event 1';
      mockSupabase.from().single.mockResolvedValue({
        data: mockEvents.filter((e) => e.title.includes('1')),
        error: null,
      });

      const { result } = renderHook(() => useEventsAdvanced({ searchQuery }));

      await waitFor(() => {
        expect(result.current.events).toHaveLength(1);
        expect(result.current.events[0].title).toContain('1');
      });
    });

    test('filters by date range', async () => {
      const startDate = '2025-08-23T00:00:00Z';
      const endDate = '2025-08-23T23:59:59Z';

      mockSupabase.from().single.mockResolvedValue({
        data: mockEvents.filter((e) => e.date >= startDate && e.date <= endDate),
        error: null,
      });

      const { result } = renderHook(() =>
        useEventsAdvanced({ dateRange: { start: startDate, end: endDate } })
      );

      await waitFor(() => {
        expect(result.current.events).toHaveLength(1);
      });
    });

    test('handles pagination', async () => {
      const page1Events = [mockEvents[0]];
      const page2Events = [mockEvents[1]];

      mockSupabase
        .from()
        .single.mockResolvedValueOnce({ data: page1Events, error: null })
        .mockResolvedValueOnce({ data: page2Events, error: null });

      const { result } = renderHook(() => useEventsAdvanced({ limit: 1 }));

      await waitFor(() => {
        expect(result.current.events).toHaveLength(1);
      });

      await act(async () => {
        await result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(2);
      });
    });
  });

  describe('Event Operations', () => {
    test('creates new event', async () => {
      const newEvent = {
        title: 'New Event',
        description: 'New Description',
        date: '2025-08-25T19:00:00Z',
        location: 'New Location',
        tags: ['new'],
        is_private: false,
      };

      mockSupabase.from().insert.mockResolvedValue({
        data: { id: '3', ...newEvent },
        error: null,
      });

      const { result } = renderHook(() => useEventsAdvanced());

      await act(async () => {
        await result.current.createEvent(newEvent);
      });

      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        ...newEvent,
        created_by: mockSession.user.id,
      });
    });

    test('updates existing event', async () => {
      const updates = { title: 'Updated Title' };
      mockSupabase.from().update.mockResolvedValue({
        data: { ...mockEvents[0], ...updates },
        error: null,
      });

      const { result } = renderHook(() => useEventsAdvanced());

      await act(async () => {
        await result.current.updateEvent('1', updates);
      });

      expect(mockSupabase.from().update).toHaveBeenCalledWith(updates);
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('id', '1');
    });

    test('deletes event', async () => {
      mockSupabase.from().delete.mockResolvedValue({
        data: null,
        error: null,
      });

      const { result } = renderHook(() => useEventsAdvanced());

      await act(async () => {
        await result.current.deleteEvent('1');
      });

      expect(mockSupabase.from().delete).toHaveBeenCalled();
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('id', '1');
    });
  });
});
