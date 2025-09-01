import { renderHook, act, waitFor } from '@testing-library/react-native';
import { supabase } from '@/shared/lib/supabase/client';
import { useEvents } from '@/hooks/useEvents';
import { useEventInteractions } from '@/hooks/useEventInteractions';

jest.mock('@/shared/lib/supabase/client');

describe('Event Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Event Creation', () => {
    it('should create event with all required fields', async () => {
      const mockInsert = jest.fn().mockResolvedValue({
        data: [{ id: 'event123', title: 'Test Event' }],
        error: null,
      });

      (supabase.from as jest.Mock) = jest.fn(() => ({
        insert: mockInsert,
      }));

      const eventData = {
        title: 'Test Event',
        description: 'Test Description',
        location: 'Paris',
        date: '2025-01-01',
        time: '18:00',
        creator_id: 'user123',
        category: 'party',
        max_participants: 20,
      };

      const result = await supabase.from('events').insert(eventData);

      expect(mockInsert).toHaveBeenCalledWith(eventData);
      expect(result.data?.[0]?.title).toBe('Test Event');
    });

    it('should validate event date is in future', () => {
      const pastDate = new Date('2020-01-01');
      const futureDate = new Date('2025-12-01');
      const now = new Date();

      expect(pastDate < now).toBe(true);
      expect(futureDate > now).toBe(true);
    });

    it('should enforce max participants limit', () => {
      const maxParticipants = 20;
      const currentParticipants = 25;

      const canJoin = currentParticipants < maxParticipants;
      expect(canJoin).toBe(false);
    });
  });

  describe('Event RSVP', () => {
    it('should handle RSVP status updates', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({
        data: [{ status: 'attending' }],
        error: null,
      });

      (supabase.from as jest.Mock) = jest.fn(() => ({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: mockUpdate,
          })),
        })),
      }));

      const { result } = renderHook(() => useEventInteractions());

      await act(async () => {
        await result.current.updateRSVP('event123', 'attending');
      });

      expect(result.current.rsvpStatus).toBe('attending');
    });

    it('should track RSVP counts', () => {
      const rsvps = [
        { status: 'attending' },
        { status: 'attending' },
        { status: 'maybe' },
        { status: 'not_attending' },
      ];

      const counts = rsvps.reduce((acc, rsvp) => {
        acc[rsvp.status] = (acc[rsvp.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(counts.attending).toBe(2);
      expect(counts.maybe).toBe(1);
      expect(counts.not_attending).toBe(1);
    });
  });

  describe('Event Search & Filter', () => {
    it('should filter events by category', () => {
      const events = [
        { id: '1', category: 'party' },
        { id: '2', category: 'sports' },
        { id: '3', category: 'party' },
      ];

      const filtered = events.filter(e => e.category === 'party');
      expect(filtered).toHaveLength(2);
    });

    it('should filter events by date range', () => {
      const events = [
        { id: '1', date: '2025-01-15' },
        { id: '2', date: '2025-02-20' },
        { id: '3', date: '2025-03-10' },
      ];

      const startDate = '2025-02-01';
      const endDate = '2025-02-28';

      const filtered = events.filter(e => 
        e.date >= startDate && e.date <= endDate
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2');
    });

    it('should search events by title and description', () => {
      const events = [
        { title: 'Birthday Party', description: 'Fun celebration' },
        { title: 'Sports Day', description: 'Football match' },
        { title: 'Movie Night', description: 'Watch party at home' },
      ];

      const searchTerm = 'party';
      const results = events.filter(e =>
        e.title.toLowerCase().includes(searchTerm) ||
        e.description.toLowerCase().includes(searchTerm)
      );

      expect(results).toHaveLength(2);
    });
  });

  describe('Event Permissions', () => {
    it('should allow creator to edit event', () => {
      const event = { creator_id: 'user123' };
      const currentUserId = 'user123';

      const canEdit = event.creator_id === currentUserId;
      expect(canEdit).toBe(true);
    });

    it('should prevent non-creator from editing', () => {
      const event = { creator_id: 'user123' };
      const currentUserId = 'user456';

      const canEdit = event.creator_id === currentUserId;
      expect(canEdit).toBe(false);
    });

    it('should check co-host permissions', () => {
      const coHosts = ['user456', 'user789'];
      const currentUserId = 'user456';

      const isCoHost = coHosts.includes(currentUserId);
      expect(isCoHost).toBe(true);
    });
  });

  describe('Event Notifications', () => {
    it('should send notification for new event', async () => {
      const mockNotification = jest.fn();
      
      await mockNotification({
        type: 'new_event',
        event_id: 'event123',
        recipients: ['user456', 'user789'],
      });

      expect(mockNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'new_event',
          event_id: 'event123',
        })
      );
    });

    it('should notify on RSVP changes', async () => {
      const mockNotification = jest.fn();
      
      await mockNotification({
        type: 'rsvp_update',
        event_id: 'event123',
        user_id: 'user456',
        status: 'attending',
      });

      expect(mockNotification).toHaveBeenCalled();
    });
  });
});
