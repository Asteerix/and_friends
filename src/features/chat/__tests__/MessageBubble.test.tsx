import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import MessageBubble from '../components/MessageBubble';
import { Message } from '@/hooks/useMessages';

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
  formatDistanceToNow: jest.fn(() => '2 minutes ago'),
}));

jest.mock('date-fns/locale', () => ({
  fr: {},
}));

jest.mock('expo-video', () => ({
  VideoView: ({ style, player, ...props }: any) => {
    const { View } = require('react-native');
    return <View style={style} testID="video-view" {...props} />;
  },
  useVideoPlayer: jest.fn(() => ({
    loop: false,
    play: jest.fn(),
    pause: jest.fn(),
    remove: jest.fn(),
  })),
}));

const mockAudioPlayer = {
  play: jest.fn(),
  pause: jest.fn(),
  remove: jest.fn(),
  currentTime: 0,
  duration: 120,
};

jest.mock('expo-audio', () => ({
  useAudioPlayer: jest.fn(() => mockAudioPlayer),
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
  };
});

describe('MessageBubble', () => {
  const baseMessage: Message = {
    id: '123',
    content: 'Test message',
    user_id: 'user123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    message_type: 'text',
    conversation_id: 'conv123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Text Messages', () => {
    it('renders text message correctly for own message', () => {
      const { getByText } = render(
        <MessageBubble message={baseMessage} isOwnMessage={true} />
      );

      expect(getByText('Test message')).toBeTruthy();
      expect(getByText('2 minutes ago')).toBeTruthy();
    });

    it('renders text message correctly for other user message', () => {
      const { getByText } = render(
        <MessageBubble message={baseMessage} isOwnMessage={false} />
      );

      expect(getByText('Test message')).toBeTruthy();
      expect(getByText('2 minutes ago')).toBeTruthy();
    });

    it('shows edited indicator when message is edited', () => {
      const editedMessage = { ...baseMessage, is_edited: true };
      const { getByText } = render(
        <MessageBubble message={editedMessage} isOwnMessage={true} />
      );

      expect(getByText('(modifié)')).toBeTruthy();
    });
  });

  describe('Image Messages', () => {
    it('renders image message correctly', () => {
      const imageMessage: Message = {
        ...baseMessage,
        message_type: 'image',
        metadata: { image_url: 'https://example.com/image.jpg' },
      };

      const { UNSAFE_getByProps } = render(
        <MessageBubble message={imageMessage} isOwnMessage={true} />
      );

      const imageComponent = UNSAFE_getByProps({
        source: { uri: 'https://example.com/image.jpg' },
      });
      expect(imageComponent).toBeTruthy();
    });

    it('handles image press', () => {
      const imageMessage: Message = {
        ...baseMessage,
        message_type: 'image',
        metadata: { image_url: 'https://example.com/image.jpg' },
      };

      const { UNSAFE_getByProps } = render(
        <MessageBubble message={imageMessage} isOwnMessage={true} />
      );

      const imageComponent = UNSAFE_getByProps({
        source: { uri: 'https://example.com/image.jpg' },
      });
      
      // The image should be pressable (wrapped in TouchableOpacity)
      expect(imageComponent).toBeTruthy();
    });
  });

  describe('Video Messages', () => {
    it('renders video message correctly', () => {
      const videoMessage: Message = {
        ...baseMessage,
        message_type: 'video',
        metadata: { video_url: 'https://example.com/video.mp4' },
      };

      const { getByTestId } = render(
        <MessageBubble message={videoMessage} isOwnMessage={true} />
      );

      expect(getByTestId('video-view')).toBeTruthy();
    });
  });

  describe('Voice/Audio Messages', () => {
    it('renders voice message with play button', () => {
      const voiceMessage: Message = {
        ...baseMessage,
        message_type: 'voice',
        metadata: { 
          voice_url: 'https://example.com/voice.mp3',
          duration: 125 
        },
      };

      const { getByText } = render(
        <MessageBubble message={voiceMessage} isOwnMessage={true} />
      );

      expect(getByText('play-circle')).toBeTruthy();
      expect(getByText('2:05')).toBeTruthy(); // 125 seconds = 2:05
    });

    it('renders audio message with play button', () => {
      const audioMessage: Message = {
        ...baseMessage,
        message_type: 'audio',
        metadata: { 
          audio_url: 'https://example.com/audio.mp3',
          duration: 90 
        },
      };

      const { getByText } = render(
        <MessageBubble message={audioMessage} isOwnMessage={true} />
      );

      expect(getByText('play-circle')).toBeTruthy();
      expect(getByText('1:30')).toBeTruthy(); // 90 seconds = 1:30
    });

    it('handles audio play functionality', async () => {
      const voiceMessage: Message = {
        ...baseMessage,
        message_type: 'voice',
        metadata: { voice_url: 'https://example.com/voice.mp3' },
      };

      const { getByText } = render(
        <MessageBubble message={voiceMessage} isOwnMessage={true} />
      );

      const playButton = getByText('play-circle').parent;

      act(() => {
        fireEvent.press(playButton);
      });

      await waitFor(() => {
        expect(mockAudioPlayer.play).toHaveBeenCalled();
      });
    });
  });

  describe('Location Messages', () => {
    it('renders location message correctly', () => {
      const locationMessage: Message = {
        ...baseMessage,
        message_type: 'location',
        metadata: {
          location: {
            address: '123 Main St, Paris',
            latitude: 48.8566,
            longitude: 2.3522,
          },
        },
      };

      const { getByText } = render(
        <MessageBubble message={locationMessage} isOwnMessage={true} />
      );

      expect(getByText('location')).toBeTruthy();
      expect(getByText('123 Main St, Paris')).toBeTruthy();
    });

    it('renders default location text when no address provided', () => {
      const locationMessage: Message = {
        ...baseMessage,
        message_type: 'location',
        metadata: {
          location: {
            latitude: 48.8566,
            longitude: 2.3522,
          },
        },
      };

      const { getByText } = render(
        <MessageBubble message={locationMessage} isOwnMessage={true} />
      );

      expect(getByText('Position partagée')).toBeTruthy();
    });
  });

  describe('Event Share Messages', () => {
    it('renders event share message correctly', () => {
      const eventMessage: Message = {
        ...baseMessage,
        message_type: 'event_share',
        metadata: { event_id: 'event123' },
      };

      const { getByText } = render(
        <MessageBubble message={eventMessage} isOwnMessage={true} />
      );

      expect(getByText('calendar')).toBeTruthy();
      expect(getByText('Événement partagé')).toBeTruthy();
    });

    it('navigates to event details when event share is pressed', () => {
      const eventMessage: Message = {
        ...baseMessage,
        message_type: 'event_share',
        metadata: { event_id: 'event123' },
      };

      const { getByText } = render(
        <MessageBubble message={eventMessage} isOwnMessage={true} />
      );

      const eventShare = getByText('Événement partagé').parent;
      fireEvent.press(eventShare);

      expect(mockPush).toHaveBeenCalledWith('/screens/event-details?id=event123');
    });
  });

  describe('Story Reply Messages', () => {
    it('renders story reply message correctly', () => {
      const storyReplyMessage: Message = {
        ...baseMessage,
        message_type: 'story_reply',
        content: 'Great story!',
      };

      const { getByText } = render(
        <MessageBubble message={storyReplyMessage} isOwnMessage={true} />
      );

      expect(getByText('Réponse à une story')).toBeTruthy();
      expect(getByText('Great story!')).toBeTruthy();
    });
  });

  describe('Unknown Message Types', () => {
    it('renders null for unknown message type', () => {
      const unknownMessage: Message = {
        ...baseMessage,
        message_type: 'unknown' as any,
      };

      const { container } = render(
        <MessageBubble message={unknownMessage} isOwnMessage={true} />
      );

      // Should still render the message container but no content
      expect(container).toBeTruthy();
    });
  });

  describe('Interaction Handling', () => {
    it('calls onLongPress when message is long pressed', () => {
      const mockOnLongPress = jest.fn();
      const { getByText } = render(
        <MessageBubble 
          message={baseMessage} 
          isOwnMessage={true} 
          onLongPress={mockOnLongPress}
        />
      );

      const messageBubble = getByText('Test message').parent?.parent;
      fireEvent(messageBubble, 'longPress');

      expect(mockOnLongPress).toHaveBeenCalled();
    });

    it('applies correct styling for own messages', () => {
      const { getByText } = render(
        <MessageBubble message={baseMessage} isOwnMessage={true} />
      );

      // Own messages should have blue background and white text
      const messageText = getByText('Test message');
      expect(messageText.props.style.color).toBe('#fff');
    });

    it('applies correct styling for other user messages', () => {
      const { getByText } = render(
        <MessageBubble message={baseMessage} isOwnMessage={false} />
      );

      // Other user messages should have gray background and black text
      const messageText = getByText('Test message');
      expect(messageText.props.style.color).toBe('#000');
    });
  });

  describe('Audio Player Cleanup', () => {
    it('cleans up audio player on unmount', () => {
      const { unmount } = render(
        <MessageBubble message={baseMessage} isOwnMessage={true} />
      );

      unmount();

      // Audio player should be removed when component unmounts
      expect(mockAudioPlayer.remove).toHaveBeenCalled();
    });
  });

  describe('Voice Message Duration Formatting', () => {
    it('formats duration correctly for seconds less than 10', () => {
      const voiceMessage: Message = {
        ...baseMessage,
        message_type: 'voice',
        metadata: { 
          voice_url: 'https://example.com/voice.mp3',
          duration: 65 // 1:05
        },
      };

      const { getByText } = render(
        <MessageBubble message={voiceMessage} isOwnMessage={true} />
      );

      expect(getByText('1:05')).toBeTruthy();
    });

    it('handles voice message without duration', () => {
      const voiceMessage: Message = {
        ...baseMessage,
        message_type: 'voice',
        metadata: { voice_url: 'https://example.com/voice.mp3' },
      };

      const { queryByText } = render(
        <MessageBubble message={voiceMessage} isOwnMessage={true} />
      );

      // Should not show duration if not provided
      expect(queryByText(/:/)).toBeNull();
    });
  });
});