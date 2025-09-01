import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ProfileScreen } from '../screens/ProfileScreen';
import { supabase } from '@/shared/lib/supabase/client';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dependencies
jest.mock('@/shared/lib/supabase/client');
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

const mockRoute = {
  params: {},
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        {component}
      </NavigationContainer>
    </QueryClientProvider>
  );
};

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Supabase auth
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
          },
        },
      },
      error: null,
    });

    // Mock profile data
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'test-user-id',
          name: 'Test User',
          bio: 'Test bio',
          avatar_url: 'https://example.com/avatar.jpg',
          location: 'Paris, France',
          hobbies: ['coding', 'music'],
          favorite_restaurants: ['Restaurant 1'],
          date_of_birth: '1990-01-01',
        },
        error: null,
      }),
      update: jest.fn().mockReturnThis(),
    });
  });

  it('should render profile screen correctly', async () => {
    const { getByText, queryByText } = renderWithProviders(
      <ProfileScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(getByText('Test User')).toBeTruthy();
      expect(getByText('Test bio')).toBeTruthy();
      expect(getByText('Paris, France')).toBeTruthy();
    });
  });

  it('should handle loading state', () => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
    });

    const { getByTestId } = renderWithProviders(
      <ProfileScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Check for loading indicator
    expect(() => getByTestId('loading-indicator')).not.toThrow();
  });

  it('should handle error state', async () => {
    const errorMessage = 'Failed to load profile';
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { message: errorMessage },
      }),
    });

    const { getByText } = renderWithProviders(
      <ProfileScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(getByText(errorMessage)).toBeTruthy();
    });
  });

  it('should navigate to edit profile', async () => {
    const { getByTestId } = renderWithProviders(
      <ProfileScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      const editButton = getByTestId('edit-profile-button');
      fireEvent.press(editButton);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('EditProfile');
    });
  });

  it('should handle logout', async () => {
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

    const { getByTestId } = renderWithProviders(
      <ProfileScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      const logoutButton = getByTestId('logout-button');
      fireEvent.press(logoutButton);
    });

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Auth');
    });
  });

  it('should display hobbies correctly', async () => {
    const { getByText } = renderWithProviders(
      <ProfileScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(getByText('coding')).toBeTruthy();
      expect(getByText('music')).toBeTruthy();
    });
  });

  it('should handle profile picture update', async () => {
    const newAvatarUrl = 'https://example.com/new-avatar.jpg';
    
    (supabase.storage.from as jest.Mock).mockReturnValue({
      upload: jest.fn().mockResolvedValue({
        data: { path: 'avatars/new-avatar.jpg' },
        error: null,
      }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: newAvatarUrl },
      }),
    });

    const { getByTestId } = renderWithProviders(
      <ProfileScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      const avatarButton = getByTestId('avatar-button');
      fireEvent.press(avatarButton);
    });

    // Verify upload was initiated
    await waitFor(() => {
      expect(supabase.storage.from).toHaveBeenCalledWith('avatars');
    });
  });
});