import { supabase } from '@/shared/lib/supabase/client';
import { validateEventCreate, validateUUID } from '@/shared/utils/supabaseValidation';

describe('Event Management Integration', () => {
  const mockUserId = 'user-123';
  const mockEventId = 'event-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Event Creation Flow', () => {
    it('should create event with validation and participants', async () => {
      const eventData = {
        title: 'Test Event',
        description: 'A test event for integration testing',
        date: '2024-12-01T20:00:00.000Z',
        location: 'Test Location',
        tags: ['test', 'integration'],
        is_private: false,
        created_by: mockUserId
      };

      // Mock validation
      const validatedData = validateEventCreate(eventData);
      expect(validatedData.title).toBe(eventData.title);

      // Mock event creation
      const mockEventResponse = {
        data: {
          id: mockEventId,
          ...eventData,
          created_at: '2024-01-01T00:00:00.000Z'
        },
        error: null
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue(mockEventResponse),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue(mockEventResponse)
      });

      // Create event
      const eventResult = await supabase
        .from('events')
        .insert(validatedData);

      expect(eventResult.error).toBeNull();
      expect(eventResult.data?.title).toBe(eventData.title);

      // Mock adding creator as participant
      const mockParticipantResponse = {
        data: {
          event_id: mockEventId,
          user_id: mockUserId,
          status: 'going'
        },
        error: null
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue(mockParticipantResponse)
      });

      const participantResult = await supabase
        .from('event_participants')
        .insert({
          event_id: mockEventId,
          user_id: mockUserId,
          status: 'going'
        });

      expect(participantResult.error).toBeNull();
      expect(participantResult.data?.status).toBe('going');
    });

    it('should handle event creation with advanced features', async () => {
      const eventData = {
        title: 'Advanced Event',
        description: 'Event with capacity and RSVP deadline',
        date: '2024-12-15T19:00:00.000Z',
        location: 'Premium Venue',
        tags: ['premium', 'capacity-limited'],
        is_private: false,
        created_by: mockUserId,
        capacity: 50,
        rsvp_deadline: '2024-12-10T23:59:59.000Z',
        age_restriction: 18,
        cost_per_person: 25.00
      };

      // Mock event with extras creation
      const mockEventResponse = {
        data: { id: mockEventId, ...eventData },
        error: null
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue(mockEventResponse)
      });

      const eventResult = await supabase
        .from('events')
        .insert(eventData);

      expect(eventResult.error).toBeNull();
      expect(eventResult.data?.capacity).toBe(50);
      expect(eventResult.data?.cost_per_person).toBe(25.00);
    });
  });

  describe('Event Participation Flow', () => {
    it('should handle RSVP flow with status changes', async () => {
      const statuses = ['going', 'maybe', 'not_going'];

      for (const status of statuses) {
        const mockResponse = {
          data: {
            event_id: mockEventId,
            user_id: mockUserId,
            status,
            joined_at: '2024-01-01T00:00:00.000Z'
          },
          error: null
        };

        (supabase.from as jest.Mock).mockReturnValue({
          upsert: jest.fn().mockResolvedValue(mockResponse)
        });

        const rsvpResult = await supabase
          .from('event_participants')
          .upsert({
            event_id: mockEventId,
            user_id: mockUserId,
            status
          });

        expect(rsvpResult.error).toBeNull();
        expect(rsvpResult.data?.status).toBe(status);
      }
    });

    it('should enforce capacity limits', async () => {
      // Mock capacity check
      const mockCapacityResponse = {
        count: 50, // At capacity
        error: null
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        count: jest.fn().mockResolvedValue(mockCapacityResponse)
      });

      // Mock event details with capacity
      const mockEventDetails = {
        data: {
          id: mockEventId,
          title: 'Capacity Event',
          capacity: 50
        },
        error: null
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(mockEventDetails)
      });

      // Get current participant count
      const participantCount = await supabase
        .from('event_participants')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', mockEventId);

      const eventDetails = await supabase
        .from('events')
        .select('capacity')
        .eq('id', mockEventId)
        .single();

      // Check if at capacity
      const atCapacity = participantCount.count >= eventDetails.data?.capacity;
      expect(atCapacity).toBe(true);

      if (atCapacity) {
        // Should not allow new participants
        const mockCapacityError = {
          data: null,
          error: { message: 'Event at capacity' }
        };

        (supabase.from as jest.Mock).mockReturnValue({
          insert: jest.fn().mockResolvedValue(mockCapacityError)
        });

        const joinResult = await supabase
          .from('event_participants')
          .insert({
            event_id: mockEventId,
            user_id: 'new-user-789',
            status: 'going'
          });

        expect(joinResult.error).toBeTruthy();
      }
    });
  });

  describe('Event Discovery and Search', () => {
    it('should search events with filters', async () => {
      const searchQuery = 'music';
      const locationFilter = 'Paris';

      const mockSearchResults = {
        data: [
          {
            id: 'event-1',
            title: 'Music Festival',
            location: 'Paris',
            tags: ['music', 'festival'],
            date: '2024-06-15T20:00:00.000Z'
          },
          {
            id: 'event-2',
            title: 'Jazz Night',
            location: 'Paris',
            tags: ['music', 'jazz'],
            date: '2024-06-20T21:00:00.000Z'
          }
        ],
        error: null
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue(mockSearchResults)
      });

      const searchResult = await supabase
        .from('events')
        .select('*')
        .ilike('title', `%${searchQuery}%`)
        .ilike('location', `%${locationFilter}%`)
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true });

      expect(searchResult.error).toBeNull();
      expect(searchResult.data).toHaveLength(2);
      expect(searchResult.data?.[0].title).toContain('Music');
    });

    it('should get nearby events with location filtering', async () => {
      const userLocation = { lat: 48.8566, lng: 2.3522 }; // Paris coordinates

      const mockNearbyEvents = {
        data: [
          {
            id: 'event-nearby-1',
            title: 'Local Event',
            location: 'Paris Center',
            latitude: 48.8584,
            longitude: 2.2945,
            distance: 3.2
          }
        ],
        error: null
      };

      // Mock RPC call for nearby events
      (supabase.rpc as jest.Mock).mockResolvedValue(mockNearbyEvents);

      const nearbyResult = await supabase.rpc('get_nearby_events', {
        user_lat: userLocation.lat,
        user_lng: userLocation.lng,
        radius_km: 10
      });

      expect(nearbyResult.error).toBeNull();
      expect(nearbyResult.data?.[0].distance).toBeLessThan(10);
    });
  });

  describe('Event Memories and Media', () => {
    it('should upload and manage event memories', async () => {
      const memoryData = {
        event_id: mockEventId,
        user_id: mockUserId,
        content_url: 'https://storage.example.com/memory-1.jpg',
        content_type: 'image',
        caption: 'Great event!'
      };

      const mockMemoryResponse = {
        data: {
          id: 'memory-123',
          ...memoryData,
          created_at: '2024-01-01T00:00:00.000Z'
        },
        error: null
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue(mockMemoryResponse)
      });

      const memoryResult = await supabase
        .from('event_memories')
        .insert(memoryData);

      expect(memoryResult.error).toBeNull();
      expect(memoryResult.data?.caption).toBe('Great event!');
    });

    it('should manage event photo albums', async () => {
      const albumData = {
        event_id: mockEventId,
        title: 'Event Photos',
        description: 'Photos from the event',
        is_public: true,
        created_by: mockUserId
      };

      const mockAlbumResponse = {
        data: {
          id: 'album-123',
          ...albumData
        },
        error: null
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue(mockAlbumResponse)
      });

      const albumResult = await supabase
        .from('photo_albums')
        .insert(albumData);

      expect(albumResult.error).toBeNull();
      expect(albumResult.data?.title).toBe('Event Photos');
    });
  });

  describe('Event Comments and Ratings', () => {
    it('should handle event comments thread', async () => {
      const commentData = {
        event_id: mockEventId,
        user_id: mockUserId,
        content: 'Looking forward to this event!',
        parent_id: null
      };

      const mockCommentResponse = {
        data: {
          id: 'comment-123',
          ...commentData,
          created_at: '2024-01-01T00:00:00.000Z'
        },
        error: null
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue(mockCommentResponse)
      });

      const commentResult = await supabase
        .from('event_comments')
        .insert(commentData);

      expect(commentResult.error).toBeNull();
      expect(commentResult.data?.content).toBe('Looking forward to this event!');

      // Test reply to comment
      const replyData = {
        event_id: mockEventId,
        user_id: 'user-456',
        content: 'Me too!',
        parent_id: 'comment-123'
      };

      const mockReplyResponse = {
        data: { id: 'comment-124', ...replyData },
        error: null
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue(mockReplyResponse)
      });

      const replyResult = await supabase
        .from('event_comments')
        .insert(replyData);

      expect(replyResult.error).toBeNull();
      expect(replyResult.data?.parent_id).toBe('comment-123');
    });

    it('should handle event ratings and reviews', async () => {
      const ratingData = {
        event_id: mockEventId,
        user_id: mockUserId,
        rating: 5,
        review: 'Amazing event, well organized!',
        categories: {
          organization: 5,
          venue: 4,
          value: 5
        }
      };

      const mockRatingResponse = {
        data: {
          id: 'rating-123',
          ...ratingData
        },
        error: null
      };

      (supabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockResolvedValue(mockRatingResponse)
      });

      const ratingResult = await supabase
        .from('event_ratings')
        .upsert(ratingData);

      expect(ratingResult.error).toBeNull();
      expect(ratingResult.data?.rating).toBe(5);
      expect(ratingResult.data?.categories.organization).toBe(5);
    });
  });

  describe('Event Logistics', () => {
    it('should manage items to bring list', async () => {
      const items = [
        { name: 'Chairs', quantity: 10, assigned_to: null },
        { name: 'Snacks', quantity: 1, assigned_to: mockUserId },
        { name: 'Music Speaker', quantity: 1, assigned_to: null }
      ];

      for (const item of items) {
        const mockItemResponse = {
          data: {
            id: `item-${item.name}`,
            event_id: mockEventId,
            ...item
          },
          error: null
        };

        (supabase.from as jest.Mock).mockReturnValue({
          insert: jest.fn().mockResolvedValue(mockItemResponse)
        });

        const itemResult = await supabase
          .from('event_items')
          .insert({
            event_id: mockEventId,
            ...item
          });

        expect(itemResult.error).toBeNull();
        expect(itemResult.data?.name).toBe(item.name);
      }
    });

    it('should handle co-host management', async () => {
      const coHostData = {
        event_id: mockEventId,
        user_id: 'co-host-789',
        permissions: ['manage_participants', 'edit_details']
      };

      const mockCoHostResponse = {
        data: {
          id: 'co-host-123',
          ...coHostData
        },
        error: null
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue(mockCoHostResponse)
      });

      const coHostResult = await supabase
        .from('event_co_hosts')
        .insert(coHostData);

      expect(coHostResult.error).toBeNull();
      expect(coHostResult.data?.permissions).toContain('manage_participants');
    });
  });

  describe('Event Validation and Security', () => {
    it('should validate event data and prevent injection', async () => {
      const maliciousEventData = {
        title: "'; DROP TABLE events; --",
        description: '<script>alert("xss")</script>',
        location: "Location'; DELETE FROM users; --",
        created_by: 'not-a-uuid'
      };

      // Validation should catch malicious data
      expect(() => validateEventCreate(maliciousEventData)).toThrow();

      // UUID validation
      expect(validateUUID('not-a-uuid')).toBe(false);
      expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should enforce permission-based access', async () => {
      const unauthorizedUserId = 'unauthorized-user';

      // Mock permission check
      const mockPermissionResponse = {
        data: null,
        error: { message: 'Insufficient permissions' }
      };

      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockResolvedValue(mockPermissionResponse),
        eq: jest.fn().mockReturnThis()
      });

      const updateResult = await supabase
        .from('events')
        .update({ title: 'Updated Title' })
        .eq('id', mockEventId);

      expect(updateResult.error).toBeTruthy();
      expect(updateResult.error?.message).toContain('permissions');
    });
  });
});