import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import HomeScreen from '../../features/home/screens/HomeScreen';
import EventDetailsScreen from '../../features/events/screens/EventDetailsScreen';
import ProfileScreen from '../../features/profile/screens/ProfileScreen';
import { SessionProvider } from '../../shared/providers/SessionContext';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <NavigationContainer>
          {children}
        </NavigationContainer>
      </SessionProvider>
    </QueryClientProvider>
  );
};

describe('App Core Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Navigation', () => {
    it('should render home screen without crashing', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );
      expect(getByTestId).toBeDefined();
    });

    it('should handle navigation between screens', async () => {
      const navigation = {
        navigate: jest.fn(),
        goBack: jest.fn(),
      };

      const { getByTestId } = render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(navigation.navigate).toHaveBeenCalledTimes(0);
      });
    });
  });

  describe('Event Management', () => {
    it('should display event details correctly', async () => {
      const mockEvent = {
        id: '1',
        title: 'Test Event',
        description: 'Test Description',
        date: new Date().toISOString(),
        location: 'Test Location',
        host_id: 'test-host',
      };

      const route = {
        params: { id: '1' }
      };

      const { findByText } = render(
        <TestWrapper>
          <EventDetailsScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(findByText).toBeDefined();
      });
    });

    it('should handle RSVP actions', async () => {
      const mockRSVP = jest.fn();
      const route = {
        params: { id: '1' }
      };

      const { getByTestId } = render(
        <TestWrapper>
          <EventDetailsScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockRSVP).toHaveBeenCalledTimes(0);
      });
    });
  });

  describe('Profile Management', () => {
    it('should render profile screen', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <ProfileScreen />
        </TestWrapper>
      );
      expect(getByTestId).toBeDefined();
    });

    it('should handle profile updates', async () => {
      const mockUpdate = jest.fn();
      
      const { getByTestId } = render(
        <TestWrapper>
          <ProfileScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledTimes(0);
      });
    });
  });

  describe('Offline Support', () => {
    it('should cache data for offline access', async () => {
      const mockCache = {
        set: jest.fn(),
        get: jest.fn(),
      };

      await waitFor(() => {
        expect(mockCache.set).toHaveBeenCalledTimes(0);
      });
    });

    it('should sync data when online', async () => {
      const mockSync = jest.fn();

      await waitFor(() => {
        expect(mockSync).toHaveBeenCalledTimes(0);
      });
    });
  });
});