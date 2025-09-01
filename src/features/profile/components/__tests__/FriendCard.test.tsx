import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import FriendCard from '../FriendCard';

// Mock dependencies
jest.mock('expo-blur', () => ({
  BlurView: 'BlurView',
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2 hours ago'),
}));

jest.mock('date-fns/locale', () => ({
  fr: {},
}));

// Mock animated value
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  
  RN.Animated.Value = jest.fn(() => ({
    setValue: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
  }));
  
  RN.Animated.timing = jest.fn(() => ({
    start: jest.fn((callback) => callback && callback()),
  }));
  
  RN.Animated.sequence = jest.fn(() => ({
    start: jest.fn((callback) => callback && callback()),
  }));
  
  return RN;
});

describe('FriendCard', () => {
  const baseFriend = {
    id: 'friend1',
    full_name: 'John Doe',
    username: 'johndoe',
    avatar_url: 'https://example.com/avatar.jpg',
    bio: 'Software engineer and coffee lover',
    last_seen: '2024-01-15T08:00:00Z',
    friendship_date: '2024-01-01T00:00:00Z',
    mutual_friends_count: 5,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Date.now to return a consistent timestamp
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2024-01-15T10:00:00Z').getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders friend card with all information', () => {
      const { getByText } = render(<FriendCard friend={baseFriend} />);

      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('@johndoe')).toBeTruthy();
      expect(getByText('Software engineer and coffee lover')).toBeTruthy();
      expect(getByText('5 amis en commun')).toBeTruthy();
    });

    it('renders friend with minimal information', () => {
      const minimalFriend = {
        id: 'friend2',
        full_name: 'Jane Smith',
        username: 'jane',
      };

      const { getByText, queryByText } = render(<FriendCard friend={minimalFriend} />);

      expect(getByText('Jane Smith')).toBeTruthy();
      expect(getByText('@jane')).toBeTruthy();
      expect(queryByText('amis en commun')).toBeNull();
    });

    it('handles friend without username', () => {
      const friendWithoutUsername = {
        ...baseFriend,
        username: undefined,
      };

      const { getByText, queryByText } = render(<FriendCard friend={friendWithoutUsername} />);

      expect(getByText('John Doe')).toBeTruthy();
      expect(queryByText('@')).toBeNull();
    });

    it('handles friend without bio', () => {
      const friendWithoutBio = {
        ...baseFriend,
        bio: undefined,
      };

      const { getByText, queryByText } = render(<FriendCard friend={friendWithoutBio} />);

      expect(getByText('John Doe')).toBeTruthy();
      expect(queryByText('Software engineer and coffee lover')).toBeNull();
    });
  });

  describe('Avatar Handling', () => {
    it('displays avatar image when available', () => {
      const { UNSAFE_getByType } = render(<FriendCard friend={baseFriend} />);

      const image = UNSAFE_getByType('Image');
      expect(image.props.source.uri).toBe('https://example.com/avatar.jpg');
    });

    it('displays fallback gradient with initials when no avatar', () => {
      const friendWithoutAvatar = {
        ...baseFriend,
        avatar_url: undefined,
      };

      const { getByText, UNSAFE_getByType } = render(<FriendCard friend={friendWithoutAvatar} />);

      expect(getByText('J')).toBeTruthy(); // First letter of name
      expect(UNSAFE_getByType('LinearGradient')).toBeTruthy();
    });

    it('switches to fallback when image fails to load', () => {
      const { UNSAFE_getByType, getByText } = render(<FriendCard friend={baseFriend} />);

      const image = UNSAFE_getByType('Image');
      
      // Simulate image load error
      act(() => {
        image.props.onError();
      });

      expect(getByText('J')).toBeTruthy(); // Should show fallback with initial
    });
  });

  describe('Online Status', () => {
    it('shows online indicator for recently active users', () => {
      const onlineFriend = {
        ...baseFriend,
        last_seen: '2024-01-15T09:58:00Z', // 2 minutes ago (within 5 minute threshold)
      };

      const { UNSAFE_getAllByType } = render(<FriendCard friend={onlineFriend} />);

      const views = UNSAFE_getAllByType('View');
      const onlineIndicator = views.find(view => 
        view.props.style?.backgroundColor === '#4CD964'
      );
      expect(onlineIndicator).toBeTruthy();
    });

    it('does not show online indicator for offline users', () => {
      const offlineFriend = {
        ...baseFriend,
        last_seen: '2024-01-15T08:00:00Z', // 2 hours ago (beyond 5 minute threshold)
      };

      const { UNSAFE_getAllByType } = render(<FriendCard friend={offlineFriend} />);

      const views = UNSAFE_getAllByType('View');
      const onlineIndicator = views.find(view => 
        view.props.style?.backgroundColor === '#4CD964'
      );
      expect(onlineIndicator).toBeFalsy();
    });

    it('shows last seen text for offline users', () => {
      const { getByText } = render(<FriendCard friend={baseFriend} />);

      expect(getByText(/Vu 2 hours ago/)).toBeTruthy();
    });
  });

  describe('Mutual Friends', () => {
    it('displays singular form for one mutual friend', () => {
      const friendWithOneMutual = {
        ...baseFriend,
        mutual_friends_count: 1,
      };

      const { getByText } = render(<FriendCard friend={friendWithOneMutual} />);

      expect(getByText('1 ami en commun')).toBeTruthy();
    });

    it('displays plural form for multiple mutual friends', () => {
      const { getByText } = render(<FriendCard friend={baseFriend} />);

      expect(getByText('5 amis en commun')).toBeTruthy();
    });

    it('does not display mutual friends when count is zero', () => {
      const friendWithNoMutuals = {
        ...baseFriend,
        mutual_friends_count: 0,
      };

      const { queryByText } = render(<FriendCard friend={friendWithNoMutuals} />);

      expect(queryByText(/amis en commun/)).toBeNull();
    });

    it('does not display mutual friends when count is undefined', () => {
      const friendWithUndefinedMutuals = {
        ...baseFriend,
        mutual_friends_count: undefined,
      };

      const { queryByText } = render(<FriendCard friend={friendWithUndefinedMutuals} />);

      expect(queryByText(/amis en commun/)).toBeNull();
    });
  });

  describe('Press Handling', () => {
    it('calls custom onPress when provided', async () => {
      const mockOnPress = jest.fn();
      const { getByText } = render(<FriendCard friend={baseFriend} onPress={mockOnPress} />);

      await act(async () => {
        fireEvent.press(getByText('John Doe'));
      });

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('navigates to person card when no custom onPress', async () => {
      const { router } = require('expo-router');
      const { getByText } = render(<FriendCard friend={baseFriend} />);

      await act(async () => {
        fireEvent.press(getByText('John Doe'));
      });

      expect(router.push).toHaveBeenCalledWith('/screens/person-card?id=friend1');
    });

    it('triggers animation on press', async () => {
      const { getByText } = render(<FriendCard friend={baseFriend} />);

      await act(async () => {
        fireEvent.press(getByText('John Doe'));
      });

      expect(require('react-native').Animated.sequence).toHaveBeenCalled();
    });
  });

  describe('Action Buttons', () => {
    it('does not show actions by default', () => {
      const { queryByTestId } = render(<FriendCard friend={baseFriend} />);

      expect(queryByTestId('message-button')).toBeNull();
      expect(queryByTestId('remove-button')).toBeNull();
    });

    it('shows action buttons when showActions is true', () => {
      const mockOnMessage = jest.fn();
      const mockOnRemove = jest.fn();
      
      const { UNSAFE_getAllByType } = render(
        <FriendCard 
          friend={baseFriend} 
          showActions={true}
          onMessage={mockOnMessage}
          onRemove={mockOnRemove}
        />
      );

      const touchableOpacities = UNSAFE_getAllByType('TouchableOpacity');
      // Should have main card + 2 action buttons = 3 total TouchableOpacity components
      expect(touchableOpacities.length).toBeGreaterThanOrEqual(3);
    });

    it('calls onMessage when message button is pressed', () => {
      const mockOnMessage = jest.fn();
      
      const { UNSAFE_getAllByType } = render(
        <FriendCard 
          friend={baseFriend} 
          showActions={true}
          onMessage={mockOnMessage}
        />
      );

      const touchableOpacities = UNSAFE_getAllByType('TouchableOpacity');
      const messageButton = touchableOpacities[1]; // Second TouchableOpacity should be message button
      
      fireEvent.press(messageButton);
      expect(mockOnMessage).toHaveBeenCalledTimes(1);
    });

    it('calls onRemove when remove button is pressed', () => {
      const mockOnRemove = jest.fn();
      
      const { UNSAFE_getAllByType } = render(
        <FriendCard 
          friend={baseFriend} 
          showActions={true}
          onRemove={mockOnRemove}
        />
      );

      const touchableOpacities = UNSAFE_getAllByType('TouchableOpacity');
      const removeButton = touchableOpacities[touchableOpacities.length - 1]; // Last TouchableOpacity should be remove button
      
      fireEvent.press(removeButton);
      expect(mockOnRemove).toHaveBeenCalledTimes(1);
    });

    it('shows only message button when only onMessage is provided', () => {
      const mockOnMessage = jest.fn();
      
      const { UNSAFE_getAllByType } = render(
        <FriendCard 
          friend={baseFriend} 
          showActions={true}
          onMessage={mockOnMessage}
        />
      );

      const touchableOpacities = UNSAFE_getAllByType('TouchableOpacity');
      expect(touchableOpacities.length).toBe(2); // Main card + message button
    });

    it('shows only remove button when only onRemove is provided', () => {
      const mockOnRemove = jest.fn();
      
      const { UNSAFE_getAllByType } = render(
        <FriendCard 
          friend={baseFriend} 
          showActions={true}
          onRemove={mockOnRemove}
        />
      );

      const touchableOpacities = UNSAFE_getAllByType('TouchableOpacity');
      expect(touchableOpacities.length).toBe(2); // Main card + remove button
    });
  });

  describe('Text Truncation', () => {
    it('truncates long names to 1 line', () => {
      const friendWithLongName = {
        ...baseFriend,
        full_name: 'John Jacob Jingleheimer Schmidt The Third',
      };

      const { getByText } = render(<FriendCard friend={friendWithLongName} />);

      const nameElement = getByText('John Jacob Jingleheimer Schmidt The Third');
      expect(nameElement.props.numberOfLines).toBe(1);
    });

    it('truncates long usernames to 1 line', () => {
      const friendWithLongUsername = {
        ...baseFriend,
        username: 'verylongusernamethatshouldbetruncat',
      };

      const { getByText } = render(<FriendCard friend={friendWithLongUsername} />);

      const usernameElement = getByText('@verylongusernamethatshouldbetruncat');
      expect(usernameElement.props.numberOfLines).toBe(1);
    });

    it('truncates long bios to 2 lines', () => {
      const friendWithLongBio = {
        ...baseFriend,
        bio: 'This is a very long bio that should be truncated after two lines of text to prevent the card from becoming too tall',
      };

      const { getByText } = render(<FriendCard friend={friendWithLongBio} />);

      const bioElement = getByText(friendWithLongBio.bio);
      expect(bioElement.props.numberOfLines).toBe(2);
    });
  });

  describe('Accessibility', () => {
    it('applies correct activeOpacity to main touchable', () => {
      const { UNSAFE_getByType } = render(<FriendCard friend={baseFriend} />);

      const mainTouchable = UNSAFE_getByType('TouchableOpacity');
      expect(mainTouchable.props.activeOpacity).toBe(0.7);
    });
  });
});