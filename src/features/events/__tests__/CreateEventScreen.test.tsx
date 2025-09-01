import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CreateEventScreen } from '../screens/CreateEventScreen';
import { supabase } from '@/shared/lib/supabase/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/shared/lib/supabase/client');
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
  requestMediaLibraryPermissionsAsync: jest.fn(),
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

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('CreateEventScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: {
        session: {
          user: { id: 'test-user-id' },
        },
      },
      error: null,
    });

    (supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'new-event-id' },
        error: null,
      }),
    });
  });

  it('should render create event form', () => {
    const { getByPlaceholderText, getByText } = renderWithProviders(
      <CreateEventScreen navigation={mockNavigation} />
    );

    expect(getByPlaceholderText('Event Title')).toBeTruthy();
    expect(getByPlaceholderText('Description')).toBeTruthy();
    expect(getByPlaceholderText('Location')).toBeTruthy();
    expect(getByText('Create Event')).toBeTruthy();
  });

  it('should validate required fields', async () => {
    const { getByText, getByTestId } = renderWithProviders(
      <CreateEventScreen navigation={mockNavigation} />
    );

    const createButton = getByTestId('create-event-button');
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(getByText('Title is required')).toBeTruthy();
      expect(getByText('Location is required')).toBeTruthy();
    });
  });

  it('should create event with valid data', async () => {
    const { getByPlaceholderText, getByTestId } = renderWithProviders(
      <CreateEventScreen navigation={mockNavigation} />
    );

    // Fill in form
    fireEvent.changeText(getByPlaceholderText('Event Title'), 'Test Event');
    fireEvent.changeText(getByPlaceholderText('Description'), 'Test Description');
    fireEvent.changeText(getByPlaceholderText('Location'), 'Paris, France');

    // Submit form
    const createButton = getByTestId('create-event-button');
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('events');
      expect(mockNavigation.navigate).toHaveBeenCalledWith('EventDetails', {
        eventId: 'new-event-id',
      });
    });
  });

  it('should handle date selection', async () => {
    const { getByTestId } = renderWithProviders(
      <CreateEventScreen navigation={mockNavigation} />
    );

    const dateButton = getByTestId('date-picker-button');
    fireEvent.press(dateButton);

    // Verify date picker is shown
    await waitFor(() => {
      expect(getByTestId('date-picker')).toBeTruthy();
    });
  });

  it('should handle image selection', async () => {
    const mockImagePicker = require('expo-image-picker');
    mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
      cancelled: false,
      assets: [{ uri: 'file://test-image.jpg' }],
    });

    const { getByTestId } = renderWithProviders(
      <CreateEventScreen navigation={mockNavigation} />
    );

    const imageButton = getByTestId('add-image-button');
    fireEvent.press(imageButton);

    await waitFor(() => {
      expect(mockImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    });
  });

  it('should handle capacity limit', () => {
    const { getByPlaceholderText, getByTestId } = renderWithProviders(
      <CreateEventScreen navigation={mockNavigation} />
    );

    const capacityToggle = getByTestId('capacity-toggle');
    fireEvent.press(capacityToggle);

    const capacityInput = getByPlaceholderText('Max attendees');
    fireEvent.changeText(capacityInput, '50');

    expect(capacityInput.props.value).toBe('50');
  });

  it('should handle private event toggle', () => {
    const { getByTestId } = renderWithProviders(
      <CreateEventScreen navigation={mockNavigation} />
    );

    const privateToggle = getByTestId('private-event-toggle');
    fireEvent.press(privateToggle);

    // Verify private event options appear
    expect(getByTestId('invite-only-option')).toBeTruthy();
  });

  it('should handle event categories', () => {
    const { getByTestId, getByText } = renderWithProviders(
      <CreateEventScreen navigation={mockNavigation} />
    );

    const categoryButton = getByTestId('category-button');
    fireEvent.press(categoryButton);

    // Select a category
    const partyCategory = getByText('Party');
    fireEvent.press(partyCategory);

    expect(getByTestId('selected-category').props.children).toContain('Party');
  });

  it('should handle error during event creation', async () => {
    const errorMessage = 'Failed to create event';
    (supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { message: errorMessage },
      }),
    });

    const { getByPlaceholderText, getByTestId, getByText } = renderWithProviders(
      <CreateEventScreen navigation={mockNavigation} />
    );

    // Fill in form
    fireEvent.changeText(getByPlaceholderText('Event Title'), 'Test Event');
    fireEvent.changeText(getByPlaceholderText('Location'), 'Paris');

    // Submit
    fireEvent.press(getByTestId('create-event-button'));

    await waitFor(() => {
      expect(getByText(errorMessage)).toBeTruthy();
    });
  });

  it('should handle recurring events', () => {
    const { getByTestId, getByText } = renderWithProviders(
      <CreateEventScreen navigation={mockNavigation} />
    );

    const recurringToggle = getByTestId('recurring-toggle');
    fireEvent.press(recurringToggle);

    // Verify recurring options appear
    expect(getByText('Daily')).toBeTruthy();
    expect(getByText('Weekly')).toBeTruthy();
    expect(getByText('Monthly')).toBeTruthy();
  });
});