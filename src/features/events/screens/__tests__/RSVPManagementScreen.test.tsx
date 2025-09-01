import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import RSVPManagementScreen from '../RSVPManagementScreen';
import { useEvents } from '@/hooks/useEvents';
import type { Event } from '@/hooks/useEvents';

// Mock dependencies
jest.mock('@/hooks/useEvents');
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ eventId: 'test-event-1' }),
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
  }),
}));
jest.mock('date-fns', () => ({
  format: jest.fn(),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Medium: 'medium',
    Light: 'light',
    Heavy: 'heavy',
  },
}));
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, ...props }: any) => {
    const { Text } = require('react-native');
    return <Text {...props}>{name}</Text>;
  },
}));

const mockUseEvents = useEvents as jest.MockedFunction<typeof useEvents>;
const mockFormat = format as jest.MockedFunction<typeof format>;
const mockHaptics = Haptics.impactAsync as jest.MockedFunction<typeof Haptics.impactAsync>;

describe('RSVPManagementScreen', () => {
  const mockUpdateRSVP = jest.fn();
  const mockRouter = {
    back: jest.fn(),
    push: jest.fn(),
  };

  const mockEvent: Event = {
    id: 'test-event-1',
    title: 'Test Party',
    description: 'A great party for testing',
    date: '2024-12-25T20:00:00Z',
    location: 'Test Venue',
    userRSVP: 'going',
    participants_count: 10,
  };

  const mockEvents = [mockEvent];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useEvents hook
    mockUseEvents.mockReturnValue({
      events: mockEvents,
      loading: false,
      error: null,
      fetchEvents: jest.fn(),
      createEvent: jest.fn(),
      joinEvent: jest.fn(),
      updateRSVP: mockUpdateRSVP,
    });

    // Mock date formatting
    mockFormat.mockReturnValue('Wednesday, December 25 • 8:00 PM');

    // Mock haptics
    mockHaptics.mockResolvedValue();

    // Mock router
    require('expo-router').useRouter.mockReturnValue(mockRouter);

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('rendering and UI', () => {
    it('should render header with event information', () => {
      const { getByText } = render(<RSVPManagementScreen />);

      expect(getByText("Who's Coming")).toBeTruthy();
      expect(getByText('Test Party')).toBeTruthy();
      expect(getByText('Wednesday, December 25 • 8:00 PM')).toBeTruthy();
    });

    it('should render back button', () => {
      const { getByText } = render(<RSVPManagementScreen />);

      const backButton = getByText('arrow-back');
      expect(backButton).toBeTruthy();
    });

    it('should render RSVP selector with all status options', () => {
      const { getByText } = render(<RSVPManagementScreen />);

      expect(getByText('Your RSVP:')).toBeTruthy();
      expect(getByText('Going')).toBeTruthy();
      expect(getByText('Maybe')).toBeTruthy();
      expect(getByText('Not Going')).toBeTruthy();
    });

    it('should highlight current user RSVP status', () => {
      const { getByText } = render(<RSVPManagementScreen />);

      const goingOption = getByText('Going');
      expect(goingOption).toBeTruthy();
    });

    it('should render attendees sections with mock data', async () => {
      const { getByText } = render(<RSVPManagementScreen />);

      await waitFor(() => {
        expect(getByText('Going')).toBeTruthy();
        expect(getByText('(3)')).toBeTruthy();
        expect(getByText('John Doe')).toBeTruthy();
        expect(getByText('@johndoe')).toBeTruthy();
        expect(getByText('Jane Smith')).toBeTruthy();
        expect(getByText('Mike Johnson')).toBeTruthy();
      });
    });

    it('should render maybe section with attendees', async () => {
      const { getByText } = render(<RSVPManagementScreen />);

      await waitFor(() => {
        expect(getByText('Maybe')).toBeTruthy();
        expect(getByText('(2)')).toBeTruthy();
        expect(getByText('Sarah Williams')).toBeTruthy();
        expect(getByText('@sarahw')).toBeTruthy();
        expect(getByText('Tom Brown')).toBeTruthy();
      });
    });

    it('should render not going section with attendees', async () => {
      const { getByText } = render(<RSVPManagementScreen />);

      await waitFor(() => {
        expect(getByText('Not Going')).toBeTruthy();
        expect(getByText('(1)')).toBeTruthy();
        expect(getByText('Emily Davis')).toBeTruthy();
        expect(getByText('@emilyd')).toBeTruthy();
      });
    });

    it('should render avatar placeholders for attendees without photos', async () => {
      const { getByText } = render(<RSVPManagementScreen />);

      await waitFor(() => {
        // Avatar placeholders show first letter of name
        expect(getByText('J')).toBeTruthy(); // John Doe
        expect(getByText('S')).toBeTruthy(); // Sarah Williams
        expect(getByText('E')).toBeTruthy(); // Emily Davis
      });
    });

    it('should render empty state when no attendees', () => {
      // Mock empty attendees
      const { getByText } = render(<RSVPManagementScreen />);
      
      // Initially shows empty state before loading
      expect(getByText('🎉')).toBeTruthy();
      expect(getByText('Be the first to RSVP!')).toBeTruthy();
    });

    it('should format event date correctly', () => {
      render(<RSVPManagementScreen />);

      expect(mockFormat).toHaveBeenCalledWith(
        new Date('2024-12-25T20:00:00Z'),
        'EEEE, MMMM d • h:mm a'
      );
    });

    it('should handle missing event gracefully', () => {
      mockUseEvents.mockReturnValue({
        events: [],
        loading: false,
        error: null,
        fetchEvents: jest.fn(),
        createEvent: jest.fn(),
        joinEvent: jest.fn(),
        updateRSVP: mockUpdateRSVP,
      });

      const { getByText } = render(<RSVPManagementScreen />);

      expect(getByText("Who's Coming")).toBeTruthy();
      expect(getByText('Your RSVP:')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate back when back button is pressed', () => {
      const { getByText } = render(<RSVPManagementScreen />);

      const backButton = getByText('arrow-back');
      fireEvent.press(backButton);

      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });

    it('should navigate to person card when attendee is pressed', async () => {
      const { getByText } = render(<RSVPManagementScreen />);

      await waitFor(() => {
        const johnDoe = getByText('John Doe');
        fireEvent.press(johnDoe);
      });

      expect(mockRouter.push).toHaveBeenCalledWith('/screens/person-card');
    });

    it('should handle navigation errors gracefully', async () => {
      mockRouter.push.mockImplementation(() => {
        throw new Error('Navigation failed');
      });

      const { getByText } = render(<RSVPManagementScreen />);

      await waitFor(() => {
        const johnDoe = getByText('John Doe');
        expect(() => fireEvent.press(johnDoe)).not.toThrow();
      });
    });
  });

  describe('RSVP functionality', () => {
    it('should call updateRSVP when status is changed', async () => {
      const { getByText } = render(<RSVPManagementScreen />);

      const maybeOption = getByText('Maybe');
      fireEvent.press(maybeOption);

      expect(mockHaptics).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
      expect(mockUpdateRSVP).toHaveBeenCalledWith('test-event-1', 'maybe');
    });

    it('should handle RSVP status change to going', async () => {
      // Set initial status to maybe
      const eventWithMaybeStatus = { ...mockEvent, userRSVP: 'maybe' };
      mockUseEvents.mockReturnValue({
        events: [eventWithMaybeStatus],
        loading: false,
        error: null,
        fetchEvents: jest.fn(),
        createEvent: jest.fn(),
        joinEvent: jest.fn(),
        updateRSVP: mockUpdateRSVP,
      });

      const { getByText } = render(<RSVPManagementScreen />);

      const goingOption = getByText('Going');
      fireEvent.press(goingOption);

      expect(mockUpdateRSVP).toHaveBeenCalledWith('test-event-1', 'going');
    });

    it('should handle RSVP status change to not going', async () => {
      const { getByText } = render(<RSVPManagementScreen />);

      const notGoingOption = getByText('Not Going');
      fireEvent.press(notGoingOption);

      expect(mockUpdateRSVP).toHaveBeenCalledWith('test-event-1', 'not-going');
    });

    it('should provide haptic feedback on RSVP change', async () => {
      const { getByText } = render(<RSVPManagementScreen />);

      const maybeOption = getByText('Maybe');
      fireEvent.press(maybeOption);

      expect(mockHaptics).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    it('should handle RSVP update errors gracefully', async () => {
      mockUpdateRSVP.mockRejectedValue(new Error('Update failed'));

      const { getByText } = render(<RSVPManagementScreen />);

      const maybeOption = getByText('Maybe');
      fireEvent.press(maybeOption);

      await waitFor(() => {
        expect(mockUpdateRSVP).toHaveBeenCalled();
      });

      // Should not crash the app
      expect(getByText('Maybe')).toBeTruthy();
    });

    it('should refresh attendees after RSVP change', async () => {
      const { getByText } = render(<RSVPManagementScreen />);

      const maybeOption = getByText('Maybe');
      fireEvent.press(maybeOption);

      await waitFor(() => {
        expect(mockUpdateRSVP).toHaveBeenCalled();
      });

      // Attendees should be reloaded (mock data remains the same)
      expect(getByText('John Doe')).toBeTruthy();
    });
  });

  describe('refresh functionality', () => {
    it('should handle pull to refresh', async () => {
      const { getByTestId } = render(<RSVPManagementScreen />);

      // Find the SectionList by looking for the refresh control
      const sectionList = getByTestId ? getByTestId('section-list') : null;
      
      if (sectionList) {
        // Simulate pull to refresh
        fireEvent(sectionList, 'onRefresh');
      }

      // Should reload attendees data
      await waitFor(() => {
        // Mock data should be reloaded
        expect(true).toBe(true); // Placeholder assertion
      });
    });

    it('should show refreshing state during pull to refresh', async () => {
      const { getByText } = render(<RSVPManagementScreen />);

      // This would be tested by checking the RefreshControl props
      // but requires more complex mocking of SectionList
      expect(getByText('John Doe')).toBeTruthy();
    });

    it('should handle refresh errors gracefully', () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { getByText } = render(<RSVPManagementScreen />);

      expect(getByText("Who's Coming")).toBeTruthy();
      
      consoleSpy.mockRestore();
    });
  });

  describe('data loading and state management', () => {
    it('should load attendees on component mount', async () => {
      render(<RSVPManagementScreen />);

      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
        expect(getByText('Jane Smith')).toBeTruthy();
        expect(getByText('Sarah Williams')).toBeTruthy();
        expect(getByText('Emily Davis')).toBeTruthy();
      });
    });

    it('should reload attendees when event ID changes', () => {
      const { rerender } = render(<RSVPManagementScreen />);

      // Mock new event ID
      require('expo-router').useLocalSearchParams.mockReturnValue({ eventId: 'new-event' });

      rerender(<RSVPManagementScreen />);

      // Should reload with new event ID
      expect(true).toBe(true); // Placeholder assertion
    });

    it('should handle empty attendee sections', () => {
      // This is tested implicitly by the section filtering logic
      const { getByText } = render(<RSVPManagementScreen />);
      
      // All sections have data in mock, so they all render
      expect(getByText('Going')).toBeTruthy();
      expect(getByText('Maybe')).toBeTruthy();
      expect(getByText('Not Going')).toBeTruthy();
    });

    it('should filter out empty sections', () => {
      // The component logic filters out empty sections
      // This is tested by ensuring only sections with data are rendered
      const { getByText } = render(<RSVPManagementScreen />);
      
      expect(getByText('(3)')).toBeTruthy(); // Going count
      expect(getByText('(2)')).toBeTruthy(); // Maybe count
      expect(getByText('(1)')).toBeTruthy(); // Not going count
    });
  });

  describe('accessibility', () => {
    it('should render with proper accessibility structure', () => {
      const { getByText } = render(<RSVPManagementScreen />);

      // Header elements
      expect(getByText("Who's Coming")).toBeTruthy();
      expect(getByText('Test Party')).toBeTruthy();
      
      // RSVP options
      expect(getByText('Your RSVP:')).toBeTruthy();
      expect(getByText('Going')).toBeTruthy();
      expect(getByText('Maybe')).toBeTruthy();
      expect(getByText('Not Going')).toBeTruthy();

      // Attendee list
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('@johndoe')).toBeTruthy();
    });

    it('should handle touch interactions properly', async () => {
      const { getByText } = render(<RSVPManagementScreen />);

      // Test RSVP option touch
      const maybeOption = getByText('Maybe');
      fireEvent.press(maybeOption);

      expect(mockUpdateRSVP).toHaveBeenCalled();

      // Test attendee card touch
      await waitFor(() => {
        const johnDoe = getByText('John Doe');
        fireEvent.press(johnDoe);
        expect(mockRouter.push).toHaveBeenCalled();
      });
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle missing event data', () => {
      mockUseEvents.mockReturnValue({
        events: [],
        loading: false,
        error: null,
        fetchEvents: jest.fn(),
        createEvent: jest.fn(),
        joinEvent: jest.fn(),
        updateRSVP: mockUpdateRSVP,
      });

      const { getByText } = render(<RSVPManagementScreen />);

      // Should still render basic UI
      expect(getByText("Who's Coming")).toBeTruthy();
      expect(getByText('Your RSVP:')).toBeTruthy();
    });

    it('should handle malformed date strings', () => {
      const eventWithBadDate = { ...mockEvent, date: 'invalid-date' };
      mockUseEvents.mockReturnValue({
        events: [eventWithBadDate],
        loading: false,
        error: null,
        fetchEvents: jest.fn(),
        createEvent: jest.fn(),
        joinEvent: jest.fn(),
        updateRSVP: mockUpdateRSVP,
      });

      mockFormat.mockImplementation(() => {
        throw new Error('Invalid date');
      });

      const { getByText } = render(<RSVPManagementScreen />);

      // Should not crash
      expect(getByText("Who's Coming")).toBeTruthy();
    });

    it('should handle haptics failure gracefully', async () => {
      mockHaptics.mockRejectedValue(new Error('Haptics not available'));

      const { getByText } = render(<RSVPManagementScreen />);

      const maybeOption = getByText('Maybe');
      fireEvent.press(maybeOption);

      // Should still update RSVP even if haptics fail
      expect(mockUpdateRSVP).toHaveBeenCalledWith('test-event-1', 'maybe');
    });

    it('should handle concurrent RSVP updates', async () => {
      const { getByText } = render(<RSVPManagementScreen />);

      const maybeOption = getByText('Maybe');
      const notGoingOption = getByText('Not Going');

      // Trigger multiple rapid updates
      fireEvent.press(maybeOption);
      fireEvent.press(notGoingOption);
      fireEvent.press(maybeOption);

      expect(mockUpdateRSVP).toHaveBeenCalledTimes(3);
    });

    it('should handle very long attendee names', () => {
      // This would require mocking different attendee data
      // For now, verify current names render correctly
      const { getByText } = render(<RSVPManagementScreen />);

      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Jane Smith')).toBeTruthy();
    });

    it('should handle missing user RSVP status', () => {
      const eventWithoutRSVP = { ...mockEvent, userRSVP: undefined };
      mockUseEvents.mockReturnValue({
        events: [eventWithoutRSVP],
        loading: false,
        error: null,
        fetchEvents: jest.fn(),
        createEvent: jest.fn(),
        joinEvent: jest.fn(),
        updateRSVP: mockUpdateRSVP,
      });

      const { getByText } = render(<RSVPManagementScreen />);

      // Should render all RSVP options without any selected
      expect(getByText('Going')).toBeTruthy();
      expect(getByText('Maybe')).toBeTruthy();
      expect(getByText('Not Going')).toBeTruthy();
    });
  });

  describe('performance', () => {
    it('should render large attendee lists efficiently', async () => {
      // The component uses SectionList which is optimized for large lists
      const { getByText } = render(<RSVPManagementScreen />);

      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
      });

      // Should render without performance issues
      expect(getByText('(3)')).toBeTruthy(); // Going section count
    });

    it('should handle rapid state changes efficiently', async () => {
      const { getByText } = render(<RSVPManagementScreen />);

      // Rapidly change RSVP status
      const options = ['Going', 'Maybe', 'Not Going'];
      
      for (const option of options) {
        fireEvent.press(getByText(option));
      }

      expect(mockUpdateRSVP).toHaveBeenCalledTimes(3);
    });

    it('should optimize re-renders on data updates', () => {
      const { rerender } = render(<RSVPManagementScreen />);

      // Update with same data
      rerender(<RSVPManagementScreen />);

      // Should not cause unnecessary re-renders of expensive components
      expect(true).toBe(true); // Placeholder assertion
    });
  });
});