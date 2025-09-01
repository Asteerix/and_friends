import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ProfileOptionsButton from '../../features/profile/components/ProfileOptionsButton';

describe('ProfileOptionsButton', () => {
  const mockOptions = [
    { id: '1', label: 'Edit Profile', icon: 'pencil', onPress: jest.fn() },
    { id: '2', label: 'Settings', icon: 'settings', onPress: jest.fn() },
    { id: '3', label: 'Logout', icon: 'log-out', onPress: jest.fn(), danger: true },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders options button correctly', () => {
    const { getByTestId } = render(
      <ProfileOptionsButton options={mockOptions} />
    );

    expect(getByTestId('profile-options-button')).toBeTruthy();
  });

  it('opens options menu when pressed', () => {
    const { getByTestId } = render(
      <ProfileOptionsButton options={mockOptions} />
    );

    const optionsButton = getByTestId('profile-options-button');
    fireEvent.press(optionsButton);

    expect(getByTestId('options-menu')).toBeTruthy();
  });

  it('displays all options in menu', () => {
    const { getByTestId, getByText } = render(
      <ProfileOptionsButton options={mockOptions} />
    );

    fireEvent.press(getByTestId('profile-options-button'));

    expect(getByText('Edit Profile')).toBeTruthy();
    expect(getByText('Settings')).toBeTruthy();
    expect(getByText('Logout')).toBeTruthy();
  });

  it('calls option handler when option is pressed', () => {
    const { getByTestId, getByText } = render(
      <ProfileOptionsButton options={mockOptions} />
    );

    fireEvent.press(getByTestId('profile-options-button'));
    fireEvent.press(getByText('Edit Profile'));

    expect(mockOptions[0].onPress).toHaveBeenCalled();
  });

  it('closes menu after option selection', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <ProfileOptionsButton options={mockOptions} />
    );

    fireEvent.press(getByTestId('profile-options-button'));
    fireEvent.press(getByText('Settings'));

    expect(queryByTestId('options-menu')).toBeNull();
  });

  it('applies danger styling to danger options', () => {
    const { getByTestId, getByText } = render(
      <ProfileOptionsButton options={mockOptions} />
    );

    fireEvent.press(getByTestId('profile-options-button'));
    
    const logoutOption = getByText('Logout');
    expect(logoutOption.props.style).toMatchObject(
      expect.objectContaining({
        color: expect.stringMatching(/(red|#ff|#f00|#dc3545|#ef4444)/i),
      })
    );
  });

  it('displays icons for options', () => {
    const { getByTestId } = render(
      <ProfileOptionsButton options={mockOptions} />
    );

    fireEvent.press(getByTestId('profile-options-button'));

    expect(getByTestId('option-icon-pencil')).toBeTruthy();
    expect(getByTestId('option-icon-settings')).toBeTruthy();
    expect(getByTestId('option-icon-log-out')).toBeTruthy();
  });

  it('closes menu when backdrop is pressed', () => {
    const { getByTestId, queryByTestId } = render(
      <ProfileOptionsButton options={mockOptions} />
    );

    fireEvent.press(getByTestId('profile-options-button'));
    fireEvent.press(getByTestId('options-backdrop'));

    expect(queryByTestId('options-menu')).toBeNull();
  });

  it('handles empty options array', () => {
    const { getByTestId } = render(
      <ProfileOptionsButton options={[]} />
    );

    expect(getByTestId('profile-options-button')).toBeTruthy();
    
    fireEvent.press(getByTestId('profile-options-button'));
    
    // Menu should still open but be empty
    expect(getByTestId('options-menu')).toBeTruthy();
  });

  it('supports custom button styling', () => {
    const customStyle = { backgroundColor: '#007AFF' };
    
    const { getByTestId } = render(
      <ProfileOptionsButton 
        options={mockOptions} 
        buttonStyle={customStyle}
      />
    );

    const button = getByTestId('profile-options-button');
    expect(button.props.style).toMatchObject(
      expect.objectContaining(customStyle)
    );
  });
});