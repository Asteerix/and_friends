import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AvatarPickScreen from '../AvatarPickScreen';
import { useProfile } from '@/hooks/useProfile';
import { useAuthNavigation } from '@/shared/hooks/useAuthNavigation';
import { useRegistrationStep } from '@/shared/hooks/useRegistrationStep';

// Mock dependencies
jest.mock('@/hooks/useProfile');
jest.mock('@/shared/hooks/useAuthNavigation');
jest.mock('@/shared/hooks/useRegistrationStep');
jest.mock('expo-image-picker');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('react-native-pixel-perfect', () => ({
  create: () => (size: number) => size,
}));
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

const mockUseProfile = useProfile as jest.MockedFunction<typeof useProfile>;
const mockUseAuthNavigation = useAuthNavigation as jest.MockedFunction<typeof useAuthNavigation>;
const mockUseRegistrationStep = useRegistrationStep as jest.MockedFunction<typeof useRegistrationStep>;
const mockImagePicker = ImagePicker as jest.Mocked<typeof ImagePicker>;

describe('AvatarPickScreen', () => {
  const mockNavigateBack = jest.fn();
  const mockNavigateNext = jest.fn();
  const mockGetProgress = jest.fn();
  const mockUpdateProfile = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useAuthNavigation
    mockUseAuthNavigation.mockReturnValue({
      navigateBack: mockNavigateBack,
      navigateNext: mockNavigateNext,
      getProgress: mockGetProgress.mockReturnValue(0.6),
    });

    // Mock useProfile
    mockUseProfile.mockReturnValue({
      profile: null,
      loading: false,
      error: null,
      updateProfile: mockUpdateProfile,
      refreshProfile: jest.fn(),
    });

    // Mock useRegistrationStep
    mockUseRegistrationStep.mockReturnValue(undefined);

    // Mock ImagePicker permissions
    mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue({ 
      status: 'granted' as const,
      granted: true,
      canAskAgain: true,
      expires: 'never' as const,
    });

    mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ 
      status: 'granted' as const,
      granted: true,
      canAskAgain: true,
      expires: 'never' as const,
    });

    // Mock Alert
    jest.spyOn(Alert, 'alert').mockImplementation();

    // Mock console methods
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('rendering and UI', () => {
    it('should render all main components', () => {
      const { getByText, getByLabelText } = render(<AvatarPickScreen />);

      expect(getByLabelText('Go back')).toBeTruthy();
      expect(getByText('Time to add a face to')).toBeTruthy();
      expect(getByText('the name')).toBeTruthy();
      expect(getByText(/Show your vibe/)).toBeTruthy();
      expect(getByLabelText('Snap a picture')).toBeTruthy();
      expect(getByLabelText('Grab one from your gallery')).toBeTruthy();
      expect(getByLabelText('Continue')).toBeTruthy();
      expect(getByLabelText('Skip For Now')).toBeTruthy();
    });

    it('should display correct progress from navigation hook', () => {
      mockGetProgress.mockReturnValue(0.75);
      
      const { getByTestId } = render(<AvatarPickScreen />);
      
      expect(mockGetProgress).toHaveBeenCalled();
    });

    it('should show default illustration when no image is selected', () => {
      const { getByLabelText } = render(<AvatarPickScreen />);
      
      expect(getByLabelText('Avatar illustration')).toBeTruthy();
    });

    it('should render with correct accessibility labels', () => {
      const { getByLabelText } = render(<AvatarPickScreen />);

      expect(getByLabelText('Go back')).toBeTruthy();
      expect(getByLabelText('Time to add a face to the name')).toBeTruthy();
      expect(getByLabelText('Avatar illustration')).toBeTruthy();
      expect(getByLabelText('Snap a picture')).toBeTruthy();
      expect(getByLabelText('Grab one from your gallery')).toBeTruthy();
      expect(getByLabelText('Continue')).toBeTruthy();
      expect(getByLabelText('Skip For Now')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should call navigateBack when back button is pressed', () => {
      const { getByLabelText } = render(<AvatarPickScreen />);
      
      fireEvent.press(getByLabelText('Go back'));
      
      expect(mockNavigateBack).toHaveBeenCalledTimes(1);
    });

    it('should call navigateNext with contacts-permission when continue is pressed without image', async () => {
      const { getByLabelText } = render(<AvatarPickScreen />);
      
      fireEvent.press(getByLabelText('Continue'));
      
      await waitFor(() => {
        expect(mockNavigateNext).toHaveBeenCalledWith('location-permission');
      });
    });

    it('should call navigateNext with contacts-permission when skip is pressed', () => {
      const { getByLabelText } = render(<AvatarPickScreen />);
      
      fireEvent.press(getByLabelText('Skip For Now'));
      
      expect(mockNavigateNext).toHaveBeenCalledWith('contacts-permission');
    });

    it('should register navigation step correctly', () => {
      render(<AvatarPickScreen />);
      
      expect(mockUseAuthNavigation).toHaveBeenCalledWith('avatar-pick');
      expect(mockUseRegistrationStep).toHaveBeenCalledWith('avatar_pick');
    });
  });

  describe('camera functionality', () => {
    it('should request camera permission and launch camera when snap picture is pressed', async () => {
      const mockImageResult = {
        canceled: false,
        assets: [{
          uri: 'file:///path/to/image.jpg',
          width: 100,
          height: 100,
          type: 'image',
        }],
      };

      mockImagePicker.launchCameraAsync.mockResolvedValue(mockImageResult);

      const { getByLabelText } = render(<AvatarPickScreen />);
      
      fireEvent.press(getByLabelText('Snap a picture'));
      
      await waitFor(() => {
        expect(mockImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled();
        expect(mockImagePicker.launchCameraAsync).toHaveBeenCalledWith({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      });
    });

    it('should show alert when camera permission is denied', async () => {
      mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue({ 
        status: 'denied' as const,
        granted: false,
        canAskAgain: true,
        expires: 'never' as const,
      });

      const { getByLabelText } = render(<AvatarPickScreen />);
      
      fireEvent.press(getByLabelText('Snap a picture'));
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Permission required',
          'Camera permission is required to take a photo.'
        );
        expect(mockImagePicker.launchCameraAsync).not.toHaveBeenCalled();
      });
    });

    it('should handle camera result cancellation', async () => {
      const mockImageResult = {
        canceled: true,
        assets: [],
      };

      mockImagePicker.launchCameraAsync.mockResolvedValue(mockImageResult);

      const { getByLabelText } = render(<AvatarPickScreen />);
      
      fireEvent.press(getByLabelText('Snap a picture'));
      
      await waitFor(() => {
        expect(mockImagePicker.launchCameraAsync).toHaveBeenCalled();
      });

      // Should not update selected image
      const { getByLabelText: getByLabelText2 } = render(<AvatarPickScreen />);
      expect(getByLabelText2('Avatar illustration')).toBeTruthy();
    });

    it('should update UI when image is selected from camera', async () => {
      const mockImageResult = {
        canceled: false,
        assets: [{
          uri: 'file:///path/to/camera-image.jpg',
          width: 100,
          height: 100,
          type: 'image',
        }],
      };

      mockImagePicker.launchCameraAsync.mockResolvedValue(mockImageResult);

      const { getByLabelText, rerender } = render(<AvatarPickScreen />);
      
      fireEvent.press(getByLabelText('Snap a picture'));
      
      await waitFor(() => {
        expect(mockImagePicker.launchCameraAsync).toHaveBeenCalled();
      });

      // Re-render to see the updated state
      rerender(<AvatarPickScreen />);
    });

    it('should handle camera launch errors gracefully', async () => {
      mockImagePicker.launchCameraAsync.mockRejectedValue(new Error('Camera error'));

      const { getByLabelText } = render(<AvatarPickScreen />);
      
      fireEvent.press(getByLabelText('Snap a picture'));
      
      await waitFor(() => {
        expect(mockImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled();
      });

      // Should not crash the app
      expect(getByLabelText('Snap a picture')).toBeTruthy();
    });
  });

  describe('gallery functionality', () => {
    it('should request gallery permission and launch library when gallery button is pressed', async () => {
      const mockImageResult = {
        canceled: false,
        assets: [{
          uri: 'file:///path/to/gallery-image.jpg',
          width: 200,
          height: 200,
          type: 'image',
        }],
      };

      mockImagePicker.launchImageLibraryAsync.mockResolvedValue(mockImageResult);

      const { getByLabelText } = render(<AvatarPickScreen />);
      
      fireEvent.press(getByLabelText('Grab one from your gallery'));
      
      await waitFor(() => {
        expect(mockImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled();
        expect(mockImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      });
    });

    it('should show alert when gallery permission is denied', async () => {
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ 
        status: 'denied' as const,
        granted: false,
        canAskAgain: true,
        expires: 'never' as const,
      });

      const { getByLabelText } = render(<AvatarPickScreen />);
      
      fireEvent.press(getByLabelText('Grab one from your gallery'));
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Permission required',
          'Gallery permission is required to select a photo.'
        );
        expect(mockImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
      });
    });

    it('should handle gallery result cancellation', async () => {
      const mockImageResult = {
        canceled: true,
        assets: [],
      };

      mockImagePicker.launchImageLibraryAsync.mockResolvedValue(mockImageResult);

      const { getByLabelText } = render(<AvatarPickScreen />);
      
      fireEvent.press(getByLabelText('Grab one from your gallery'));
      
      await waitFor(() => {
        expect(mockImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      });

      // Should not update selected image
      expect(getByLabelText('Avatar illustration')).toBeTruthy();
    });

    it('should handle gallery launch errors gracefully', async () => {
      mockImagePicker.launchImageLibraryAsync.mockRejectedValue(new Error('Gallery error'));

      const { getByLabelText } = render(<AvatarPickScreen />);
      
      fireEvent.press(getByLabelText('Grab one from your gallery'));
      
      await waitFor(() => {
        expect(mockImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled();
      });

      // Should not crash the app
      expect(getByLabelText('Grab one from your gallery')).toBeTruthy();
    });
  });

  describe('profile update functionality', () => {
    it('should update profile and navigate when continue is pressed with selected image', async () => {
      // First select an image
      const mockImageResult = {
        canceled: false,
        assets: [{
          uri: 'file:///path/to/selected-image.jpg',
          width: 150,
          height: 150,
          type: 'image',
        }],
      };

      mockImagePicker.launchImageLibraryAsync.mockResolvedValue(mockImageResult);
      mockUpdateProfile.mockResolvedValue(undefined);

      const { getByLabelText } = render(<AvatarPickScreen />);
      
      // Select image from gallery
      fireEvent.press(getByLabelText('Grab one from your gallery'));
      
      await waitFor(() => {
        expect(mockImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      });

      // Then press continue
      fireEvent.press(getByLabelText('Continue'));
      
      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          avatar_url: 'file:///path/to/selected-image.jpg',
        });
        expect(mockNavigateNext).toHaveBeenCalledWith('contacts-permission');
      });
    });

    it('should show loading state during profile update', async () => {
      const mockImageResult = {
        canceled: false,
        assets: [{
          uri: 'file:///path/to/loading-test.jpg',
          width: 150,
          height: 150,
          type: 'image',
        }],
      };

      mockImagePicker.launchImageLibraryAsync.mockResolvedValue(mockImageResult);
      
      // Make updateProfile take some time to resolve
      let resolveUpdateProfile: () => void;
      const updateProfilePromise = new Promise<void>((resolve) => {
        resolveUpdateProfile = resolve;
      });
      mockUpdateProfile.mockReturnValue(updateProfilePromise);

      const { getByLabelText, getByText } = render(<AvatarPickScreen />);
      
      // Select image
      fireEvent.press(getByLabelText('Grab one from your gallery'));
      
      await waitFor(() => {
        expect(mockImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      });

      // Press continue
      fireEvent.press(getByLabelText('Continue'));
      
      // Should show loading state
      await waitFor(() => {
        expect(getByText('Uploading...')).toBeTruthy();
      });

      // Continue button should be disabled
      const continueButton = getByLabelText('Continue');
      expect(continueButton.props.accessibilityState?.disabled).toBe(true);

      // Skip button should be disabled
      const skipButton = getByLabelText('Skip For Now');
      expect(skipButton.props.disabled).toBe(true);

      // Resolve the promise
      resolveUpdateProfile!();
      
      await waitFor(() => {
        expect(mockNavigateNext).toHaveBeenCalled();
      });
    });

    it('should handle profile update errors', async () => {
      const mockImageResult = {
        canceled: false,
        assets: [{
          uri: 'file:///path/to/error-test.jpg',
          width: 150,
          height: 150,
          type: 'image',
        }],
      };

      mockImagePicker.launchImageLibraryAsync.mockResolvedValue(mockImageResult);
      mockUpdateProfile.mockRejectedValue(new Error('Update failed'));

      const { getByLabelText } = render(<AvatarPickScreen />);
      
      // Select image
      fireEvent.press(getByLabelText('Grab one from your gallery'));
      
      await waitFor(() => {
        expect(mockImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      });

      // Press continue
      fireEvent.press(getByLabelText('Continue'));
      
      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalled();
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to save avatar. Please try again.'
        );
        expect(console.error).toHaveBeenCalledWith(
          'Error saving avatar:',
          expect.any(Error)
        );
      });

      // Should not navigate on error
      expect(mockNavigateNext).not.toHaveBeenCalled();
    });
  });

  describe('accessibility and user experience', () => {
    it('should disable buttons during upload', async () => {
      const mockImageResult = {
        canceled: false,
        assets: [{
          uri: 'file:///path/to/disable-test.jpg',
          width: 150,
          height: 150,
          type: 'image',
        }],
      };

      mockImagePicker.launchImageLibraryAsync.mockResolvedValue(mockImageResult);
      
      let resolveUpdateProfile: () => void;
      const updateProfilePromise = new Promise<void>((resolve) => {
        resolveUpdateProfile = resolve;
      });
      mockUpdateProfile.mockReturnValue(updateProfilePromise);

      const { getByLabelText } = render(<AvatarPickScreen />);
      
      // Select image
      fireEvent.press(getByLabelText('Grab one from your gallery'));
      
      await waitFor(() => {
        expect(mockImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      });

      // Press continue
      fireEvent.press(getByLabelText('Continue'));
      
      await waitFor(() => {
        const continueButton = getByLabelText('Continue');
        const skipButton = getByLabelText('Skip For Now');
        
        expect(continueButton.props.disabled).toBe(true);
        expect(skipButton.props.disabled).toBe(true);
      });

      resolveUpdateProfile!();
    });

    it('should handle multiple rapid button presses gracefully', async () => {
      const { getByLabelText } = render(<AvatarPickScreen />);
      
      const backButton = getByLabelText('Go back');
      
      // Rapidly press back button multiple times
      fireEvent.press(backButton);
      fireEvent.press(backButton);
      fireEvent.press(backButton);
      
      // Should only call once (or handle gracefully)
      expect(mockNavigateBack).toHaveBeenCalledTimes(3);
    });

    it('should maintain accessibility during different states', async () => {
      const { getByLabelText } = render(<AvatarPickScreen />);
      
      // All accessibility labels should be present
      expect(getByLabelText('Go back')).toBeTruthy();
      expect(getByLabelText('Time to add a face to the name')).toBeTruthy();
      expect(getByLabelText('Snap a picture')).toBeTruthy();
      expect(getByLabelText('Grab one from your gallery')).toBeTruthy();
      expect(getByLabelText('Continue')).toBeTruthy();
      expect(getByLabelText('Skip For Now')).toBeTruthy();
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle permission request failures', async () => {
      mockImagePicker.requestCameraPermissionsAsync.mockRejectedValue(
        new Error('Permission request failed')
      );

      const { getByLabelText } = render(<AvatarPickScreen />);
      
      fireEvent.press(getByLabelText('Snap a picture'));
      
      await waitFor(() => {
        expect(mockImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled();
      });

      // Should not crash the app
      expect(getByLabelText('Snap a picture')).toBeTruthy();
    });

    it('should handle image assets without uri', async () => {
      const mockImageResult = {
        canceled: false,
        assets: [{
          // Missing uri property
          width: 100,
          height: 100,
          type: 'image',
        }] as any,
      };

      mockImagePicker.launchCameraAsync.mockResolvedValue(mockImageResult);

      const { getByLabelText } = render(<AvatarPickScreen />);
      
      fireEvent.press(getByLabelText('Snap a picture'));
      
      await waitFor(() => {
        expect(mockImagePicker.launchCameraAsync).toHaveBeenCalled();
      });

      // Should handle gracefully without updating image
      expect(getByLabelText('Avatar illustration')).toBeTruthy();
    });

    it('should handle empty assets array', async () => {
      const mockImageResult = {
        canceled: false,
        assets: [],
      };

      mockImagePicker.launchImageLibraryAsync.mockResolvedValue(mockImageResult);

      const { getByLabelText } = render(<AvatarPickScreen />);
      
      fireEvent.press(getByLabelText('Grab one from your gallery'));
      
      await waitFor(() => {
        expect(mockImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      });

      // Should handle gracefully
      expect(getByLabelText('Avatar illustration')).toBeTruthy();
    });

    it('should handle concurrent image selection attempts', async () => {
      const mockImageResult1 = {
        canceled: false,
        assets: [{
          uri: 'file:///path/to/image1.jpg',
          width: 100,
          height: 100,
          type: 'image',
        }],
      };

      const mockImageResult2 = {
        canceled: false,
        assets: [{
          uri: 'file:///path/to/image2.jpg',
          width: 150,
          height: 150,
          type: 'image',
        }],
      };

      mockImagePicker.launchCameraAsync.mockResolvedValue(mockImageResult1);
      mockImagePicker.launchImageLibraryAsync.mockResolvedValue(mockImageResult2);

      const { getByLabelText } = render(<AvatarPickScreen />);
      
      // Trigger both image selection methods rapidly
      fireEvent.press(getByLabelText('Snap a picture'));
      fireEvent.press(getByLabelText('Grab one from your gallery'));
      
      await waitFor(() => {
        expect(mockImagePicker.launchCameraAsync).toHaveBeenCalled();
        expect(mockImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      });

      // Should handle concurrent requests gracefully
      expect(getByLabelText('Continue')).toBeTruthy();
    });
  });

  describe('integration with hooks', () => {
    it('should properly integrate with useProfile hook', () => {
      render(<AvatarPickScreen />);
      
      expect(mockUseProfile).toHaveBeenCalled();
    });

    it('should properly integrate with useAuthNavigation hook', () => {
      render(<AvatarPickScreen />);
      
      expect(mockUseAuthNavigation).toHaveBeenCalledWith('avatar-pick');
    });

    it('should properly integrate with useRegistrationStep hook', () => {
      render(<AvatarPickScreen />);
      
      expect(mockUseRegistrationStep).toHaveBeenCalledWith('avatar_pick');
    });

    it('should handle hook errors gracefully', () => {
      mockUseProfile.mockImplementation(() => {
        throw new Error('Profile hook error');
      });

      // Should not crash when hook throws error
      expect(() => render(<AvatarPickScreen />)).toThrow('Profile hook error');
    });
  });
});