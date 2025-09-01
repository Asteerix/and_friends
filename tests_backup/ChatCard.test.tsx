import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ChatCard from '../../features/chat/components/ChatCard';
import { NavigationContainer } from '@react-navigation/native';

const mockChat = {
  id: '1',
  name: 'Test Chat',
  last_message: 'Hello world',
  last_message_time: new Date('2024-01-15T10:30:00Z'),
  unread_count: 3,
  participants: [
    { id: '1', name: 'User 1', avatar: 'https://example.com/avatar1.jpg' },
    { id: '2', name: 'User 2', avatar: 'https://example.com/avatar2.jpg' },
  ],
  is_group: true,
  is_online: true,
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <NavigationContainer>
    {children}
  </NavigationContainer>
);

describe('ChatCard', () => {
  it('renders chat information correctly', () => {
    const { getByText, getByTestId } = render(
      <TestWrapper>
        <ChatCard chat={mockChat} />
      </TestWrapper>
    );

    expect(getByText('Test Chat')).toBeTruthy();
    expect(getByText('Hello world')).toBeTruthy();
    expect(getByText('3')).toBeTruthy(); // Unread count
    expect(getByTestId('chat-card-container')).toBeTruthy();
  });

  it('handles press events correctly', () => {
    const mockOnPress = jest.fn();
    
    const { getByTestId } = render(
      <TestWrapper>
        <ChatCard chat={mockChat} onPress={mockOnPress} />
      </TestWrapper>
    );

    const chatCard = getByTestId('chat-card-container');
    fireEvent.press(chatCard);

    expect(mockOnPress).toHaveBeenCalledWith(mockChat);
  });

  it('shows online indicator when user is online', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <ChatCard chat={mockChat} />
      </TestWrapper>
    );

    expect(getByTestId('online-indicator')).toBeTruthy();
  });

  it('hides online indicator when user is offline', () => {
    const offlineChat = { ...mockChat, is_online: false };
    
    const { queryByTestId } = render(
      <TestWrapper>
        <ChatCard chat={offlineChat} />
      </TestWrapper>
    );

    expect(queryByTestId('online-indicator')).toBeNull();
  });

  it('displays unread count badge', () => {
    const { getByTestId, getByText } = render(
      <TestWrapper>
        <ChatCard chat={mockChat} />
      </TestWrapper>
    );

    expect(getByTestId('unread-badge')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
  });

  it('hides unread badge when count is zero', () => {
    const readChat = { ...mockChat, unread_count: 0 };
    
    const { queryByTestId } = render(
      <TestWrapper>
        <ChatCard chat={readChat} />
      </TestWrapper>
    );

    expect(queryByTestId('unread-badge')).toBeNull();
  });

  it('formats timestamp correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <ChatCard chat={mockChat} />
      </TestWrapper>
    );

    // Should display relative time
    expect(getByText('10:30 AM')).toBeTruthy();
  });

  it('shows group chat indicator', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <ChatCard chat={mockChat} />
      </TestWrapper>
    );

    expect(getByTestId('group-indicator')).toBeTruthy();
  });

  it('hides group indicator for direct messages', () => {
    const directChat = { ...mockChat, is_group: false };
    
    const { queryByTestId } = render(
      <TestWrapper>
        <ChatCard chat={directChat} />
      </TestWrapper>
    );

    expect(queryByTestId('group-indicator')).toBeNull();
  });

  it('handles long messages with ellipsis', () => {
    const longMessageChat = {
      ...mockChat,
      last_message: 'This is a very long message that should be truncated with ellipsis when displayed in the chat card component'
    };
    
    const { getByTestId } = render(
      <TestWrapper>
        <ChatCard chat={longMessageChat} />
      </TestWrapper>
    );

    const messageText = getByTestId('last-message-text');
    expect(messageText.props.numberOfLines).toBe(1);
    expect(messageText.props.ellipsizeMode).toBe('tail');
  });

  it('handles missing avatar gracefully', () => {
    const noAvatarChat = {
      ...mockChat,
      participants: [
        { id: '1', name: 'User 1', avatar: null },
      ]
    };
    
    const { getByTestId } = render(
      <TestWrapper>
        <ChatCard chat={noAvatarChat} />
      </TestWrapper>
    );

    expect(getByTestId('default-avatar')).toBeTruthy();
  });
});