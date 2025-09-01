/**
 * @file Stories Functionality Tests
 * 
 * Comprehensive tests for story creation, viewing, and management features
 */

import { renderHook, act } from '@testing-library/react';
import { useStories, useCreateStory } from '../hooks/useStories';

// Mock external dependencies
jest.mock('@/shared/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    })),
    removeChannel: jest.fn(),
  },
}));

import { supabase } from '@/shared/lib/supabase/client';

describe('Stories System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useStories Hook', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useStories());

      expect(result.current.userStories).toEqual([]);
      expect(result.current.myStories).toEqual([]);
      expect(result.current.highlights).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it('should fetch stories on mount', async () => {
      const mockUser = { id: 'test-user-id' };
      const mockStories = [
        {
          id: 'story1',
          user_id: 'user1',
          media_url: 'https://example.com/story1.jpg',
          type: 'photo',
          views: [],
          created_at: '2024-01-01T10:00:00Z',
          expires_at: '2024-01-02T10:00:00Z',
          user: {
            id: 'user1',
            username: 'testuser',
            full_name: 'Test User',
            avatar_url: 'https://example.com/avatar.jpg',
          },
        },
      ];

      // Mock auth.getUser
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock stories fetch
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          gt: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockStories,
              error: null,
            }),
          }),
        }),
      }).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useStories());

      await act(async () => {
        // Wait for the effect to complete
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.userStories).toHaveLength(1);
      expect(result.current.loading).toBe(false);
    });

    it('should handle story fetching errors', async () => {
      // Mock auth.getUser
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      // Mock stories fetch error
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          gt: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useStories());

      await act(async () => {
        // Wait for the effect to complete
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe('Database error');
      expect(result.current.loading).toBe(false);
    });

    it('should mark story as viewed', async () => {
      const mockUser = { id: 'test-user-id' };
      const mockStory = {
        id: 'story1',
        views: ['other-user'],
      };

      // Mock auth.getUser
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock initial stories fetch (empty)
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          gt: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useStories());
      
      await act(async () => {
        // Wait for initial fetch
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Mock get story views and update
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockStory,
              error: null,
            }),
          }),
        }),
      }).mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      await act(async () => {
        await result.current.markAsViewed('story1');
      });

      expect(supabase.from).toHaveBeenCalledWith('stories');
    });

    it('should delete story', async () => {
      // Mock delete operation
      (supabase.from as jest.Mock).mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
        select: jest.fn().mockReturnValue({
          gt: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      const { result, waitForNextUpdate } = renderHook(() => useStories());
      await waitForNextUpdate();

      await act(async () => {
        await result.current.deleteStory('story1');
      });

      expect(supabase.from).toHaveBeenCalledWith('stories');
    });

    it('should create highlight', async () => {
      const mockUser = { id: 'test-user-id' };
      const mockHighlight = {
        id: 'highlight1',
        user_id: mockUser.id,
        title: 'Test Highlight',
        stories: ['story1', 'story2'],
      };

      // Mock auth.getUser
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock initial fetch
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          gt: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      const { result, waitForNextUpdate } = renderHook(() => useStories());
      await waitForNextUpdate();

      // Mock highlight creation
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockHighlight,
              error: null,
            }),
          }),
        }),
      });

      await act(async () => {
        await result.current.createHighlight('Test Highlight', ['story1', 'story2']);
      });

      expect(supabase.from).toHaveBeenCalledWith('story_highlights');
    });
  });

  describe('useCreateStory Hook', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useCreateStory());

      expect(result.current.uploading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.createStory).toBe('function');
    });

    it('should create story successfully', async () => {
      const mockUser = { id: 'test-user-id' };
      const mockStoryData = {
        mediaUrl: 'https://example.com/story.jpg',
        mediaType: 'image',
        caption: 'Test story',
        eventId: 'event1',
      };
      const mockCreatedStory = {
        id: 'story1',
        user_id: mockUser.id,
        ...mockStoryData,
      };

      // Mock auth.getUser
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock story creation
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockCreatedStory,
              error: null,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useCreateStory());

      let createdStory;
      await act(async () => {
        createdStory = await result.current.createStory(mockStoryData);
      });

      expect(createdStory).toEqual(mockCreatedStory);
      expect(result.current.uploading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle creation errors', async () => {
      const mockUser = { id: 'test-user-id' };
      const mockStoryData = {
        mediaUrl: 'https://example.com/story.jpg',
        mediaType: 'image',
        caption: 'Test story',
      };

      // Mock auth.getUser
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock story creation error
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Upload failed' },
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useCreateStory());

      await act(async () => {
        try {
          await result.current.createStory(mockStoryData);
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      expect(result.current.error).toBe('Upload failed');
      expect(result.current.uploading).toBe(false);
    });

    it('should handle unauthenticated user', async () => {
      // Mock auth.getUser returning no user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { result } = renderHook(() => useCreateStory());

      await act(async () => {
        try {
          await result.current.createStory({
            mediaUrl: 'test.jpg',
            mediaType: 'image',
          });
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      expect(result.current.error).toBe('Not authenticated');
    });
  });

  describe('Story Data Validation', () => {
    it('should validate story creation data', () => {
      const validateStoryData = (data: any) => {
        const errors: string[] = [];

        if (!data.mediaUrl || typeof data.mediaUrl !== 'string') {
          errors.push('Media URL is required');
        }

        if (!data.mediaType || !['image', 'video'].includes(data.mediaType)) {
          errors.push('Valid media type is required');
        }

        if (data.caption && data.caption.length > 500) {
          errors.push('Caption must be 500 characters or less');
        }

        if (data.mentions && !Array.isArray(data.mentions)) {
          errors.push('Mentions must be an array');
        }

        if (data.stickers && !Array.isArray(data.stickers)) {
          errors.push('Stickers must be an array');
        }

        return { isValid: errors.length === 0, errors };
      };

      // Valid data
      const validData = {
        mediaUrl: 'https://example.com/story.jpg',
        mediaType: 'image',
        caption: 'Test story',
        mentions: ['user1', 'user2'],
        stickers: [],
      };

      const validResult = validateStoryData(validData);
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors.length).toBe(0);

      // Invalid data
      const invalidData = {
        mediaType: 'invalid',
        caption: 'a'.repeat(501), // Too long
        mentions: 'not-array',
      };

      const invalidResult = validateStoryData(invalidData);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Story Expiration', () => {
    it('should handle story expiration correctly', () => {
      const now = new Date();
      const expired = new Date(now.getTime() - 25 * 60 * 60 * 1000); // 25 hours ago
      const valid = new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1 hour from now

      const isExpired = (expiresAt: Date) => {
        return expiresAt <= now;
      };

      expect(isExpired(expired)).toBe(true);
      expect(isExpired(valid)).toBe(false);
    });
  });

  describe('Story Permissions', () => {
    it('should check story owner permissions', () => {
      const checkStoryPermissions = (userId: string, storyOwnerId: string) => {
        return {
          canDelete: userId === storyOwnerId,
          canEdit: userId === storyOwnerId,
          canView: true, // All stories are viewable for now
        };
      };

      // Test owner permissions
      const ownerPermissions = checkStoryPermissions('user1', 'user1');
      expect(ownerPermissions.canDelete).toBe(true);
      expect(ownerPermissions.canEdit).toBe(true);
      expect(ownerPermissions.canView).toBe(true);

      // Test non-owner permissions
      const nonOwnerPermissions = checkStoryPermissions('user2', 'user1');
      expect(nonOwnerPermissions.canDelete).toBe(false);
      expect(nonOwnerPermissions.canEdit).toBe(false);
      expect(nonOwnerPermissions.canView).toBe(true);
    });
  });
});