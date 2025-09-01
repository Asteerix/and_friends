import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { StoriesScreen } from '../screens/StoriesScreen';
import { CreateStoryScreen } from '../screens/CreateStoryScreen';
import { supabase } from '@/shared/lib/supabase/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';

jest.mock('@/shared/lib/supabase/client');
jest.mock('expo-image-picker');
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(),
  saveToLibraryAsync: jest.fn(),
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

describe('StoriesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: {
        session: {
          user: { id: 'current-user-id' },
        },
      },
      error: null,
    });

    // Mock stories data
    (supabase.from as jest.Mock).mockImplementation((table) => {
      if (table === 'stories') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'story-1',
                user_id: 'user-1',
                media_url: 'https://example.com/story1.jpg',
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 86400000).toISOString(),
                user: {
                  name: 'John Doe',
                  avatar_url: 'https://example.com/avatar1.jpg',
                },
                views: [],
              },
              {
                id: 'story-2',
                user_id: 'user-2',
                media_url: 'https://example.com/story2.jpg',
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 86400000).toISOString(),
                user: {
                  name: 'Jane Smith',
                  avatar_url: 'https://example.com/avatar2.jpg',
                },
                views: [],
              },
            ],
            error: null,
          }),
          insert: jest.fn().mockReturnThis(),
        };
      }
      if (table === 'story_views') {
        return {
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    });
  });

  it('should render stories list', async () => {
    const { getByText } = renderWithProviders(
      <StoriesScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Jane Smith')).toBeTruthy();
    });
  });

  it('should navigate to story viewer on tap', async () => {
    const { getByTestId } = renderWithProviders(
      <StoriesScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      const storyItem = getByTestId('story-item-0');
      fireEvent.press(storyItem);
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith('StoryViewer', {
      stories: expect.any(Array),
      initialIndex: 0,
    });
  });

  it('should show add story button for current user', async () => {
    const { getByTestId } = renderWithProviders(
      <StoriesScreen navigation={mockNavigation} />
    );

    const addStoryButton = getByTestId('add-story-button');
    expect(addStoryButton).toBeTruthy();

    fireEvent.press(addStoryButton);
    expect(mockNavigation.navigate).toHaveBeenCalledWith('CreateStory');
  });

  it('should handle story expiration', async () => {
    // Mock expired story
    (supabase.from as jest.Mock).mockImplementationOnce(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'expired-story',
            user_id: 'user-1',
            media_url: 'https://example.com/expired.jpg',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            expires_at: new Date(Date.now() - 3600000).toISOString(), // Expired 1 hour ago
            user: {
              name: 'Expired User',
              avatar_url: 'https://example.com/avatar.jpg',
            },
          },
        ],
        error: null,
      }),
    }));

    const { queryByText } = renderWithProviders(
      <StoriesScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      // Expired story should not be displayed
      expect(queryByText('Expired User')).toBeNull();
    });
  });

  it('should track story views', async () => {
    const { getByTestId } = renderWithProviders(
      <StoriesScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      const storyItem = getByTestId('story-item-0');
      fireEvent.press(storyItem);
    });

    // Verify view tracking
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('story_views');
    });
  });
});

