import { eventService } from '../mocks/eventService.mock';

jest.mock('@/features/notifications/services/notificationService');

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('Event Features Comprehensive Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Event Creation and Management', () => {
    it('should create event with all required fields', async () => {
      const { eventService } = require('@/features/events/services/eventService');

      const eventData = {
        title: 'Beach Volleyball Tournament',
        description: 'Annual beach volleyball tournament with prizes',
        date: '2024-07-15T14:00:00.000Z',
        location: 'Santa Monica Beach',
        latitude: 34.0194,
        longitude: -118.4912,
        capacity: 32,
        is_private: false,
        age_restriction: 18,
        cost_per_person: 25.00,
        tags: ['sports', 'volleyball', 'beach', 'tournament'],
        dress_code: 'Athletic wear and sunscreen',
        accessibility_features: ['wheelchair_accessible', 'parking_available'],
        items_to_bring: ['volleyball', 'net', 'water', 'snacks'],
        parking_info: 'Free parking available on Ocean Avenue',
        rsvp_deadline: '2024-07-10T23:59:59.000Z'
      };

      const result = await eventService.createEvent(eventData);

      expect(result.error).toBeNull();
      expect(result.data).toMatchObject({
        title: eventData.title,
        capacity: eventData.capacity,
        cost_per_person: eventData.cost_per_person,
        tags: expect.arrayContaining(['sports', 'volleyball'])
      });
    });

    it('should validate event capacity and enforce limits', async () => {
      const { eventService } = require('@/features/events/services/eventService');

      // Create event with capacity limit
      const eventData = {
        title: 'Small Meetup',
        capacity: 2,
        date: '2024-06-01T18:00:00.000Z',
        location: 'Coffee Shop'
      };

      const eventResult = await eventService.createEvent(eventData);
      expect(eventResult.error).toBeNull();

      const eventId = eventResult.data.id;

      // Fill capacity
      const user1 = await eventService.joinEvent(eventId, 'user1', 'going');
      const user2 = await eventService.joinEvent(eventId, 'user2', 'going');

      expect(user1.error).toBeNull();
      expect(user2.error).toBeNull();

      // Try to exceed capacity
      const user3 = await eventService.joinEvent(eventId, 'user3', 'going');
      expect(user3.error).toBeTruthy();
      expect(user3.error.message).toContain('capacity');
    });

    it('should handle RSVP deadline enforcement', async () => {
      const { eventService } = require('@/features/events/services/eventService');

      const pastDeadline = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const eventData = {
        title: 'Past Deadline Event',
        date: '2024-06-15T18:00:00.000Z',
        rsvp_deadline: pastDeadline,
        location: 'Test Venue'
      };

      const eventResult = await eventService.createEvent(eventData);
      const eventId = eventResult.data.id;

      const joinResult = await eventService.joinEvent(eventId, 'user1', 'going');
      
      expect(joinResult.error).toBeTruthy();
      expect(joinResult.error.message).toContain('deadline');
    });

    it('should manage co-hosts and permissions', async () => {
      const { eventService } = require('@/features/events/services/eventService');

      const eventData = {
        title: 'Co-hosted Event',
        date: '2024-06-20T19:00:00.000Z',
        location: 'Community Center',
        created_by: 'host1'
      };

      const eventResult = await eventService.createEvent(eventData);
      const eventId = eventResult.data.id;

      // Add co-host
      const coHostResult = await eventService.addCoHost(eventId, 'host2', [
        'manage_participants',
        'edit_details',
        'send_messages'
      ]);

      expect(coHostResult.error).toBeNull();
      expect(coHostResult.data.permissions).toContain('manage_participants');

      // Test co-host permissions
      const updateResult = await eventService.updateEvent(eventId, {
        description: 'Updated by co-host'
      }, 'host2');

      expect(updateResult.error).toBeNull();
    });
  });

  describe('Event Search and Discovery', () => {
    it('should search events by location radius', async () => {
      const { eventService } = require('@/features/events/services/eventService');

      const userLocation = { lat: 34.0522, lng: -118.2437 }; // Los Angeles
      const radiusKm = 10;

      const searchResult = await eventService.searchNearbyEvents(
        userLocation.lat,
        userLocation.lng,
        radiusKm
      );

      expect(searchResult.error).toBeNull();
      expect(searchResult.data).toBeInstanceOf(Array);

      // All results should be within radius
      searchResult.data.forEach((event: any) => {
        expect(event.distance).toBeLessThanOrEqual(radiusKm);
        expect(event.latitude).toBeDefined();
        expect(event.longitude).toBeDefined();
      });
    });

    it('should filter events by category and tags', async () => {
      const { eventService } = require('@/features/events/services/eventService');

      const filters = {
        categories: ['sports', 'outdoors'],
        tags: ['volleyball', 'beach'],
        date_range: {
          start: '2024-06-01T00:00:00.000Z',
          end: '2024-08-31T23:59:59.000Z'
        },
        price_range: {
          min: 0,
          max: 50
        }
      };

      const searchResult = await eventService.searchEvents(filters);

      expect(searchResult.error).toBeNull();
      expect(searchResult.data).toBeInstanceOf(Array);

      // Verify filtering
      searchResult.data.forEach((event: any) => {
        expect(
          event.tags.some((tag: string) => filters.tags.includes(tag)) ||
          filters.categories.some(cat => event.category === cat)
        ).toBe(true);

        if (event.cost_per_person) {
          expect(event.cost_per_person).toBeLessThanOrEqual(filters.price_range.max);
          expect(event.cost_per_person).toBeGreaterThanOrEqual(filters.price_range.min);
        }
      });
    });

    it('should provide personalized event recommendations', async () => {
      const { eventService } = require('@/features/events/services/eventService');

      const userPreferences = {
        interests: ['music', 'food', 'technology'],
        location: { lat: 37.7749, lng: -122.4194 }, // San Francisco
        age: 28,
        preferred_times: ['evening', 'weekend'],
        budget_range: { min: 0, max: 100 }
      };

      const recommendations = await eventService.getPersonalizedRecommendations(
        'user123',
        userPreferences
      );

      expect(recommendations.error).toBeNull();
      expect(recommendations.data).toBeInstanceOf(Array);
      expect(recommendations.data.length).toBeGreaterThan(0);

      // Verify recommendations match preferences
      recommendations.data.forEach((event: any) => {
        const hasMatchingInterest = event.tags.some((tag: string) => 
          userPreferences.interests.includes(tag)
        );
        expect(hasMatchingInterest || event.category_match).toBe(true);
      });
    });
  });

  describe('Event Participant Management', () => {
    it('should handle different RSVP statuses', async () => {
      const { eventService } = require('@/features/events/services/eventService');

      const eventId = 'test-event-1';
      const userId = 'test-user-1';
      const statuses = ['going', 'maybe', 'not_going', 'going'];

      let previousStatus = null;

      for (const status of statuses) {
        const result = await eventService.updateRSVP(eventId, userId, status);
        
        expect(result.error).toBeNull();
        expect(result.data.status).toBe(status);
        expect(result.data.previous_status).toBe(previousStatus);
        
        previousStatus = status;
      }
    });

    it('should send notifications for RSVP changes', async () => {
      const { eventService } = require('@/features/events/services/eventService');
      const mockNotificationService = require('@/features/notifications/services/notificationService');

      const eventId = 'test-event-1';
      const userId = 'test-user-1';

      await eventService.updateRSVP(eventId, userId, 'going');

      expect(mockNotificationService.sendEventNotification).toHaveBeenCalledWith({
        type: 'rsvp_update',
        eventId,
        userId,
        status: 'going'
      });
    });

    it('should manage waitlist when event is full', async () => {
      const { eventService } = require('@/features/events/services/eventService');

      const eventData = {
        title: 'Full Event Test',
        capacity: 1,
        date: '2024-06-25T20:00:00.000Z',
        location: 'Small Venue'
      };

      const eventResult = await eventService.createEvent(eventData);
      const eventId = eventResult.data.id;

      // Fill capacity
      await eventService.joinEvent(eventId, 'user1', 'going');

      // Add to waitlist
      const waitlistResult = await eventService.joinEvent(eventId, 'user2', 'going');
      
      expect(waitlistResult.error).toBeNull();
      expect(waitlistResult.data.status).toBe('waitlisted');

      // User1 leaves, user2 should be promoted
      await eventService.leaveEvent(eventId, 'user1');
      
      const user2Status = await eventService.getParticipantStatus(eventId, 'user2');
      expect(user2Status.data.status).toBe('going');
    });
  });

  describe('Event Memories and Media', () => {
    it('should upload and manage event photos', async () => {
      const { eventService } = require('@/features/events/services/eventService');

      const eventId = 'test-event-1';
      const userId = 'photographer1';
      const mockImageData = new Uint8Array([255, 216, 255]); // JPEG header

      const uploadResult = await eventService.uploadEventPhoto(
        eventId,
        userId,
        mockImageData,
        {
          caption: 'Great moment from the event!',
          location: 'Main stage',
          tags: ['#music', '#festival']
        }
      );

      expect(uploadResult.error).toBeNull();
      expect(uploadResult.data).toMatchObject({
        event_id: eventId,
        user_id: userId,
        caption: 'Great moment from the event!',
        content_type: 'image'
      });
    });

    it('should create and manage photo albums', async () => {
      const { eventService } = require('@/features/events/services/eventService');

      const eventId = 'test-event-1';
      const albumData = {
        title: 'Festival Highlights',
        description: 'Best moments from the music festival',
        is_public: true,
        cover_photo_id: 'photo-123'
      };

      const albumResult = await eventService.createPhotoAlbum(eventId, 'user1', albumData);

      expect(albumResult.error).toBeNull();
      expect(albumResult.data.title).toBe('Festival Highlights');

      // Add photos to album
      const photoIds = ['photo-1', 'photo-2', 'photo-3'];
      const addPhotosResult = await eventService.addPhotosToAlbum(
        albumResult.data.id,
        photoIds
      );

      expect(addPhotosResult.error).toBeNull();
      expect(addPhotosResult.data.photos_added).toBe(3);
    });

    it('should generate event memory highlights', async () => {
      const { eventService } = require('@/features/events/services/eventService');

      const eventId = 'completed-event-1';

      const highlightsResult = await eventService.generateEventHighlights(eventId);

      expect(highlightsResult.error).toBeNull();
      expect(highlightsResult.data).toMatchObject({
        total_photos: expect.any(Number),
        total_videos: expect.any(Number),
        top_moments: expect.any(Array),
        participant_stats: expect.any(Object),
        engagement_stats: expect.any(Object)
      });

      expect(highlightsResult.data.top_moments.length).toBeGreaterThan(0);
    });
  });

  describe('Event Communication', () => {
    it('should send event announcements to all participants', async () => {
      const { eventService } = require('@/features/events/services/eventService');

      const eventId = 'test-event-1';
      const announcementData = {
        title: 'Weather Update',
        message: 'Event moved indoors due to rain forecast',
        priority: 'high',
        send_push_notification: true,
        send_email: true
      };

      const result = await eventService.sendEventAnnouncement(
        eventId,
        'host1',
        announcementData
      );

      expect(result.error).toBeNull();
      expect(result.data).toMatchObject({
        recipients_count: expect.any(Number),
        channels: expect.arrayContaining(['push', 'email']),
        delivered: true
      });
    });

    it('should manage event chat functionality', async () => {
      const { eventService } = require('@/features/events/services/eventService');

      const eventId = 'test-event-1';

      // Create event chat
      const chatResult = await eventService.createEventChat(eventId, 'host1');
      
      expect(chatResult.error).toBeNull();
      expect(chatResult.data.event_id).toBe(eventId);

      const chatId = chatResult.data.id;

      // Send message to event chat
      const messageResult = await eventService.sendEventChatMessage(
        chatId,
        'user1',
        {
          text: 'Looking forward to this event!',
          type: 'text'
        }
      );

      expect(messageResult.error).toBeNull();
      expect(messageResult.data.text).toBe('Looking forward to this event!');

      // Get chat history
      const historyResult = await eventService.getEventChatHistory(chatId);
      
      expect(historyResult.error).toBeNull();
      expect(historyResult.data.length).toBeGreaterThan(0);
    });
  });

  describe('Event Analytics and Reporting', () => {
    it('should track event engagement metrics', async () => {
      const { eventService } = require('@/features/events/services/eventService');

      const eventId = 'analytics-event-1';

      const metricsResult = await eventService.getEventAnalytics(eventId, 'host1');

      expect(metricsResult.error).toBeNull();
      expect(metricsResult.data).toMatchObject({
        views: expect.any(Number),
        rsvp_counts: {
          going: expect.any(Number),
          maybe: expect.any(Number),
          not_going: expect.any(Number)
        },
        engagement: {
          shares: expect.any(Number),
          comments: expect.any(Number),
          photos_uploaded: expect.any(Number)
        },
        demographics: expect.any(Object),
        conversion_funnel: expect.any(Object)
      });
    });

    it('should generate event success report', async () => {
      const { eventService } = require('@/features/events/services/eventService');

      const eventId = 'completed-event-1';

      const reportResult = await eventService.generateEventReport(eventId, 'host1');

      expect(reportResult.error).toBeNull();
      expect(reportResult.data).toMatchObject({
        event_summary: expect.any(Object),
        attendance: {
          registered: expect.any(Number),
          showed_up: expect.any(Number),
          no_shows: expect.any(Number)
        },
        feedback: {
          average_rating: expect.any(Number),
          total_reviews: expect.any(Number),
          sentiment_analysis: expect.any(Object)
        },
        financial: {
          revenue: expect.any(Number),
          expenses: expect.any(Number),
          profit: expect.any(Number)
        },
        recommendations: expect.any(Array)
      });
    });
  });

  describe('Event Templates and Recurring Events', () => {
    it('should create event templates for reuse', async () => {
      const { eventService } = require('@/features/events/services/eventService');

      const templateData = {
        name: 'Monthly Volleyball Tournament',
        description: 'Template for monthly volleyball tournaments',
        default_capacity: 32,
        default_duration: 4, // hours
        default_cost: 25.00,
        required_items: ['volleyball', 'net', 'referee'],
        default_tags: ['sports', 'volleyball', 'tournament'],
        venue_requirements: ['outdoor', 'sand_court', 'parking']
      };

      const templateResult = await eventService.createEventTemplate('host1', templateData);

      expect(templateResult.error).toBeNull();
      expect(templateResult.data.name).toBe('Monthly Volleyball Tournament');

      // Create event from template
      const eventFromTemplateResult = await eventService.createEventFromTemplate(
        templateResult.data.id,
        {
          date: '2024-07-15T14:00:00.000Z',
          location: 'Santa Monica Beach'
        }
      );

      expect(eventFromTemplateResult.error).toBeNull();
      expect(eventFromTemplateResult.data.capacity).toBe(32);
      expect(eventFromTemplateResult.data.cost_per_person).toBe(25.00);
    });

    it('should handle recurring event series', async () => {
      const { eventService } = require('@/features/events/services/eventService');

      const recurringData = {
        title: 'Weekly Book Club',
        description: 'Weekly discussion of current book',
        location: 'Central Library',
        start_date: '2024-06-01T18:00:00.000Z',
        end_date: '2024-12-31T18:00:00.000Z',
        recurrence: {
          pattern: 'weekly',
          interval: 1,
          days_of_week: ['saturday'],
          end_after: 26 // 6 months
        }
      };

      const seriesResult = await eventService.createRecurringEventSeries(
        'host1',
        recurringData
      );

      expect(seriesResult.error).toBeNull();
      expect(seriesResult.data.events_created).toBe(26);
      expect(seriesResult.data.series_id).toBeDefined();

      // Update entire series
      const updateSeriesResult = await eventService.updateEventSeries(
        seriesResult.data.series_id,
        { location: 'New Library Branch' }
      );

      expect(updateSeriesResult.error).toBeNull();
      expect(updateSeriesResult.data.events_updated).toBe(26);
    });
  });

  describe('Event Moderation and Safety', () => {
    it('should handle event reports and moderation', async () => {
      const { eventService } = require('@/features/events/services/eventService');

      const eventId = 'reported-event-1';
      const reportData = {
        reason: 'inappropriate_content',
        description: 'Event contains offensive language in description',
        evidence_urls: ['screenshot1.jpg', 'screenshot2.jpg']
      };

      const reportResult = await eventService.reportEvent(
        eventId,
        'reporter1',
        reportData
      );

      expect(reportResult.error).toBeNull();
      expect(reportResult.data.status).toBe('pending_review');

      // Moderate event
      const moderationResult = await eventService.moderateEvent(
        eventId,
        'moderator1',
        {
          action: 'hide',
          reason: 'Violates community guidelines',
          notify_creator: true
        }
      );

      expect(moderationResult.error).toBeNull();
      expect(moderationResult.data.visibility).toBe('hidden');
    });

    it('should implement safety features for events', async () => {
      const { eventService } = require('@/features/events/services/eventService');

      const eventId = 'safety-event-1';

      // Add safety checklist
      const safetyResult = await eventService.addSafetyFeatures(eventId, {
        emergency_contact: '+1-555-0911',
        safety_guidelines: [
          'Stay hydrated',
          'Follow venue rules',
          'Report any concerns to organizers'
        ],
        covid_requirements: {
          vaccination_required: false,
          mask_required: false,
          capacity_reduced: true
        },
        accessibility: {
          wheelchair_accessible: true,
          sign_language_interpreter: false,
          audio_assistance: true
        }
      });

      expect(safetyResult.error).toBeNull();
      expect(safetyResult.data.safety_score).toBeGreaterThan(0);
    });
  });
});