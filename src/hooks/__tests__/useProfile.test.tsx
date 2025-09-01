import { renderHook, waitFor } from '@testing-library/react-native';
import { useProfile } from '../useProfile';
import { supabase } from '@/shared/lib/supabase/client';

jest.mock('@/shared/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
    })),
  },
}));

describe('useProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch user profile successfully', async () => {
    const mockUser = { id: 'test-id', email: 'test@example.com' };
    const mockProfile = {
      id: 'test-id',
      full_name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
    };

    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const fromMock = supabase.from('profiles');
    (fromMock.single as jest.Mock).mockResolvedValue({
      data: mockProfile,
      error: null,
    });

    const { result } = renderHook(() => useProfile());

    await waitFor(() => {
      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.loading).toBe(false);
    });
  });

  it('should handle profile fetch error', async () => {
    const mockUser = { id: 'test-id', email: 'test@example.com' };
    
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const fromMock = supabase.from('profiles');
    (fromMock.single as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Profile not found' },
    });

    const { result } = renderHook(() => useProfile());

    await waitFor(() => {
      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBe('Profile not found');
      expect(result.current.loading).toBe(false);
    });
  });

  it('should update profile successfully', async () => {
    const mockUser = { id: 'test-id', email: 'test@example.com' };
    const mockProfile = {
      id: 'test-id',
      full_name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
    };

    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const fromMock = supabase.from('profiles');
    (fromMock.single as jest.Mock).mockResolvedValue({
      data: mockProfile,
      error: null,
    });

    const { result } = renderHook(() => useProfile());

    await waitFor(() => {
      expect(result.current.profile).toEqual(mockProfile);
    });

    const updatedProfile = { ...mockProfile, full_name: 'Updated User' };
    (fromMock.single as jest.Mock).mockResolvedValue({
      data: updatedProfile,
      error: null,
    });

    await result.current.updateProfile({ full_name: 'Updated User' });

    await waitFor(() => {
      expect(result.current.profile).toEqual(updatedProfile);
    });
  });
});