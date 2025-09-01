import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import EventCardEnhanced from '../components/EventCardEnhanced';

// Mock external dependencies
jest.mock('@expo/vector-icons/Ionicons', () => {
  const { Text } = require('react-native');
  return ({ name, size, color, ...props }: any) => (
    <Text style={{ fontSize: size, color }} {...props}>
      {name}
    </Text>
  );
});

jest.mock('date-fns', () => ({
  format: jest.fn((date, formatString) => {
    if (formatString === 'dd') return '15';
    if (formatString === 'MMM') return 'jan';
    return '15/01/2024';
  }),
}));

jest.mock('date-fns/locale', () => ({
  fr: {},
}));

jest.mock('expo-blur', () => ({
  BlurView: ({ children, intensity, style }: any) => {
    const { View } = require('react-native');
    return <View style={style}>{children}</View>;
  },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, colors, style }: any) => {
    const { View } = require('react-native');
    return <View style={[style, { backgroundColor: colors[0] }]}>{children}</View>;
  },
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: mockPush,
  },
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Dimensions: {
      get: () => ({ width: 375, height: 812 }),
    },
    Animated: {
      ...RN.Animated,
      View: RN.View,
      spring: jest.fn(() => ({
        start: jest.fn(),
      })),
    },
  };
});

describe('EventCardEnhanced', () => {
  const mockEvent = {
    id: '123',
    title: 'Test Event',
    subtitle: 'Test Subtitle',
    description: 'Test Description',
    date: '2024-01-15T20:00:00Z',
    location: 'Test Location',
    cover_image: 'https://example.com/image.jpg',
    cover_bg_color: '#667eea',
    created_by: 'user123',
    participants_count: 25,
    is_private: false,
    distance: 2.5,
    playlists: [{ id: '1', playlist_name: 'Party Mix', spotify_link: 'https://spotify.com' }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with all props', () => {
    const { getByText } = render(
      <EventCardEnhanced event={mockEvent} showDistance={true} />
    );

    expect(getByText('Test Event')).toBeTruthy();
    expect(getByText('Test Subtitle')).toBeTruthy();
    expect(getByText('Test Location')).toBeTruthy();
    expect(getByText('25')).toBeTruthy();
  });

  it('renders with minimum required props', () => {
    const minimalEvent = {
      id: '123',
      title: 'Minimal Event',
      date: '2024-01-15T20:00:00Z',
    };

    const { getByText } = render(<EventCardEnhanced event={minimalEvent} />);

    expect(getByText('Minimal Event')).toBeTruthy();
    expect(getByText('15')).toBeTruthy(); // Day from date
    expect(getByText('JAN')).toBeTruthy(); // Month from date
  });

  it('shows private badge when event is private', () => {
    const privateEvent = { ...mockEvent, is_private: true };
    const { getByText } = render(<EventCardEnhanced event={privateEvent} />);

    expect(getByText('Privé')).toBeTruthy();
    expect(getByText('lock-closed')).toBeTruthy();
  });

  it('shows distance when showDistance is true and distance exists', () => {
    const { getByText } = render(
      <EventCardEnhanced event={mockEvent} showDistance={true} />
    );

    expect(getByText('2.5km')).toBeTruthy();
    expect(getByText('location')).toBeTruthy();
  });

  it('shows distance in meters when less than 1km', () => {
    const closeEvent = { ...mockEvent, distance: 0.5 };
    const { getByText } = render(
      <EventCardEnhanced event={closeEvent} showDistance={true} />
    );

    expect(getByText('500m')).toBeTruthy();
  });

  it('shows playlist badge when playlists exist', () => {
    const { getByText } = render(<EventCardEnhanced event={mockEvent} />);

    expect(getByText('Playlist')).toBeTruthy();
    expect(getByText('musical-notes')).toBeTruthy();
  });

  it('does not show playlist badge when no playlists', () => {
    const eventWithoutPlaylists = { ...mockEvent, playlists: [] };
    const { queryByText } = render(<EventCardEnhanced event={eventWithoutPlaylists} />);

    expect(queryByText('Playlist')).toBeNull();
  });

  it('renders with cover image when provided', () => {
    const { UNSAFE_getByProps } = render(<EventCardEnhanced event={mockEvent} />);

    // Check that an Image component with the cover_image URI exists
    const imageComponent = UNSAFE_getByProps({
      source: { uri: mockEvent.cover_image },
    });
    expect(imageComponent).toBeTruthy();
  });

  it('renders with gradient background when no cover image', () => {
    const eventWithoutImage = { ...mockEvent, cover_image: undefined };
    const { UNSAFE_getByProps } = render(<EventCardEnhanced event={eventWithoutImage} />);

    // Check that LinearGradient is rendered with the background color
    const gradientComponent = UNSAFE_getByProps({
      colors: [mockEvent.cover_bg_color, '#000'],
    });
    expect(gradientComponent).toBeTruthy();
  });

  it('uses default gradient when no cover image or background color', () => {
    const eventWithoutImageOrColor = { 
      ...mockEvent, 
      cover_image: undefined, 
      cover_bg_color: undefined 
    };
    const { UNSAFE_getByProps } = render(
      <EventCardEnhanced event={eventWithoutImageOrColor} />
    );

    // Check that default gradient colors are used
    const gradientComponent = UNSAFE_getByProps({
      colors: ['#667eea', '#764ba2'],
    });
    expect(gradientComponent).toBeTruthy();
  });

  it('navigates to event details when pressed with default behavior', () => {
    const { getByText } = render(<EventCardEnhanced event={mockEvent} />);
    const eventCard = getByText('Test Event').parent;

    fireEvent.press(eventCard);

    expect(mockPush).toHaveBeenCalledWith('/screens/event-details?id=123');
  });

  it('calls custom onPress when provided', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <EventCardEnhanced event={mockEvent} onPress={mockOnPress} />
    );
    const eventCard = getByText('Test Event').parent;

    fireEvent.press(eventCard);

    expect(mockOnPress).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('renders correctly with small size', () => {
    const { getByText } = render(
      <EventCardEnhanced event={mockEvent} size="small" />
    );

    expect(getByText('Test Event')).toBeTruthy();
    // Small size should still render all content
  });

  it('renders correctly with large size', () => {
    const { getByText } = render(
      <EventCardEnhanced event={mockEvent} size="large" />
    );

    expect(getByText('Test Event')).toBeTruthy();
    // Large size should still render all content
  });

  it('does not render optional elements when not provided', () => {
    const minimalEvent = {
      id: '123',
      title: 'Minimal Event',
      date: '2024-01-15T20:00:00Z',
    };

    const { queryByText } = render(<EventCardEnhanced event={minimalEvent} />);

    expect(queryByText('Privé')).toBeNull();
    expect(queryByText('Playlist')).toBeNull();
    expect(queryByText('location-outline')).toBeNull();
    expect(queryByText('people-outline')).toBeNull();
  });

  it('handles press in and press out animations', () => {
    const { getByText } = render(<EventCardEnhanced event={mockEvent} />);
    const eventCard = getByText('Test Event').parent;

    act(() => {
      fireEvent(eventCard, 'pressIn');
    });

    act(() => {
      fireEvent(eventCard, 'pressOut');
    });

    // Animation should be triggered (mocked)
    expect(require('react-native').Animated.spring).toHaveBeenCalled();
  });

  it('formats date correctly', () => {
    const { getByText } = render(<EventCardEnhanced event={mockEvent} />);

    // Check that date formatting functions are called
    expect(getByText('15')).toBeTruthy(); // Day
    expect(getByText('JAN')).toBeTruthy(); // Month (uppercased)
  });

  it('limits text to specified number of lines', () => {
    const longTitleEvent = {
      ...mockEvent,
      title: 'This is a very long title that should be truncated after two lines of text',
      subtitle: 'This is a very long subtitle that should be truncated after one line',
      location: 'This is a very long location name that should be truncated',
    };

    const { getByText } = render(<EventCardEnhanced event={longTitleEvent} />);

    // The text should be rendered but truncated by numberOfLines prop
    expect(getByText(longTitleEvent.title)).toBeTruthy();
    expect(getByText(longTitleEvent.subtitle)).toBeTruthy();
    expect(getByText(longTitleEvent.location)).toBeTruthy();
  });

  it('renders info row with location and participants when both present', () => {
    const { getByText } = render(<EventCardEnhanced event={mockEvent} />);

    expect(getByText('location-outline')).toBeTruthy();
    expect(getByText('Test Location')).toBeTruthy();
    expect(getByText('people-outline')).toBeTruthy();
    expect(getByText('25')).toBeTruthy();
  });

  it('handles zero participants count', () => {
    const eventWithZeroParticipants = { ...mockEvent, participants_count: 0 };
    const { getByText } = render(<EventCardEnhanced event={eventWithZeroParticipants} />);

    expect(getByText('people-outline')).toBeTruthy();
    expect(getByText('0')).toBeTruthy();
  });
});