describe('CreateStoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      cancelled: false,
      assets: [{ uri: 'file://test-image.jpg', type: 'image' }],
    });

    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      cancelled: false,
      assets: [{ uri: 'file://camera-image.jpg', type: 'image' }],
    });

    (supabase.storage.from as jest.Mock).mockReturnValue({
      upload: jest.fn().mockResolvedValue({
        data: { path: 'stories/test-story.jpg' },
        error: null,
      }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/stories/test-story.jpg' },
      }),
    });
  });

  it('should render create story screen', () => {
    const { getByText, getByTestId } = renderWithProviders(
      <CreateStoryScreen navigation={mockNavigation} />
    );

    expect(getByText('Create Story')).toBeTruthy();
    expect(getByTestId('camera-button')).toBeTruthy();
    expect(getByTestId('gallery-button')).toBeTruthy();
  });

  it('should handle image selection from gallery', async () => {
    const { getByTestId } = renderWithProviders(
      <CreateStoryScreen navigation={mockNavigation} />
    );

    const galleryButton = getByTestId('gallery-button');
    fireEvent.press(galleryButton);

    await waitFor(() => {
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      expect(getByTestId('selected-media')).toBeTruthy();
    });
  });

  it('should handle camera capture', async () => {
    const { getByTestId } = renderWithProviders(
      <CreateStoryScreen navigation={mockNavigation} />
    );

    const cameraButton = getByTestId('camera-button');
    fireEvent.press(cameraButton);

    await waitFor(() => {
      expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
      expect(getByTestId('selected-media')).toBeTruthy();
    });
  });

  it('should upload story with caption', async () => {
    const { getByTestId, getByPlaceholderText } = renderWithProviders(
      <CreateStoryScreen navigation={mockNavigation} />
    );

    // Select image
    const galleryButton = getByTestId('gallery-button');
    fireEvent.press(galleryButton);

    await waitFor(() => {
      expect(getByTestId('selected-media')).toBeTruthy();
    });

    // Add caption
    const captionInput = getByPlaceholderText('Add a caption...');
    fireEvent.changeText(captionInput, 'Test caption');

    // Upload story
    const uploadButton = getByTestId('upload-button');
    fireEvent.press(uploadButton);

    await waitFor(() => {
      expect(supabase.storage.from).toHaveBeenCalledWith('stories');
      expect(supabase.from).toHaveBeenCalledWith('stories');
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  it('should show upload progress', async () => {
    const { getByTestId, getByText } = renderWithProviders(
      <CreateStoryScreen navigation={mockNavigation} />
    );

    // Select image
    const galleryButton = getByTestId('gallery-button');
    fireEvent.press(galleryButton);

    await waitFor(() => {
      const uploadButton = getByTestId('upload-button');
      fireEvent.press(uploadButton);
    });

    // Check for progress indicator
    expect(getByTestId('upload-progress')).toBeTruthy();
  });

  it('should handle upload errors', async () => {
    (supabase.storage.from as jest.Mock).mockReturnValue({
      upload: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Upload failed' },
      }),
    });

    const { getByTestId, getByText } = renderWithProviders(
      <CreateStoryScreen navigation={mockNavigation} />
    );

    // Select image
    const galleryButton = getByTestId('gallery-button');
    fireEvent.press(galleryButton);

    await waitFor(() => {
      const uploadButton = getByTestId('upload-button');
      fireEvent.press(uploadButton);
    });

    await waitFor(() => {
      expect(getByText('Upload failed')).toBeTruthy();
    });
  });

  it('should validate media before upload', async () => {
    // Mock invalid file
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      cancelled: false,
      assets: [{ uri: 'file://invalid.txt', type: 'text' }],
    });

    const { getByTestId, getByText } = renderWithProviders(
      <CreateStoryScreen navigation={mockNavigation} />
    );

    const galleryButton = getByTestId('gallery-button');
    fireEvent.press(galleryButton);

    await waitFor(() => {
      expect(getByText('Please select an image or video')).toBeTruthy();
    });
  });

  it('should handle story privacy settings', () => {
    const { getByTestId, getByText } = renderWithProviders(
      <CreateStoryScreen navigation={mockNavigation} />
    );

    const privacyButton = getByTestId('privacy-button');
    fireEvent.press(privacyButton);

    // Check privacy options
    expect(getByText('Everyone')).toBeTruthy();
    expect(getByText('Friends Only')).toBeTruthy();
    expect(getByText('Close Friends')).toBeTruthy();
  });

  it('should handle story duration settings', () => {
    const { getByTestId, getByText } = renderWithProviders(
      <CreateStoryScreen navigation={mockNavigation} />
    );

    const durationButton = getByTestId('duration-button');
    fireEvent.press(durationButton);

    // Check duration options
    expect(getByText('24 hours')).toBeTruthy();
    expect(getByText('12 hours')).toBeTruthy();
    expect(getByText('6 hours')).toBeTruthy();
  });
});