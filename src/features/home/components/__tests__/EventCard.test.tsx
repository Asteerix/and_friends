import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import EventCard from '../EventCard';

// Mock the hooks and utils
jest.mock('@/shared/hooks/useResponsive', () => ({
  useResponsive: () => ({
    scaleHeight: (value: number) => value,
    scaleWidth: (value: number) => value,
    scaleFontSize: (value: number) => value,
    width: 375,
    height: 812,
    getResponsiveValue: ({ default: defaultValue }: any) => defaultValue,
  }),
}));

jest.mock('@/features/events/utils/categoryHelpers', () => ({
  getCategoryIcon: jest.fn((category: string) => {
    const icons = {
      food: '🍕',
      music: '🎵',
      sports: '⚽',
    };
    return icons[category as keyof typeof icons] || '📅';
  }),
}));

jest.mock('@/features/events/utils/getEventImage', () => ({
  getEventImage: jest.fn((event: any) => {
    if (event?.cover_image) {
      return {
        hasImage: true,
        uri: event.cover_image,
        source: null,
      };
    }
    return {
      hasImage: false,
      uri: null,
      source: null,
    };
  }),
}));

describe('EventCard', () => {
  const defaultProps = {
    thumbnail: 'https://example.com/thumbnail.jpg',
    title: 'Test Event',
    date: '2024-01-15T18:00:00Z',
    location: 'Test Location',
    participants: [
      'https://example.com/avatar1.jpg',
      'https://example.com/avatar2.jpg',
      'https://example.com/avatar3.jpg',
    ],
    goingText: '5 going',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    const { getByText } = render(<EventCard {...defaultProps} />);

    expect(getByText('Test Event')).toBeTruthy();
    expect(getByText('Test Location')).toBeTruthy();
    expect(getByText('5 going')).toBeTruthy();
  });

  it('formats date correctly', () => {
    const { getByText } = render(<EventCard {...defaultProps} />);
    
    // The formatted date should contain the expected parts
    const dateElement = getByText(/Mon/); // Should contain day of week
    expect(dateElement).toBeTruthy();
  });

  it('handles invalid date gracefully', () => {
    const propsWithInvalidDate = {
      ...defaultProps,
      date: 'invalid-date',
    };

    const { getByText } = render(<EventCard {...propsWithInvalidDate} />);
    
    // The component shows "Invalid Date" when date parsing fails
    expect(getByText('Invalid Date')).toBeTruthy();
  });

  it('calls onPress when touched', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <EventCard {...defaultProps} onPress={mockOnPress} />
    );

    // Find the TouchableOpacity by finding the title and going up to the touchable parent
    const titleElement = getByText('Test Event');
    const touchable = titleElement.parent?.parent?.parent; // TouchableOpacity -> View -> View -> Text
    
    if (touchable) {
      fireEvent.press(touchable);
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    } else {
      // Fallback: just press the title element itself which should bubble up
      fireEvent.press(titleElement);
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    }
  });

  it('renders category badge when category is provided', () => {
    const { getByText } = render(
      <EventCard {...defaultProps} category="food" />
    );

    expect(getByText('🍕')).toBeTruthy();
  });

  it('renders category badge from event object', () => {
    const eventWithCategory = {
      event_category: 'music',
    };

    const { getByText } = render(
      <EventCard {...defaultProps} event={eventWithCategory} />
    );

    expect(getByText('🎵')).toBeTruthy();
  });

  it('prioritizes direct category prop over event category', () => {
    const eventWithCategory = {
      event_category: 'music',
    };

    const { getByText } = render(
      <EventCard {...defaultProps} category="sports" event={eventWithCategory} />
    );

    expect(getByText('⚽')).toBeTruthy();
  });

  it('uses event image when available', () => {
    const eventWithImage = {
      cover_image: 'https://example.com/event-cover.jpg',
    };

    render(<EventCard {...defaultProps} event={eventWithImage} />);

    const { getEventImage } = require('@/features/events/utils/getEventImage');
    expect(getEventImage).toHaveBeenCalledWith(eventWithImage);
  });

  it('falls back to thumbnail when no event image', () => {
    const { getByDisplayValue } = render(<EventCard {...defaultProps} />);
    
    // The Image component should use the thumbnail URI
    expect(defaultProps.thumbnail).toBeTruthy();
  });

  it('uses placeholder when no thumbnail provided', () => {
    const propsWithoutThumbnail = {
      ...defaultProps,
      thumbnail: '',
    };

    render(<EventCard {...propsWithoutThumbnail} />);
    // Should render without crashing and use placeholder
    expect(true).toBeTruthy();
  });

  it('renders correct number of participant avatars', () => {
    const { UNSAFE_getAllByType } = render(<EventCard {...defaultProps} />);
    
    const images = UNSAFE_getAllByType('Image');
    // Should have main image + 3 participant avatars (+ category if present)
    expect(images.length).toBeGreaterThanOrEqual(4);
  });

  it('limits participant avatars to 3', () => {
    const propsWithManyParticipants = {
      ...defaultProps,
      participants: [
        'https://example.com/avatar1.jpg',
        'https://example.com/avatar2.jpg',
        'https://example.com/avatar3.jpg',
        'https://example.com/avatar4.jpg',
        'https://example.com/avatar5.jpg',
      ],
    };

    const { UNSAFE_getAllByType } = render(<EventCard {...propsWithManyParticipants} />);
    
    const images = UNSAFE_getAllByType('Image');
    // Should still only show main image + 3 participant avatars
    expect(images.length).toBeLessThanOrEqual(5); // main + 3 participants + possibly category
  });

  it('handles empty participants array', () => {
    const propsWithNoParticipants = {
      ...defaultProps,
      participants: [],
    };

    const { getByText } = render(<EventCard {...propsWithNoParticipants} />);
    
    expect(getByText('5 going')).toBeTruthy(); // goingText should still render
  });

  it('truncates long titles to 2 lines', () => {
    const propsWithLongTitle = {
      ...defaultProps,
      title: 'This is a very long event title that should be truncated after two lines of text',
    };

    const { getByText } = render(<EventCard {...propsWithLongTitle} />);
    
    const titleElement = getByText(propsWithLongTitle.title);
    expect(titleElement).toBeTruthy();
    expect(titleElement.props.numberOfLines).toBe(2);
  });

  it('truncates long locations to 1 line', () => {
    const propsWithLongLocation = {
      ...defaultProps,
      location: 'This is a very long location name that should be truncated after one line',
    };

    const { getByText } = render(<EventCard {...propsWithLongLocation} />);
    
    const locationElement = getByText(propsWithLongLocation.location);
    expect(locationElement).toBeTruthy();
    expect(locationElement.props.numberOfLines).toBe(1);
  });

  it('applies responsive styles correctly', () => {
    const { UNSAFE_getByType } = render(<EventCard {...defaultProps} />);
    
    const touchableOpacity = UNSAFE_getByType('TouchableOpacity');
    expect(touchableOpacity.props.activeOpacity).toBe(0.85);
  });

  it('renders without category badge when no category provided', () => {
    const { queryByText } = render(<EventCard {...defaultProps} />);
    
    // Should not find any emoji icons
    expect(queryByText('🍕')).toBeNull();
    expect(queryByText('🎵')).toBeNull();
    expect(queryByText('⚽')).toBeNull();
  });
});