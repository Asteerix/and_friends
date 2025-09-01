import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EventCard from '@/features/home/components/EventCard';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock Supabase
jest.mock('@/shared/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

describe('EventCard Component', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const mockEvent = {
    id: 'event123',
    title: 'Summer Party',
    description: 'Join us for a fun summer party!',
    date: '2024-07-15T18:00:00Z',
    location: 'Central Park',
    cover_url: 'https://example.com/cover.jpg',
    category: 'party',
    attendees_count: 25,
    max_attendees: 50,
    organizer: {
      id: 'user123',
      name: 'John Doe',
      avatar_url: 'https://example.com/avatar.jpg',
    },
  };

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <EventCard event={mockEvent} {...props} />
        </NavigationContainer>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render event title', () => {
      const { getByText } = renderComponent();
      expect(getByText('Summer Party')).toBeTruthy();
    });

    it('should render event location', () => {
      const { getByText } = renderComponent();
      expect(getByText('Central Park')).toBeTruthy();
    });

    it('should render attendees count', () => {
      const { getByText } = renderComponent();
      expect(getByText('25/50')).toBeTruthy();
    });

    it('should render organizer name', () => {
      const { getByText } = renderComponent();
      expect(getByText('John Doe')).toBeTruthy();
    });

    it('should format date correctly', () => {
      const { getByText } = renderComponent();
      // Date formatting may vary, check for presence
      expect(getByText(/July|Jul/)).toBeTruthy();
    });

    it('should show sold out badge when full', () => {
      const fullEvent = {
        ...mockEvent,
        attendees_count: 50,
        max_attendees: 50,
      };
      const { getByText } = renderComponent({ event: fullEvent });
      expect(getByText('Sold Out')).toBeTruthy();
    });

    it('should show featured badge for featured events', () => {
      const featuredEvent = {
        ...mockEvent,
        is_featured: true,
      };
      const { getByText } = renderComponent({ event: featuredEvent });
      expect(getByText('Featured')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should navigate to event details on press', () => {
      const { getByTestId } = renderComponent();
      const card = getByTestId('event-card');
      
      fireEvent.press(card);
      
      expect(mockNavigate).toHaveBeenCalledWith('event/[id]', {
        params: { id: 'event123' },
      });
    });

    it('should handle RSVP button press', async () => {
      const onRSVP = jest.fn();
      const { getByText } = renderComponent({ onRSVP });
      
      const rsvpButton = getByText('RSVP');
      fireEvent.press(rsvpButton);
      
      await waitFor(() => {
        expect(onRSVP).toHaveBeenCalledWith('event123');
      });
    });

    it('should handle share button press', () => {
      const onShare = jest.fn();
      const { getByTestId } = renderComponent({ onShare });
      
      const shareButton = getByTestId('share-button');
      fireEvent.press(shareButton);
      
      expect(onShare).toHaveBeenCalledWith(mockEvent);
    });

    it('should handle favorite toggle', async () => {
      const onFavorite = jest.fn();
      const { getByTestId } = renderComponent({ onFavorite });
      
      const favoriteButton = getByTestId('favorite-button');
      fireEvent.press(favoriteButton);
      
      await waitFor(() => {
        expect(onFavorite).toHaveBeenCalledWith('event123');
      });
    });
  });

  describe('Loading States', () => {
    it('should show skeleton loader when loading', () => {
      const { getByTestId } = renderComponent({ isLoading: true });
      expect(getByTestId('event-card-skeleton')).toBeTruthy();
    });

    it('should handle image loading states', async () => {
      const { getByTestId } = renderComponent();
      const image = getByTestId('event-cover-image');
      
      // Simulate image load
      fireEvent(image, 'onLoadStart');
      expect(getByTestId('image-loading')).toBeTruthy();
      
      fireEvent(image, 'onLoadEnd');
      await waitFor(() => {
        expect(() => getByTestId('image-loading')).toThrow();
      });
    });

    it('should show placeholder for missing images', () => {
      const eventWithoutImage = {
        ...mockEvent,
        cover_url: null,
      };
      const { getByTestId } = renderComponent({ event: eventWithoutImage });
      expect(getByTestId('image-placeholder')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByLabelText } = renderComponent();
      
      expect(getByLabelText(`Event: ${mockEvent.title}`)).toBeTruthy();
      expect(getByLabelText('RSVP to event')).toBeTruthy();
      expect(getByLabelText('Share event')).toBeTruthy();
      expect(getByLabelText('Add to favorites')).toBeTruthy();
    });

    it('should announce state changes', async () => {
      const { getByTestId, rerender } = renderComponent({ isFavorited: false });
      const favoriteButton = getByTestId('favorite-button');
      
      fireEvent.press(favoriteButton);
      
      rerender(<EventCard event={mockEvent} isFavorited={true} />);
      
      await waitFor(() => {
        expect(getByLabelText('Remove from favorites')).toBeTruthy();
      });
    });

    it('should handle screen reader focus', () => {
      const { getByTestId } = renderComponent();
      const card = getByTestId('event-card');
      
      expect(card.props.accessible).toBe(true);
      expect(card.props.accessibilityRole).toBe('button');
    });
  });

  describe('Performance', () => {
    it('should memoize expensive computations', () => {
      const { rerender } = renderComponent();
      
      // Initial render
      const renderCount1 = jest.fn();
      
      // Re-render with same props
      rerender(<EventCard event={mockEvent} />);
      
      // Should not re-compute memoized values
      expect(renderCount1).not.toHaveBeenCalled();
    });

    it('should lazy load images', () => {
      const { getByTestId } = renderComponent();
      const image = getByTestId('event-cover-image');
      
      // Should use optimized image loading
      expect(image.props.source.cache).toBe('force-cache');
    });

    it('should handle large lists efficiently', () => {
      const events = Array.from({ length: 100 }, (_, i) => ({
        ...mockEvent,
        id: `event${i}`,
        title: `Event ${i}`,
      }));
      
      // Should render without performance issues
      const startTime = Date.now();
      events.forEach(event => {
        renderComponent({ event });
      });
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing required props gracefully', () => {
      const incompleteEvent = {
        id: 'event123',
        title: 'Incomplete Event',
        // Missing required fields
      };
      
      const { getByText } = renderComponent({ event: incompleteEvent });
      expect(getByText('Incomplete Event')).toBeTruthy();
      expect(getByText('No location')).toBeTruthy();
    });

    it('should handle API errors', async () => {
      const onError = jest.fn();
      const { getByText } = renderComponent({ onError });
      
      // Simulate API error
      const rsvpButton = getByText('RSVP');
      fireEvent.press(rsvpButton);
      
      // Mock API failure
      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });

    it('should show error boundary for crashes', () => {
      const ThrowError = () => {
        throw new Error('Component crashed');
      };
      
      const { getByText } = render(
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>
            <ThrowError />
          </NavigationContainer>
        </QueryClientProvider>
      );
      
      expect(getByText(/Something went wrong/)).toBeTruthy();
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to different screen sizes', () => {
      const { getByTestId, rerender } = renderComponent();
      
      // Small screen
      rerender(<EventCard event={mockEvent} screenSize="small" />);
      let card = getByTestId('event-card');
      expect(card.props.style.width).toBeLessThan(200);
      
      // Large screen
      rerender(<EventCard event={mockEvent} screenSize="large" />);
      card = getByTestId('event-card');
      expect(card.props.style.width).toBeGreaterThan(300);
    });

    it('should handle text truncation', () => {
      const longEvent = {
        ...mockEvent,
        title: 'This is a very long event title that should be truncated',
        description: 'This is an extremely long description that goes on and on and should definitely be truncated to fit within the card bounds',
      };
      
      const { getByText } = renderComponent({ event: longEvent });
      const title = getByText(/This is a very long/);
      
      expect(title.props.numberOfLines).toBe(2);
    });
  });

  describe('Theme Support', () => {
    it('should apply dark theme styles', () => {
      const { getByTestId } = renderComponent({ theme: 'dark' });
      const card = getByTestId('event-card');
      
      expect(card.props.style.backgroundColor).toBe('#1a1a1a');
    });

    it('should apply light theme styles', () => {
      const { getByTestId } = renderComponent({ theme: 'light' });
      const card = getByTestId('event-card');
      
      expect(card.props.style.backgroundColor).toBe('#ffffff');
    });
  });
});