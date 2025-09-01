import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import NotificationItem from '../NotificationItem';
import { Notification } from '@/shared/providers/NotificationProvider';

describe('NotificationItem', () => {
  const baseNotification: Notification = {
    id: '1',
    title: 'Test Notification',
    body: 'This is a test notification',
    type: 'new_message',
    read: false,
    created_at: '2024-01-15T10:00:00Z',
    user_id: 'user1',
    data: {},
  };

  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders notification correctly', () => {
      const { getByText } = render(
        <NotificationItem notification={baseNotification} onPress={mockOnPress} />
      );

      expect(getByText('Test Notification')).toBeTruthy();
      expect(getByText('This is a test notification')).toBeTruthy();
    });

    it('calls onPress when touched', () => {
      const { getByText } = render(
        <NotificationItem notification={baseNotification} onPress={mockOnPress} />
      );

      fireEvent.press(getByText('Test Notification'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Read/Unread States', () => {
    it('shows unread styling for unread notifications', () => {
      const { UNSAFE_getByType, UNSAFE_getAllByType } = render(
        <NotificationItem notification={baseNotification} onPress={mockOnPress} />
      );

      // Should have unread dot
      const views = UNSAFE_getAllByType('View');
      const unreadDot = views.find(view => 
        view.props.style?.backgroundColor === '#007AFF' && 
        view.props.style?.borderRadius === 4
      );
      expect(unreadDot).toBeTruthy();
    });

    it('hides unread dot for read notifications', () => {
      const readNotification = { ...baseNotification, read: true };
      const { UNSAFE_getAllByType } = render(
        <NotificationItem notification={readNotification} onPress={mockOnPress} />
      );

      const views = UNSAFE_getAllByType('View');
      const unreadDot = views.find(view => 
        view.props.style?.backgroundColor === '#007AFF' && 
        view.props.style?.borderRadius === 4
      );
      expect(unreadDot).toBeFalsy();
    });

    it('applies correct text styling for unread notifications', () => {
      const { getByText } = render(
        <NotificationItem notification={baseNotification} onPress={mockOnPress} />
      );

      const titleElement = getByText('Test Notification');
      expect(titleElement.props.style).toContainEqual(expect.objectContaining({ fontWeight: '700' }));
    });

    it('applies normal text styling for read notifications', () => {
      const readNotification = { ...baseNotification, read: true };
      const { getByText } = render(
        <NotificationItem notification={readNotification} onPress={mockOnPress} />
      );

      const titleElement = getByText('Test Notification');
      expect(titleElement.props.style).not.toContainEqual(expect.objectContaining({ fontWeight: '700' }));
    });
  });

  describe('Notification Types', () => {
    it('displays correct icon for message notifications', () => {
      const { UNSAFE_getByType } = render(
        <NotificationItem notification={baseNotification} onPress={mockOnPress} />
      );

      const ionicons = UNSAFE_getByType('Ionicons');
      expect(ionicons.props.name).toBe('chatbubble-outline');
    });

    it('displays correct icon for event notifications', () => {
      const eventNotification = { ...baseNotification, type: 'event_invite' as const };
      const { UNSAFE_getByType } = render(
        <NotificationItem notification={eventNotification} onPress={mockOnPress} />
      );

      const ionicons = UNSAFE_getByType('Ionicons');
      expect(ionicons.props.name).toBe('calendar-outline');
    });

    it('displays correct icon for friend request notifications', () => {
      const friendNotification = { ...baseNotification, type: 'friend_request' as const };
      const { UNSAFE_getByType } = render(
        <NotificationItem notification={friendNotification} onPress={mockOnPress} />
      );

      const ionicons = UNSAFE_getByType('Ionicons');
      expect(ionicons.props.name).toBe('person-add-outline');
    });

    it('displays correct icon for rating notifications', () => {
      const ratingNotification = { ...baseNotification, type: 'new_rating' as const };
      const { UNSAFE_getByType } = render(
        <NotificationItem notification={ratingNotification} onPress={mockOnPress} />
      );

      const ionicons = UNSAFE_getByType('Ionicons');
      expect(ionicons.props.name).toBe('star');
      expect(ionicons.props.color).toBe('#FFD700');
    });

    it('displays correct icon for story like notifications', () => {
      const storyLikeNotification = { ...baseNotification, type: 'story_like' as const };
      const { UNSAFE_getByType } = render(
        <NotificationItem notification={storyLikeNotification} onPress={mockOnPress} />
      );

      const ionicons = UNSAFE_getByType('Ionicons');
      expect(ionicons.props.name).toBe('heart');
      expect(ionicons.props.color).toBe('#FF1744');
    });

    it('uses default icon for unknown types', () => {
      const unknownNotification = { ...baseNotification, type: 'unknown' as any };
      const { UNSAFE_getByType } = render(
        <NotificationItem notification={unknownNotification} onPress={mockOnPress} />
      );

      const ionicons = UNSAFE_getByType('Ionicons');
      expect(ionicons.props.name).toBe('notifications-outline');
      expect(ionicons.props.color).toBe('#000');
    });
  });

  describe('Time Formatting', () => {
    beforeEach(() => {
      // Mock Date.now() to return a consistent timestamp
      jest.spyOn(Date, 'now').mockReturnValue(new Date('2024-01-15T11:00:00Z').getTime());
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('shows "just now" for very recent notifications', () => {
      const recentNotification = {
        ...baseNotification,
        created_at: '2024-01-15T10:59:30Z', // 30 seconds ago
      };

      const { getByText } = render(
        <NotificationItem notification={recentNotification} onPress={mockOnPress} />
      );

      expect(getByText('just now')).toBeTruthy();
    });

    it('shows minutes for recent notifications', () => {
      const minutesAgoNotification = {
        ...baseNotification,
        created_at: '2024-01-15T10:45:00Z', // 15 minutes ago
      };

      const { getByText } = render(
        <NotificationItem notification={minutesAgoNotification} onPress={mockOnPress} />
      );

      expect(getByText('15m ago')).toBeTruthy();
    });

    it('shows hours for notifications from today', () => {
      const hoursAgoNotification = {
        ...baseNotification,
        created_at: '2024-01-15T08:00:00Z', // 3 hours ago
      };

      const { getByText } = render(
        <NotificationItem notification={hoursAgoNotification} onPress={mockOnPress} />
      );

      expect(getByText('3h ago')).toBeTruthy();
    });

    it('shows days for notifications from this week', () => {
      const daysAgoNotification = {
        ...baseNotification,
        created_at: '2024-01-13T10:00:00Z', // 2 days ago
      };

      const { getByText } = render(
        <NotificationItem notification={daysAgoNotification} onPress={mockOnPress} />
      );

      expect(getByText('2d ago')).toBeTruthy();
    });

    it('shows date for old notifications', () => {
      const oldNotification = {
        ...baseNotification,
        created_at: '2024-01-01T10:00:00Z', // 2 weeks ago
      };

      const { getByText } = render(
        <NotificationItem notification={oldNotification} onPress={mockOnPress} />
      );

      // Should show formatted date
      expect(getByText(/1\/1\/2024/)).toBeTruthy();
    });
  });

  describe('Avatar Display', () => {
    it('displays avatar from notification data', () => {
      const notificationWithAvatar = {
        ...baseNotification,
        data: { sender_avatar_url: 'https://example.com/avatar.jpg' },
      };

      const { UNSAFE_getByType } = render(
        <NotificationItem notification={notificationWithAvatar} onPress={mockOnPress} />
      );

      const image = UNSAFE_getByType('Image');
      expect(image.props.source.uri).toBe('https://example.com/avatar.jpg');
    });

    it('displays avatar from user object', () => {
      const notificationWithUserAvatar = {
        ...baseNotification,
        user: { avatar_url: 'https://example.com/user-avatar.jpg' },
      };

      const { UNSAFE_getByType } = render(
        <NotificationItem notification={notificationWithUserAvatar} onPress={mockOnPress} />
      );

      const image = UNSAFE_getByType('Image');
      expect(image.props.source.uri).toBe('https://example.com/user-avatar.jpg');
    });

    it('prioritizes data avatar over user avatar', () => {
      const notificationWithBothAvatars = {
        ...baseNotification,
        data: { sender_avatar_url: 'https://example.com/data-avatar.jpg' },
        user: { avatar_url: 'https://example.com/user-avatar.jpg' },
      };

      const { UNSAFE_getByType } = render(
        <NotificationItem notification={notificationWithBothAvatars} onPress={mockOnPress} />
      );

      const image = UNSAFE_getByType('Image');
      expect(image.props.source.uri).toBe('https://example.com/data-avatar.jpg');
    });

    it('shows event placeholder for event notifications without avatar', () => {
      const eventNotification = {
        ...baseNotification,
        type: 'event_invite' as const,
      };

      const { UNSAFE_getAllByType } = render(
        <NotificationItem notification={eventNotification} onPress={mockOnPress} />
      );

      const ionicons = UNSAFE_getAllByType('Ionicons');
      const calendarIcon = ionicons.find(icon => icon.props.name === 'calendar');
      expect(calendarIcon).toBeTruthy();
    });

    it('does not show avatar for non-event notifications without avatar', () => {
      const { UNSAFE_queryByType } = render(
        <NotificationItem notification={baseNotification} onPress={mockOnPress} />
      );

      const image = UNSAFE_queryByType('Image');
      expect(image).toBeNull();
    });
  });

  describe('Icon Background Colors', () => {
    it('uses correct background color for rating notifications', () => {
      const ratingNotification = { ...baseNotification, type: 'new_rating' as const };
      const { UNSAFE_getAllByType } = render(
        <NotificationItem notification={ratingNotification} onPress={mockOnPress} />
      );

      const views = UNSAFE_getAllByType('View');
      const iconContainer = views.find(view => view.props.style?.backgroundColor === '#FFF8DC');
      expect(iconContainer).toBeTruthy();
    });

    it('uses correct background color for story like notifications', () => {
      const storyLikeNotification = { ...baseNotification, type: 'story_like' as const };
      const { UNSAFE_getAllByType } = render(
        <NotificationItem notification={storyLikeNotification} onPress={mockOnPress} />
      );

      const views = UNSAFE_getAllByType('View');
      const iconContainer = views.find(view => view.props.style?.backgroundColor === '#FFE4E8');
      expect(iconContainer).toBeTruthy();
    });

    it('uses correct background color for friend notifications', () => {
      const friendNotification = { ...baseNotification, type: 'friend_request' as const };
      const { UNSAFE_getAllByType } = render(
        <NotificationItem notification={friendNotification} onPress={mockOnPress} />
      );

      const views = UNSAFE_getAllByType('View');
      const iconContainer = views.find(view => view.props.style?.backgroundColor === '#E8F5E9');
      expect(iconContainer).toBeTruthy();
    });

    it('uses default background color for unknown types', () => {
      const { UNSAFE_getAllByType } = render(
        <NotificationItem notification={baseNotification} onPress={mockOnPress} />
      );

      const views = UNSAFE_getAllByType('View');
      const iconContainer = views.find(view => view.props.style?.backgroundColor === '#F5F5F5');
      expect(iconContainer).toBeTruthy();
    });
  });

  describe('Data Avatar Extraction', () => {
    const avatarTestCases = [
      { key: 'sender_avatar_url', value: 'sender-avatar.jpg' },
      { key: 'accepter_avatar_url', value: 'accepter-avatar.jpg' },
      { key: 'rater_avatar_url', value: 'rater-avatar.jpg' },
      { key: 'liker_avatar_url', value: 'liker-avatar.jpg' },
      { key: 'commenter_avatar_url', value: 'commenter-avatar.jpg' },
      { key: 'participant_avatar_url', value: 'participant-avatar.jpg' },
    ];

    avatarTestCases.forEach(({ key, value }) => {
      it(`extracts ${key} from notification data`, () => {
        const notificationWithSpecificAvatar = {
          ...baseNotification,
          data: { [key]: `https://example.com/${value}` },
        };

        const { UNSAFE_getByType } = render(
          <NotificationItem notification={notificationWithSpecificAvatar} onPress={mockOnPress} />
        );

        const image = UNSAFE_getByType('Image');
        expect(image.props.source.uri).toBe(`https://example.com/${value}`);
      });
    });
  });
});