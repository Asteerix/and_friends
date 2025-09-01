import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ConversationScreen } from '../screens/ConversationScreen';
import { supabase } from '@/shared/lib/supabase/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/shared/lib/supabase/client');
jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn(),
    setAudioModeAsync: jest.fn(),
    Recording: jest.fn(),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

const mockRoute = {
  params: {
    conversationId: 'test-conversation-id',
    recipientName: 'Test User',
  },
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('ConversationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock auth session
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: {
        session: {
          user: { id: 'current-user-id' },
        },
      },
      error: null,
    });

    // Mock messages
    (supabase.from as jest.Mock).mockImplementation((table) => {
      if (table === 'messages') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'msg-1',
                content: 'Hello!',
                sender_id: 'current-user-id',
                created_at: new Date().toISOString(),
                read: true,
              },
              {
                id: 'msg-2',
                content: 'Hi there!',
                sender_id: 'other-user-id',
                created_at: new Date().toISOString(),
                read: false,
              },
            ],
            error: null,
          }),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    // Mock realtime subscription
    (supabase.channel as jest.Mock).mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnValue({ status: 'SUBSCRIBED' }),
      unsubscribe: jest.fn(),
    });
  });

  it('should render conversation screen with messages', async () => {
    const { getByText } = renderWithProviders(
      <ConversationScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(getByText('Hello!')).toBeTruthy();
      expect(getByText('Hi there!')).toBeTruthy();
    });
  });

  it('should send a text message', async () => {
    const { getByPlaceholderText, getByTestId } = renderWithProviders(
      <ConversationScreen navigation={mockNavigation} route={mockRoute} />
    );

    const messageInput = getByPlaceholderText('Type a message...');
    fireEvent.changeText(messageInput, 'New message');

    const sendButton = getByTestId('send-button');
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('messages');
      expect(messageInput.props.value).toBe('');
    });
  });

  it('should handle empty message submission', async () => {
    const { getByPlaceholderText, getByTestId } = renderWithProviders(
      <ConversationScreen navigation={mockNavigation} route={mockRoute} />
    );

    const messageInput = getByPlaceholderText('Type a message...');
    const sendButton = getByTestId('send-button');
    
    // Try to send empty message
    fireEvent.press(sendButton);

    await waitFor(() => {
      // Should not call API with empty message
      expect(supabase.from).not.toHaveBeenCalledWith('messages');
    });
  });

  it('should handle image attachment', async () => {
    const { getByTestId } = renderWithProviders(
      <ConversationScreen navigation={mockNavigation} route={mockRoute} />
    );

    const attachButton = getByTestId('attach-button');
    fireEvent.press(attachButton);

    // Verify attachment options appear
    await waitFor(() => {
      expect(getByTestId('photo-option')).toBeTruthy();
      expect(getByTestId('camera-option')).toBeTruthy();
    });
  });

  it('should handle voice message recording', async () => {
    const { getByTestId } = renderWithProviders(
      <ConversationScreen navigation={mockNavigation} route={mockRoute} />
    );

    const voiceButton = getByTestId('voice-button');
    
    // Start recording
    fireEvent.pressIn(voiceButton);
    
    // Stop recording
    fireEvent.pressOut(voiceButton);

    await waitFor(() => {
      expect(getByTestId('voice-preview')).toBeTruthy();
    });
  });

  it('should mark messages as read', async () => {
    const { getByText } = renderWithProviders(
      <ConversationScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(getByText('Hi there!')).toBeTruthy();
    });

    // Verify read status update was called
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('messages');
    });
  });

  it('should handle message deletion', async () => {
    const { getByText, getByTestId } = renderWithProviders(
      <ConversationScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      const message = getByText('Hello!');
      fireEvent.longPress(message);
    });

    const deleteButton = getByTestId('delete-message-button');
    fireEvent.press(deleteButton);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('messages');
    });
  });

  it('should handle typing indicator', async () => {
    const { getByPlaceholderText, getByTestId } = renderWithProviders(
      <ConversationScreen navigation={mockNavigation} route={mockRoute} />
    );

    const messageInput = getByPlaceholderText('Type a message...');
    fireEvent.changeText(messageInput, 'Typing...');

    // Check if typing indicator is shown
    await waitFor(() => {
      expect(getByTestId('typing-indicator')).toBeTruthy();
    });
  });

  it('should handle real-time message updates', async () => {
    const { getByText } = renderWithProviders(
      <ConversationScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Simulate incoming real-time message
    const mockChannel = (supabase.channel as jest.Mock).mock.results[0].value;
    const mockCallback = mockChannel.on.mock.calls[0][2];
    
    mockCallback({
      eventType: 'INSERT',
      new: {
        id: 'msg-3',
        content: 'Real-time message!',
        sender_id: 'other-user-id',
        created_at: new Date().toISOString(),
      },
    });

    await waitFor(() => {
      expect(getByText('Real-time message!')).toBeTruthy();
    });
  });

  it('should handle scroll to bottom', async () => {
    const { getByTestId } = renderWithProviders(
      <ConversationScreen navigation={mockNavigation} route={mockRoute} />
    );

    const scrollToBottomButton = getByTestId('scroll-to-bottom');
    fireEvent.press(scrollToBottomButton);

    // Verify scroll action
    await waitFor(() => {
      expect(getByTestId('message-list').props.contentOffset.y).toBe(0);
    });
  });

  it('should handle message retry on failure', async () => {
    // Mock failed message send
    (supabase.from as jest.Mock).mockImplementationOnce(() => ({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Network error' },
      }),
    }));

    const { getByPlaceholderText, getByTestId, getByText } = renderWithProviders(
      <ConversationScreen navigation={mockNavigation} route={mockRoute} />
    );

    const messageInput = getByPlaceholderText('Type a message...');
    fireEvent.changeText(messageInput, 'Failed message');

    const sendButton = getByTestId('send-button');
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(getByText('Failed to send')).toBeTruthy();
      
      const retryButton = getByTestId('retry-button');
      fireEvent.press(retryButton);
    });
  });
});