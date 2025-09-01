import { renderHook, waitFor } from '@testing-library/react-native';
import { useProfile, UserProfile } from '../useProfile';
import { useProfileContext } from '@/shared/providers/ProfileProvider';
import { useProfileCompat } from '../useProfileCompat';

// Mock dependencies
jest.mock('@/shared/providers/ProfileProvider');
jest.mock('../useProfileCompat');

const mockUseProfileContext = useProfileContext as jest.MockedFunction<typeof useProfileContext>;
const mockUseProfileCompat = useProfileCompat as jest.MockedFunction<typeof useProfileCompat>;

describe('useProfile', () => {
  const mockProfile: UserProfile = {
    id: 'user-123',
    full_name: 'Test User',
    display_name: 'TestUser',
    username: 'testuser',
    avatar_url: 'https://example.com/avatar.jpg',
    cover_url: 'https://example.com/cover.jpg',
    bio: 'Test bio',
    location: 'Test Location',
    email: 'test@example.com',
    phone_number: '+33612345678',
    birth_date: '1990-01-01',
    interests: ['music', 'sports'],
    hobbies: ['reading', 'gaming'],
    jam_preference: 'pop',
    restaurant_preference: 'italian',
    path: 'technology',
    settings: {
      notifications: {
        event_invites: true,
        friend_requests: true,
        event_reminders: true,
      },
      privacy: {
        who_can_invite: 'friends',
        hide_from_search: false,
      },
    },
  };

  const mockProfileContextResult = {
    profile: mockProfile,
    loading: false,
    error: null,
    updateProfile: jest.fn(),
    refreshProfile: jest.fn(),
    uploadAvatar: jest.fn(),
  };

  const mockCompatResult = {
    profile: mockProfile,
    loading: false,
    error: null,
    updateProfile: jest.fn(),
    refreshProfile: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default to successful ProfileProvider usage
    mockUseProfileContext.mockReturnValue(mockProfileContextResult);
    mockUseProfileCompat.mockReturnValue(mockCompatResult);
  });

  describe('ProfileProvider integration', () => {
    it('should use ProfileProvider when available', () => {
      const { result } = renderHook(() => useProfile());

      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.updateProfile).toBe(mockProfileContextResult.updateProfile);
      expect(result.current.refreshProfile).toBe(mockProfileContextResult.refreshProfile);
      
      expect(mockUseProfileContext).toHaveBeenCalled();
    });

    it('should provide updateProfile function', () => {
      const { result } = renderHook(() => useProfile());

      expect(result.current.updateProfile).toBeDefined();
      expect(typeof result.current.updateProfile).toBe('function');
    });

    it('should provide refreshProfile function', () => {
      const { result } = renderHook(() => useProfile());

      expect(result.current.refreshProfile).toBeDefined();
      expect(typeof result.current.refreshProfile).toBe('function');
    });

    it('should provide uploadAvatar function when available', () => {
      const { result } = renderHook(() => useProfile());

      expect(result.current.uploadAvatar).toBeDefined();
      expect(typeof result.current.uploadAvatar).toBe('function');
    });

    it('should handle loading state from ProfileProvider', () => {
      mockUseProfileContext.mockReturnValue({
        ...mockProfileContextResult,
        loading: true,
      });

      const { result } = renderHook(() => useProfile());

      expect(result.current.loading).toBe(true);
      expect(result.current.profile).toEqual(mockProfile);
    });

    it('should handle error state from ProfileProvider', () => {
      const mockError = new Error('Profile fetch failed');
      mockUseProfileContext.mockReturnValue({
        ...mockProfileContextResult,
        error: mockError,
      });

      const { result } = renderHook(() => useProfile());

      expect(result.current.error).toBe(mockError);
      expect(result.current.profile).toEqual(mockProfile);
    });

    it('should handle null profile from ProfileProvider', () => {
      mockUseProfileContext.mockReturnValue({
        ...mockProfileContextResult,
        profile: null,
      });

      const { result } = renderHook(() => useProfile());

      expect(result.current.profile).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });

  describe('compatibility layer fallback', () => {
    it('should fall back to compatibility layer when ProfileProvider throws', () => {
      mockUseProfileContext.mockImplementation(() => {
        throw new Error('Provider not found');
      });

      // Suppress console warnings during test
      const originalWarn = console.warn;
      console.warn = jest.fn();

      const { result } = renderHook(() => useProfile());

      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.loading).toBe(false);
      expect(result.current.updateProfile).toBe(mockCompatResult.updateProfile);
      expect(result.current.refreshProfile).toBe(mockCompatResult.refreshProfile);
      
      expect(console.warn).toHaveBeenCalledWith(
        'useProfile called outside ProfileProvider, using compatibility layer'
      );
      expect(mockUseProfileCompat).toHaveBeenCalled();

      // Restore console.warn
      console.warn = originalWarn;
    });

    it('should use compatibility layer for missing ProfileProvider context', () => {
      mockUseProfileContext.mockImplementation(() => {
        throw new Error('useContext must be used within a Provider');
      });

      const originalWarn = console.warn;
      console.warn = jest.fn();

      const { result } = renderHook(() => useProfile());

      expect(result.current.profile).toEqual(mockProfile);
      expect(mockUseProfileCompat).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();

      console.warn = originalWarn;
    });

    it('should handle compatibility layer loading state', () => {
      mockUseProfileContext.mockImplementation(() => {
        throw new Error('Provider not found');
      });

      mockUseProfileCompat.mockReturnValue({
        ...mockCompatResult,
        loading: true,
      });

      const originalWarn = console.warn;
      console.warn = jest.fn();

      const { result } = renderHook(() => useProfile());

      expect(result.current.loading).toBe(true);
      expect(result.current.profile).toEqual(mockProfile);

      console.warn = originalWarn;
    });

    it('should handle compatibility layer error state', () => {
      mockUseProfileContext.mockImplementation(() => {
        throw new Error('Provider not found');
      });

      const compatError = new Error('Compat layer error');
      mockUseProfileCompat.mockReturnValue({
        ...mockCompatResult,
        error: compatError,
      });

      const originalWarn = console.warn;
      console.warn = jest.fn();

      const { result } = renderHook(() => useProfile());

      expect(result.current.error).toBe(compatError);

      console.warn = originalWarn;
    });
  });

  describe('profile data structure', () => {
    it('should handle complete profile data', () => {
      const { result } = renderHook(() => useProfile());

      const profile = result.current.profile;
      expect(profile).toBeDefined();
      expect(profile?.id).toBe('user-123');
      expect(profile?.full_name).toBe('Test User');
      expect(profile?.display_name).toBe('TestUser');
      expect(profile?.username).toBe('testuser');
      expect(profile?.avatar_url).toBe('https://example.com/avatar.jpg');
      expect(profile?.bio).toBe('Test bio');
      expect(profile?.location).toBe('Test Location');
      expect(profile?.interests).toEqual(['music', 'sports']);
      expect(profile?.hobbies).toEqual(['reading', 'gaming']);
    });

    it('should handle minimal profile data', () => {
      const minimalProfile = {
        id: 'user-456',
        full_name: 'Minimal User',
      };

      mockUseProfileContext.mockReturnValue({
        ...mockProfileContextResult,
        profile: minimalProfile,
      });

      const { result } = renderHook(() => useProfile());

      expect(result.current.profile).toEqual(minimalProfile);
      expect(result.current.profile?.id).toBe('user-456');
      expect(result.current.profile?.full_name).toBe('Minimal User');
    });

    it('should handle profile with settings', () => {
      const { result } = renderHook(() => useProfile());

      const profile = result.current.profile;
      expect(profile?.settings).toBeDefined();
      expect(profile?.settings?.notifications?.event_invites).toBe(true);
      expect(profile?.settings?.privacy?.who_can_invite).toBe('friends');
      expect(profile?.settings?.privacy?.hide_from_search).toBe(false);
    });

    it('should handle profile without settings', () => {
      const profileWithoutSettings = {
        ...mockProfile,
        settings: undefined,
      };

      mockUseProfileContext.mockReturnValue({
        ...mockProfileContextResult,
        profile: profileWithoutSettings,
      });

      const { result } = renderHook(() => useProfile());

      expect(result.current.profile?.settings).toBeUndefined();
    });
  });

  describe('function calls and updates', () => {
    it('should call updateProfile function', async () => {
      const { result } = renderHook(() => useProfile());

      const updates = { full_name: 'Updated Name' };
      await result.current.updateProfile(updates);

      expect(mockProfileContextResult.updateProfile).toHaveBeenCalledWith(updates);
    });

    it('should call refreshProfile function', async () => {
      const { result } = renderHook(() => useProfile());

      await result.current.refreshProfile();

      expect(mockProfileContextResult.refreshProfile).toHaveBeenCalled();
    });

    it('should call uploadAvatar function when available', async () => {
      const { result } = renderHook(() => useProfile());

      const avatarUri = 'file:///path/to/avatar.jpg';
      if (result.current.uploadAvatar) {
        await result.current.uploadAvatar(avatarUri);
        expect(mockProfileContextResult.uploadAvatar).toHaveBeenCalledWith(avatarUri);
      }
    });

    it('should handle updateProfile errors gracefully', async () => {
      const updateError = new Error('Update failed');
      mockProfileContextResult.updateProfile.mockRejectedValue(updateError);

      const { result } = renderHook(() => useProfile());

      await expect(result.current.updateProfile({})).rejects.toThrow('Update failed');
    });

    it('should handle refreshProfile errors gracefully', async () => {
      const refreshError = new Error('Refresh failed');
      mockProfileContextResult.refreshProfile.mockRejectedValue(refreshError);

      const { result } = renderHook(() => useProfile());

      await expect(result.current.refreshProfile()).rejects.toThrow('Refresh failed');
    });
  });

  describe('reactive updates', () => {
    it('should reflect profile changes reactively', async () => {
      const { result, rerender } = renderHook(() => useProfile());

      expect(result.current.profile?.full_name).toBe('Test User');

      // Simulate profile update
      const updatedProfile = { ...mockProfile, full_name: 'Updated User' };
      mockUseProfileContext.mockReturnValue({
        ...mockProfileContextResult,
        profile: updatedProfile,
      });

      rerender();

      expect(result.current.profile?.full_name).toBe('Updated User');
    });

    it('should reflect loading state changes', async () => {
      const { result, rerender } = renderHook(() => useProfile());

      expect(result.current.loading).toBe(false);

      // Simulate loading state
      mockUseProfileContext.mockReturnValue({
        ...mockProfileContextResult,
        loading: true,
      });

      rerender();

      expect(result.current.loading).toBe(true);
    });

    it('should reflect error state changes', async () => {
      const { result, rerender } = renderHook(() => useProfile());

      expect(result.current.error).toBeNull();

      // Simulate error state
      const error = new Error('Network error');
      mockUseProfileContext.mockReturnValue({
        ...mockProfileContextResult,
        error,
      });

      rerender();

      expect(result.current.error).toBe(error);
    });
  });

  describe('concurrent hook usage', () => {
    it('should handle multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useProfile());
      const { result: result2 } = renderHook(() => useProfile());

      expect(result1.current.profile).toEqual(result2.current.profile);
      expect(result1.current.loading).toBe(result2.current.loading);
      expect(result1.current.error).toBe(result2.current.error);
    });

    it('should maintain consistency across instances', async () => {
      const { result: result1 } = renderHook(() => useProfile());
      const { result: result2 } = renderHook(() => useProfile());

      expect(mockUseProfileContext).toHaveBeenCalledTimes(2);
      
      expect(result1.current.profile?.id).toBe(result2.current.profile?.id);
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle undefined profile gracefully', () => {
      mockUseProfileContext.mockReturnValue({
        ...mockProfileContextResult,
        profile: undefined as any,
      });

      const { result } = renderHook(() => useProfile());

      expect(result.current.profile).toBeUndefined();
      expect(result.current.loading).toBe(false);
    });

    it('should handle malformed profile data', () => {
      const malformedProfile = {
        // Missing required id field
        full_name: 'Test User',
        // Invalid email format (should be handled by the provider)
        email: 'not-an-email',
      } as any;

      mockUseProfileContext.mockReturnValue({
        ...mockProfileContextResult,
        profile: malformedProfile,
      });

      const { result } = renderHook(() => useProfile());

      expect(result.current.profile).toEqual(malformedProfile);
      // Hook should not crash with malformed data
    });

    it('should handle provider context changing frequently', () => {
      const { result, rerender } = renderHook(() => useProfile());

      // Rapidly change between provider and compat mode
      for (let i = 0; i < 5; i++) {
        if (i % 2 === 0) {
          mockUseProfileContext.mockReturnValue(mockProfileContextResult);
        } else {
          mockUseProfileContext.mockImplementation(() => {
            throw new Error('Provider not found');
          });
        }
        rerender();
      }

      // Should handle the rapid changes gracefully
      expect(result.current.profile).toBeDefined();
    });

    it('should handle both hooks throwing errors', () => {
      mockUseProfileContext.mockImplementation(() => {
        throw new Error('ProfileProvider error');
      });

      mockUseProfileCompat.mockImplementation(() => {
        throw new Error('Compat layer error');
      });

      const originalWarn = console.warn;
      const originalError = console.error;
      console.warn = jest.fn();
      console.error = jest.fn();

      expect(() => renderHook(() => useProfile())).toThrow('Compat layer error');

      console.warn = originalWarn;
      console.error = originalError;
    });

    it('should maintain function reference stability', () => {
      const { result, rerender } = renderHook(() => useProfile());

      const firstUpdateProfile = result.current.updateProfile;
      const firstRefreshProfile = result.current.refreshProfile;

      rerender();

      expect(result.current.updateProfile).toBe(firstUpdateProfile);
      expect(result.current.refreshProfile).toBe(firstRefreshProfile);
    });

    it('should handle empty profile arrays correctly', () => {
      const profileWithEmptyArrays = {
        ...mockProfile,
        interests: [],
        hobbies: [],
      };

      mockUseProfileContext.mockReturnValue({
        ...mockProfileContextResult,
        profile: profileWithEmptyArrays,
      });

      const { result } = renderHook(() => useProfile());

      expect(result.current.profile?.interests).toEqual([]);
      expect(result.current.profile?.hobbies).toEqual([]);
    });

    it('should handle profile with null values', () => {
      const profileWithNulls = {
        ...mockProfile,
        avatar_url: null,
        cover_url: null,
        bio: null,
      };

      mockUseProfileContext.mockReturnValue({
        ...mockProfileContextResult,
        profile: profileWithNulls,
      });

      const { result } = renderHook(() => useProfile());

      expect(result.current.profile?.avatar_url).toBeNull();
      expect(result.current.profile?.cover_url).toBeNull();
      expect(result.current.profile?.bio).toBeNull();
    });
  });

  describe('performance considerations', () => {
    it('should not cause unnecessary re-renders', () => {
      const { result, rerender } = renderHook(() => useProfile());

      const firstResult = result.current;
      
      // Rerender with same data
      rerender();

      // References should be stable
      expect(result.current.updateProfile).toBe(firstResult.updateProfile);
      expect(result.current.refreshProfile).toBe(firstResult.refreshProfile);
    });

    it('should handle rapid profile updates efficiently', () => {
      const { rerender } = renderHook(() => useProfile());

      const profiles = Array.from({ length: 100 }, (_, i) => ({
        ...mockProfile,
        id: `user-${i}`,
        full_name: `User ${i}`,
      }));

      profiles.forEach(profile => {
        mockUseProfileContext.mockReturnValue({
          ...mockProfileContextResult,
          profile,
        });
        rerender();
      });

      // Should complete without performance issues
      expect(mockUseProfileContext).toHaveBeenCalled();
    });
  });
});