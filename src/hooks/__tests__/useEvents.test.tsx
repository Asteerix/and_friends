import { renderHook, waitFor } from '@testing-library/react-native';
import { useEvents } from '../useEvents';
import { supabase } from '@/shared/lib/supabase/client';

jest.mock('@/shared/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

describe('useEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch events successfully', async () => {
    const mockEvents = [
      {
        id: '1',
        title: 'Test Event 1',
        description: 'Description 1',
        start_date: '2025-01-01T10:00:00Z',
        location: 'Test Location 1',
      },
      {
        id: '2',
        title: 'Test Event 2',
        description: 'Description 2',
        start_date: '2025-01-02T10:00:00Z',
        location: 'Test Location 2',
      },
    ];

    const fromMock = supabase.from('events');
    (fromMock.order as jest.Mock).mockResolvedValue({
      data: mockEvents,
      error: null,
    });

    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.events).toEqual(mockEvents);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  it('should handle event fetch error', async () => {
    const fromMock = supabase.from('events');
    (fromMock.order as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch events' },
    });

    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.events).toEqual([]);
      expect(result.current.error).toBe('Failed to fetch events');
      expect(result.current.loading).toBe(false);
    });
  });

  it('should create event successfully', async () => {
    const mockUser = { id: 'user-1' };
    const newEvent = {
      title: 'New Event',
      description: 'New Description',
      start_date: '2025-01-03T10:00:00Z',
      location: 'New Location',
    };

    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const fromMock = supabase.from('events');
    (fromMock.single as jest.Mock).mockResolvedValue({
      data: { ...newEvent, id: '3', creator_id: mockUser.id },
      error: null,
    });

    const { result } = renderHook(() => useEvents());

    const createdEvent = await result.current.createEvent(newEvent);

    await waitFor(() => {
      expect(createdEvent).toEqual({
        ...newEvent,
        id: '3',
        creator_id: mockUser.id,
      });
    });
  });

  it('should update event successfully', async () => {
    const eventId = '1';
    const updates = { title: 'Updated Event Title' };

    const fromMock = supabase.from('events');
    (fromMock.single as jest.Mock).mockResolvedValue({
      data: { id: eventId, ...updates },
      error: null,
    });

    const { result } = renderHook(() => useEvents());

    const updatedEvent = await result.current.updateEvent(eventId, updates);

    await waitFor(() => {
      expect(updatedEvent).toEqual({ id: eventId, ...updates });
    });
  });

  it('should delete event successfully', async () => {
    const eventId = '1';

    const fromMock = supabase.from('events');
    (fromMock.eq as jest.Mock).mockResolvedValue({
      data: null,
      error: null,
    });

    const { result } = renderHook(() => useEvents());

    await result.current.deleteEvent(eventId);

    await waitFor(() => {
      expect(fromMock.delete).toHaveBeenCalled();
      expect(fromMock.eq).toHaveBeenCalledWith('id', eventId);
    });
  });

  it('should filter events by date range', async () => {
    const mockEvents = [
      {
        id: '1',
        title: 'Event in Range',
        start_date: '2025-01-15T10:00:00Z',
      },
    ];

    const fromMock = supabase.from('events');
    (fromMock.order as jest.Mock).mockResolvedValue({
      data: mockEvents,
      error: null,
    });

    const { result } = renderHook(() =>
      useEvents({
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      })
    );

    await waitFor(() => {
      expect(result.current.events).toEqual(mockEvents);
      expect(fromMock.gte).toHaveBeenCalledWith('start_date', '2025-01-01');
      expect(fromMock.lte).toHaveBeenCalledWith('start_date', '2025-01-31');
    });
  });
});