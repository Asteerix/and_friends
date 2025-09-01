import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import NotificationItem from '../../features/notifications/components/NotificationItem';

const mockNotification = {
  id: '1',
  user_id: 'user123',
  type: 'event_invite',
  title: 'Event Invitation',
  message: 'You have been invited to a party',
  body: 'You have been invited to a party',
  timestamp: new Date('2024-01-15T10:30:00Z'),
  created_at: '2024-01-15T10:30:00Z',
  read: false,
  data: {
    event_id: 'event123',
    sender_id: 'user456'
  }
};

describe('NotificationItem', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders notification information correctly', () => {
    const { getByText } = render(
      <NotificationItem 
        notification={mockNotification}
        onPress={mockOnPress}
      />
    );

    expect(getByText('Event Invitation')).toBeTruthy();
    expect(getByText('You have been invited to a party')).toBeTruthy();
  });

  it('handles press events correctly', () => {
    const { getByText } = render(
      <NotificationItem 
        notification={mockNotification}
        onPress={mockOnPress}
      />
    );

    const notificationItem = getByText('Event Invitation').parent?.parent;
    fireEvent.press(notificationItem);

    expect(mockOnPress).toHaveBeenCalled();
  });

  it('handles different notification types', () => {
    const friendRequestNotification = {
      ...mockNotification,
      type: 'friend_request',
      title: 'Friend Request',
      message: 'John wants to be your friend',
      body: 'John wants to be your friend'
    };

    const { getByText } = render(
      <NotificationItem 
        notification={friendRequestNotification}
        onPress={mockOnPress}
      />
    );

    expect(getByText('Friend Request')).toBeTruthy();
  });
});