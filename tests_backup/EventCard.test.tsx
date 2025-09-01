import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import EventCard from '../../features/home/components/EventCard';
import { NavigationContainer } from '@react-navigation/native';

const mockEvent = {
  id: '1',
  title: 'Test Event',
  description: 'Test Description',
  date: new Date('2024-12-25'),
  location: 'Test Location',
  category: 'party',
  image_url: 'https://example.com/image.jpg',
  attendee_count: 10,
  max_capacity: 50,
  creator_id: 'user1',
  creator_name: 'Test User',
  is_private: false,
  created_at: new Date().toISOString(),
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <NavigationContainer>
    {children}
  </NavigationContainer>
);

describe('EventCard', () => {
  it('renders event information correctly', () => {
    const { getByText, getByTestId } = render(
      <TestWrapper>
        <EventCard event={mockEvent} />
      </TestWrapper>
    );

    expect(getByText('Test Event')).toBeTruthy();
    expect(getByText('Test Location')).toBeTruthy();
    expect(getByText('10 going')).toBeTruthy();
    expect(getByTestId('event-card-container')).toBeTruthy();
  });

  it('handles press events correctly', () => {
    const mockOnPress = jest.fn();
    
    const { getByTestId } = render(
      <TestWrapper>
        <EventCard event={mockEvent} onPress={mockOnPress} />
      </TestWrapper>
    );

    const eventCard = getByTestId('event-card-container');
    fireEvent.press(eventCard);

    expect(mockOnPress).toHaveBeenCalledWith(mockEvent);
  });

  it('displays correct capacity information', () => {
    const { getByText } = render(
      <TestWrapper>
        <EventCard event={mockEvent} />
      </TestWrapper>
    );

    expect(getByText('10/50')).toBeTruthy();
  });

  it('shows private event indicator when event is private', () => {
    const privateEvent = { ...mockEvent, is_private: true };
    
    const { getByTestId } = render(
      <TestWrapper>
        <EventCard event={privateEvent} />
      </TestWrapper>
    );

    expect(getByTestId('private-indicator')).toBeTruthy();
  });

  it('handles missing image gracefully', () => {
    const eventWithoutImage = { ...mockEvent, image_url: null };
    
    const { getByTestId } = render(
      <TestWrapper>
        <EventCard event={eventWithoutImage} />
      </TestWrapper>
    );

    expect(getByTestId('default-event-image')).toBeTruthy();
  });

  it('formats date correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <EventCard event={mockEvent} />
      </TestWrapper>
    );

    // Should display formatted date
    expect(getByText('Dec 25')).toBeTruthy();
  });

  it('displays creator information', () => {
    const { getByText } = render(
      <TestWrapper>
        <EventCard event={mockEvent} />
      </TestWrapper>
    );

    expect(getByText('by Test User')).toBeTruthy();
  });

  it('shows full capacity warning', () => {
    const fullEvent = { ...mockEvent, attendee_count: 50 };
    
    const { getByTestId } = render(
      <TestWrapper>
        <EventCard event={fullEvent} />
      </TestWrapper>
    );

    expect(getByTestId('full-capacity-warning')).toBeTruthy();
  });

  it('applies correct category styling', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <EventCard event={mockEvent} />
      </TestWrapper>
    );

    const categoryBadge = getByTestId('category-badge');
    expect(categoryBadge.props.style).toMatchObject(
      expect.objectContaining({
        backgroundColor: expect.any(String),
      })
    );
  });
});