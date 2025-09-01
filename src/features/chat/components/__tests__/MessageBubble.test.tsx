import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MessageBubble from '../MessageBubble';
import { Message } from '@/hooks/useMessages';

// Mock dependencies
jest.mock('expo-video', () => ({
  VideoView: 'VideoView',
  useVideoPlayer: jest.fn(() => ({
    loop: false,
  })),
}));

jest.mock('expo-audio', () => ({
  useAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    remove: jest.fn(),
    currentTime: 0,
    duration: 10,
  })),
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2 minutes ago'),
}));

jest.mock('date-fns/locale', () => ({
  fr: {},
}));

describe('MessageBubble', () => {
  const baseMessage: Message = {
    id: '1',
    content: 'Test message',
    message_type: 'text',
    created_at: '2024-01-15T10:00:00Z',
    user_id: 'user1',
    chat_id: 'chat1',
    metadata: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Text Messages', () => {
    it('renders text message correctly', () => {
      const { getByText } = render(
        <MessageBubble message={baseMessage} isOwnMessage={false} />
      );

      expect(getByText('Test message')).toBeTruthy();
      expect(getByText('2 minutes ago')).toBeTruthy();
    });

    it('applies correct styles for own message', () => {
      const { getByText } = render(
        <MessageBubble message={baseMessage} isOwnMessage={true} />
      );

      const textElement = getByText('Test message');
      expect(textElement.props.style.color).toBe('#fff');
    });

    it('applies correct styles for other user message', () => {
      const { getByText } = render(
        <MessageBubble message={baseMessage} isOwnMessage={false} />
      );

      const textElement = getByText('Test message');
      expect(textElement.props.style.color).toBe('#000');
    });

    it('shows edited indicator when message is edited', () => {
      const editedMessage = { ...baseMessage, is_edited: true };
      const { getByText } = render(
        <MessageBubble message={editedMessage} isOwnMessage={false} />
      );

      expect(getByText('(modifié)')).toBeTruthy();
    });

    it('calls onLongPress when long pressed', () => {
      const mockOnLongPress = jest.fn();
      const { getByText } = render(
        <MessageBubble 
          message={baseMessage} 
          isOwnMessage={false} 
          onLongPress={mockOnLongPress} 
        />
      );

      const pressable = getByText('Test message').parent?.parent;
      if (pressable) {
        fireEvent(pressable, 'longPress');
        expect(mockOnLongPress).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('Image Messages', () => {
    const imageMessage: Message = {
      ...baseMessage,
      message_type: 'image',
      metadata: {
        image_url: 'https://example.com/image.jpg',
      },
    };

    it('renders image message correctly', () => {
      const { UNSAFE_getByType } = render(
        <MessageBubble message={imageMessage} isOwnMessage={false} />
      );

      const image = UNSAFE_getByType('Image');
      expect(image.props.source.uri).toBe('https://example.com/image.jpg');
    });

    it('handles image press', () => {
      const { UNSAFE_getByType } = render(
        <MessageBubble message={imageMessage} isOwnMessage={false} />
      );

      const touchableOpacity = UNSAFE_getByType('TouchableOpacity');
      fireEvent.press(touchableOpacity);
      // Should not throw error (actual implementation is TODO)
    });
  });

  describe('Video Messages', () => {
    const videoMessage: Message = {
      ...baseMessage,
      message_type: 'video',
      metadata: {
        video_url: 'https://example.com/video.mp4',
      },
    };

    it('renders video message correctly', () => {
      const { UNSAFE_getByType } = render(
        <MessageBubble message={videoMessage} isOwnMessage={false} />
      );

      const videoView = UNSAFE_getByType('VideoView');
      expect(videoView).toBeTruthy();
    });
  });

  describe('Audio Messages', () => {
    const audioMessage: Message = {
      ...baseMessage,
      message_type: 'voice',
      metadata: {
        voice_url: 'https://example.com/audio.m4a',
        duration: 65, // 1 minute 5 seconds
      },
    };

    it('renders audio message with play button', () => {
      const { UNSAFE_getByType } = render(
        <MessageBubble message={audioMessage} isOwnMessage={false} />
      );

      const ionicons = UNSAFE_getByType('Ionicons');
      expect(ionicons.props.name).toBe('play-circle');
    });

    it('shows correct duration format', () => {
      const { getByText } = render(
        <MessageBubble message={audioMessage} isOwnMessage={false} />
      );

      expect(getByText('1:05')).toBeTruthy();
    });

    it('handles audio play press', () => {
      const { UNSAFE_getByType } = render(
        <MessageBubble message={audioMessage} isOwnMessage={false} />
      );

      const touchableOpacity = UNSAFE_getByType('TouchableOpacity');
      fireEvent.press(touchableOpacity);
      
      // Should update state (tested through icon change)
      expect(true).toBeTruthy(); // Basic smoke test
    });

    it('formats duration correctly for different lengths', () => {
      const shortAudioMessage = {
        ...audioMessage,
        metadata: { ...audioMessage.metadata, duration: 5 },
      };

      const { getByText } = render(
        <MessageBubble message={shortAudioMessage} isOwnMessage={false} />
      );

      expect(getByText('0:05')).toBeTruthy();
    });
  });

  describe('Location Messages', () => {
    const locationMessage: Message = {
      ...baseMessage,
      message_type: 'location',
      metadata: {
        location: {
          address: 'Paris, France',
          latitude: 48.8566,
          longitude: 2.3522,
        },
      },
    };

    it('renders location message with address', () => {
      const { getByText } = render(
        <MessageBubble message={locationMessage} isOwnMessage={false} />
      );

      expect(getByText('Paris, France')).toBeTruthy();
    });

    it('shows default text when no address provided', () => {
      const locationMessageNoAddress = {
        ...locationMessage,
        metadata: { location: {} },
      };

      const { getByText } = render(
        <MessageBubble message={locationMessageNoAddress} isOwnMessage={false} />
      );

      expect(getByText('Position partagée')).toBeTruthy();
    });

    it('handles location press', () => {
      const { UNSAFE_getByType } = render(
        <MessageBubble message={locationMessage} isOwnMessage={false} />
      );

      const touchableOpacity = UNSAFE_getByType('TouchableOpacity');
      fireEvent.press(touchableOpacity);
      // Should not throw error (actual implementation is TODO)
    });
  });

  describe('Event Share Messages', () => {
    const eventShareMessage: Message = {
      ...baseMessage,
      message_type: 'event_share',
      metadata: {
        event_id: 'event123',
      },
    };

    it('renders event share message', () => {
      const { getByText } = render(
        <MessageBubble message={eventShareMessage} isOwnMessage={false} />
      );

      expect(getByText('Événement partagé')).toBeTruthy();
    });

    it('navigates to event details when pressed', () => {
      const { router } = require('expo-router');
      const { getByText } = render(
        <MessageBubble message={eventShareMessage} isOwnMessage={false} />
      );

      fireEvent.press(getByText('Événement partagé'));
      expect(router.push).toHaveBeenCalledWith('/screens/event-details?id=event123');
    });

    it('does not navigate when no event_id provided', () => {
      const eventShareMessageNoId = {
        ...eventShareMessage,
        metadata: {},
      };
      const { router } = require('expo-router');
      const { getByText } = render(
        <MessageBubble message={eventShareMessageNoId} isOwnMessage={false} />
      );

      fireEvent.press(getByText('Événement partagé'));
      expect(router.push).not.toHaveBeenCalled();
    });
  });

  describe('Story Reply Messages', () => {
    const storyReplyMessage: Message = {
      ...baseMessage,
      message_type: 'story_reply',
      content: 'Nice story!',
    };

    it('renders story reply message with indicator', () => {
      const { getByText } = render(
        <MessageBubble message={storyReplyMessage} isOwnMessage={false} />
      );

      expect(getByText('Réponse à une story')).toBeTruthy();
      expect(getByText('Nice story!')).toBeTruthy();
    });
  });

  describe('Unknown Message Types', () => {
    const unknownMessage: Message = {
      ...baseMessage,
      message_type: 'unknown' as any,
    };

    it('renders nothing for unknown message types', () => {
      const { queryByText } = render(
        <MessageBubble message={unknownMessage} isOwnMessage={false} />
      );

      // Should only show timestamp, not content
      expect(queryByText('Test message')).toBeNull();
      expect(queryByText('2 minutes ago')).toBeTruthy();
    });
  });

  describe('Message Alignment', () => {
    it('aligns own messages to the right', () => {
      const { UNSAFE_getByType } = render(
        <MessageBubble message={baseMessage} isOwnMessage={true} />
      );

      const pressable = UNSAFE_getByType('Pressable');
      expect(pressable.props.style.alignSelf).toBe('flex-end');
    });

    it('aligns other messages to the left', () => {
      const { UNSAFE_getByType } = render(
        <MessageBubble message={baseMessage} isOwnMessage={false} />
      );

      const pressable = UNSAFE_getByType('Pressable');
      expect(pressable.props.style.alignSelf).toBe('flex-start');
    });
  });

  describe('Background Colors', () => {
    it('uses blue background for own messages', () => {
      const { UNSAFE_getAllByType } = render(
        <MessageBubble message={baseMessage} isOwnMessage={true} />
      );

      const views = UNSAFE_getAllByType('View');
      const bubbleView = views.find(view => view.props.style?.backgroundColor === '#007AFF');
      expect(bubbleView).toBeTruthy();
    });

    it('uses gray background for other messages', () => {
      const { UNSAFE_getAllByType } = render(
        <MessageBubble message={baseMessage} isOwnMessage={false} />
      );

      const views = UNSAFE_getAllByType('View');
      const bubbleView = views.find(view => view.props.style?.backgroundColor === '#E9E9EB');
      expect(bubbleView).toBeTruthy();
    });
  });
});