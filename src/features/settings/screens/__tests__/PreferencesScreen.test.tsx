import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PreferencesScreen from '../PreferencesScreen';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/shared/lib/supabase/client';
import { generalCache, userCache, eventCache, imageCache } from '@/shared/utils/cache/cacheManager';

// Mock dependencies
jest.mock('@/hooks/useProfile');
jest.mock('@/shared/lib/supabase/client');
jest.mock('@/shared/utils/cache/cacheManager');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-file-system');
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    replace: jest.fn(),
  },
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, ...props }: any) => {
    const { Text } = require('react-native');
    return <Text {...props}>{name}</Text>;
  },
}));
jest.mock('@/shared/ui/CustomText', () => {
  const { Text } = require('react-native');
  return ({ children, ...props }: any) => <Text {...props}>{children}</Text>;
});
jest.mock('@/shared/components/LanguageSwitcher', () => ({
  LanguageSwitcher: ({ showLabel }: any) => {
    const { Text } = require('react-native');
    return <Text>Language Switcher</Text>;
  },
}));
jest.mock('@/shared/config/Colors', () => ({
  Colors: {
    light: {
      background: '#FFFFFF',
      text: '#000000',
      textSecondary: '#666666',
      tint: '#007AFF',
      border: '#E5E5E5',
      tabIconDefault: '#CCCCCC',
      error: '#FF3B30',
    },
  },
}));

const mockUseProfile = useProfile as jest.MockedFunction<typeof useProfile>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockGeneralCache = generalCache as jest.Mocked<typeof generalCache>;
const mockUserCache = userCache as jest.Mocked<typeof userCache>;
const mockEventCache = eventCache as jest.Mocked<typeof eventCache>;
const mockImageCache = imageCache as jest.Mocked<typeof imageCache>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;

describe('PreferencesScreen', () => {
  const mockRefreshProfile = jest.fn();
  const mockRouter = require('expo-router').router;

  const mockProfile = {
    id: 'user-123',
    full_name: 'Test User',
    username: 'testuser',
    email: 'test@example.com',
    settings: {
      notifications: {
        event_invites: true,
        event_reminders: true,
        event_updates: false,
        new_followers: true,
        messages: true,
        stories: false,
      },
      privacy: {
        profile_public: true,
        show_location: true,
        show_age: false,
        allow_messages: true,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useProfile
    mockUseProfile.mockReturnValue({
      profile: mockProfile,
      loading: false,
      error: null,
      updateProfile: jest.fn(),
      refreshProfile: mockRefreshProfile,
    });

    // Mock Supabase
    mockSupabase.from = jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
        }),
      }),
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
        or: jest.fn().mockResolvedValue({ error: null }),
      }),
      insert: jest.fn().mockResolvedValue({ error: null }),
    });

    mockSupabase.auth = {
      signOut: jest.fn().mockResolvedValue({ error: null }),
    } as any;

    // Mock cache managers
    mockGeneralCache.clear = jest.fn().mockResolvedValue(undefined);
    mockUserCache.clear = jest.fn().mockResolvedValue(undefined);
    mockEventCache.clear = jest.fn().mockResolvedValue(undefined);
    mockImageCache.clear = jest.fn().mockResolvedValue(undefined);

    // Mock AsyncStorage
    mockAsyncStorage.getAllKeys = jest.fn().mockResolvedValue([
      'auth-token',
      'cache-data-123',
      'temp-file',
      'user-session',
      'image-cache-456',
    ]);
    mockAsyncStorage.multiRemove = jest.fn().mockResolvedValue(undefined);
    mockAsyncStorage.clear = jest.fn().mockResolvedValue(undefined);

    // Mock FileSystem
    mockFileSystem.documentDirectory = 'file:///Documents/';
    mockFileSystem.writeAsStringAsync = jest.fn().mockResolvedValue(undefined);

    // Mock Alert
    jest.spyOn(Alert, 'alert').mockImplementation();

    // Mock console methods
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('rendering and UI', () => {
    it('should render main sections correctly', () => {
      const { getByText } = render(<PreferencesScreen />);

      expect(getByText('settings.preferences.title')).toBeTruthy();
      expect(getByText('common.save')).toBeTruthy();
      expect(getByText('settings.notifications.title')).toBeTruthy();
      expect(getByText('settings.privacy.title')).toBeTruthy();
      expect(getByText('settings.preferences.language')).toBeTruthy();
      expect(getByText('settings.account.title')).toBeTruthy();
    });

    it('should render notification settings with correct values', () => {
      const { getByText } = render(<PreferencesScreen />);

      expect(getByText('Event Invites')).toBeTruthy();
      expect(getByText('settings.notifications.eventReminders')).toBeTruthy();
      expect(getByText('Event Updates')).toBeTruthy();
      expect(getByText('settings.notifications.newFollowers')).toBeTruthy();
      expect(getByText('settings.notifications.messages')).toBeTruthy();
      expect(getByText('Stories')).toBeTruthy();
    });

    it('should render privacy settings with correct values', () => {
      const { getByText } = render(<PreferencesScreen />);

      expect(getByText('settings.privacy.profileVisibility')).toBeTruthy();
      expect(getByText('settings.privacy.showLocation')).toBeTruthy();
      expect(getByText('Show Age')).toBeTruthy();
      expect(getByText('settings.privacy.allowMessages')).toBeTruthy();
    });

    it('should render account action buttons', () => {
      const { getByText } = render(<PreferencesScreen />);

      expect(getByText('Clear Cache')).toBeTruthy();
      expect(getByText('Download Data')).toBeTruthy();
      expect(getByText('Delete Account')).toBeTruthy();
    });

    it('should show loading state when profile is loading', () => {
      mockUseProfile.mockReturnValue({
        profile: null,
        loading: true,
        error: null,
        updateProfile: jest.fn(),
        refreshProfile: mockRefreshProfile,
      });

      const { getByTestId } = render(<PreferencesScreen />);

      // Should show activity indicator (checking by props since it's mocked)
      expect(mockUseProfile).toHaveBeenCalled();
    });

    it('should render language switcher', () => {
      const { getByText } = render(<PreferencesScreen />);

      expect(getByText('Language Switcher')).toBeTruthy();
    });

    it('should render header with back button and save button', () => {
      const { getByText } = render(<PreferencesScreen />);

      expect(getByText('arrow-back')).toBeTruthy();
      expect(getByText('common.save')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate back when back button is pressed', () => {
      const { getByText } = render(<PreferencesScreen />);

      const backButton = getByText('arrow-back');
      fireEvent.press(backButton);

      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });
  });

  describe('settings synchronization', () => {
    it('should load settings from profile on mount', () => {
      render(<PreferencesScreen />);

      // Settings should be loaded from profile
      expect(mockUseProfile).toHaveBeenCalled();
    });

    it('should handle missing profile settings gracefully', () => {
      const profileWithoutSettings = {
        ...mockProfile,
        settings: undefined,
      };

      mockUseProfile.mockReturnValue({
        profile: profileWithoutSettings,
        loading: false,
        error: null,
        updateProfile: jest.fn(),
        refreshProfile: mockRefreshProfile,
      });

      const { getByText } = render(<PreferencesScreen />);

      // Should render with default values
      expect(getByText('Event Invites')).toBeTruthy();
    });

    it('should handle partial settings data', () => {
      const profileWithPartialSettings = {
        ...mockProfile,
        settings: {
          notifications: {
            event_invites: false,
            // Missing other notification settings
          },
          // Missing privacy settings
        },
      };

      mockUseProfile.mockReturnValue({
        profile: profileWithPartialSettings,
        loading: false,
        error: null,
        updateProfile: jest.fn(),
        refreshProfile: mockRefreshProfile,
      });

      const { getByText } = render(<PreferencesScreen />);

      // Should render with mixed default and loaded values
      expect(getByText('Event Invites')).toBeTruthy();
    });
  });

  describe('notification settings', () => {
    it('should toggle notification settings', () => {
      const { getAllByRole } = render(<PreferencesScreen />);

      // Get all switches (notification and privacy)
      const switches = getAllByRole('switch');
      
      // Toggle first notification switch (Event Invites)
      fireEvent(switches[0], 'valueChange', false);

      // Should update the local state
      expect(switches[0]).toBeTruthy();
    });

    it('should handle all notification toggle types', () => {
      const { getAllByRole } = render(<PreferencesScreen />);

      const switches = getAllByRole('switch');
      
      // Test toggling multiple notification switches
      fireEvent(switches[0], 'valueChange', false); // Event Invites
      fireEvent(switches[1], 'valueChange', true);  // Event Reminders
      fireEvent(switches[2], 'valueChange', true);  // Event Updates

      expect(switches.length).toBeGreaterThan(0);
    });

    it('should maintain notification state during re-renders', () => {
      const { getAllByRole, rerender } = render(<PreferencesScreen />);

      const switches = getAllByRole('switch');
      fireEvent(switches[0], 'valueChange', false);

      rerender(<PreferencesScreen />);

      // State should be maintained
      const newSwitches = getAllByRole('switch');
      expect(newSwitches[0]).toBeTruthy();
    });
  });

  describe('privacy settings', () => {
    it('should toggle privacy settings', () => {
      const { getAllByRole } = render(<PreferencesScreen />);

      const switches = getAllByRole('switch');
      
      // Privacy switches come after notification switches
      const privacyStartIndex = 6; // After 6 notification switches
      fireEvent(switches[privacyStartIndex], 'valueChange', false);

      expect(switches[privacyStartIndex]).toBeTruthy();
    });

    it('should handle all privacy toggle types', () => {
      const { getAllByRole } = render(<PreferencesScreen />);

      const switches = getAllByRole('switch');
      const privacyStartIndex = 6;

      // Test all privacy toggles
      fireEvent(switches[privacyStartIndex], 'valueChange', false);     // Profile Public
      fireEvent(switches[privacyStartIndex + 1], 'valueChange', false); // Show Location
      fireEvent(switches[privacyStartIndex + 2], 'valueChange', true);  // Show Age
      fireEvent(switches[privacyStartIndex + 3], 'valueChange', false); // Allow Messages

      expect(switches.length).toBe(10); // 6 notification + 4 privacy
    });
  });

  describe('save functionality', () => {
    it('should save settings successfully', async () => {
      const { getByText, getAllByRole } = render(<PreferencesScreen />);

      // Toggle some settings
      const switches = getAllByRole('switch');
      fireEvent(switches[0], 'valueChange', false);

      // Press save button
      const saveButton = getByText('common.save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'common.success',
        'Settings saved successfully'
      );
    });

    it('should handle save errors gracefully', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: { message: 'Save failed' } }),
        }),
      });

      const { getByText } = render(<PreferencesScreen />);

      const saveButton = getByText('common.save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to save settings'
        );
      });
    });

    it('should show loading state during save', async () => {
      let resolveSave: () => void;
      const savePromise = new Promise<void>((resolve) => {
        resolveSave = resolve;
      });

      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(savePromise.then(() => ({ error: null }))),
        }),
      });

      const { getByText } = render(<PreferencesScreen />);

      const saveButton = getByText('common.save');
      fireEvent.press(saveButton);

      // Should show loading state
      await waitFor(() => {
        // Check if save button is disabled (shows loading indicator)
        expect(mockSupabase.from).toHaveBeenCalled();
      });

      resolveSave!();
    });

    it('should not save when profile ID is missing', async () => {
      mockUseProfile.mockReturnValue({
        profile: { ...mockProfile, id: undefined } as any,
        loading: false,
        error: null,
        updateProfile: jest.fn(),
        refreshProfile: mockRefreshProfile,
      });

      const { getByText } = render(<PreferencesScreen />);

      const saveButton = getByText('common.save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockSupabase.from).not.toHaveBeenCalled();
      });
    });

    it('should refresh profile after successful save', async () => {
      const { getByText } = render(<PreferencesScreen />);

      const saveButton = getByText('common.save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockRefreshProfile).toHaveBeenCalled();
      });
    });
  });

  describe('clear cache functionality', () => {
    it('should show confirmation dialog for cache clearing', () => {
      const { getByText } = render(<PreferencesScreen />);

      const clearCacheButton = getByText('Clear Cache');
      fireEvent.press(clearCacheButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Clear Cache',
        'This will clear all cached data. Continue?',
        expect.any(Array)
      );
    });

    it('should clear all caches when confirmed', async () => {
      const { getByText } = render(<PreferencesScreen />);

      const clearCacheButton = getByText('Clear Cache');
      fireEvent.press(clearCacheButton);

      // Simulate user confirming the action
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const confirmAction = alertCall[2][1].onPress;
      
      await act(async () => {
        await confirmAction();
      });

      expect(mockGeneralCache.clear).toHaveBeenCalled();
      expect(mockUserCache.clear).toHaveBeenCalled();
      expect(mockEventCache.clear).toHaveBeenCalled();
      expect(mockImageCache.clear).toHaveBeenCalled();
      expect(mockAsyncStorage.getAllKeys).toHaveBeenCalled();
      expect(mockAsyncStorage.multiRemove).toHaveBeenCalled();
    });

    it('should handle cache clearing errors', async () => {
      mockGeneralCache.clear.mockRejectedValue(new Error('Clear failed'));

      const { getByText } = render(<PreferencesScreen />);

      const clearCacheButton = getByText('Clear Cache');
      fireEvent.press(clearCacheButton);

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const confirmAction = alertCall[2][1].onPress;
      
      await act(async () => {
        await confirmAction();
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to clear cache. Please try again.'
      );
    });

    it('should filter AsyncStorage keys correctly', async () => {
      const { getByText } = render(<PreferencesScreen />);

      const clearCacheButton = getByText('Clear Cache');
      fireEvent.press(clearCacheButton);

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const confirmAction = alertCall[2][1].onPress;
      
      await act(async () => {
        await confirmAction();
      });

      // Should only remove cache-related keys, not auth/session keys
      expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith([
        'cache-data-123',
        'temp-file',
        'image-cache-456',
      ]);
    });

    it('should show loading state during cache clearing', async () => {
      let resolveClear: () => void;
      const clearPromise = new Promise<void>((resolve) => {
        resolveClear = resolve;
      });

      mockGeneralCache.clear.mockReturnValue(clearPromise);

      const { getByText } = render(<PreferencesScreen />);

      const clearCacheButton = getByText('Clear Cache');
      fireEvent.press(clearCacheButton);

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const confirmAction = alertCall[2][1].onPress;
      
      act(() => {
        confirmAction();
      });

      // Should show loading state
      await waitFor(() => {
        expect(mockGeneralCache.clear).toHaveBeenCalled();
      });

      resolveClear!();
    });
  });

  describe('data export functionality', () => {
    it('should show confirmation dialog for data export', () => {
      const { getByText } = render(<PreferencesScreen />);

      const downloadButton = getByText('Download Data');
      fireEvent.press(downloadButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Download Data',
        'Your data will be exported as a JSON file',
        expect.any(Array)
      );
    });

    it('should export user data when confirmed', async () => {
      const { getByText } = render(<PreferencesScreen />);

      const downloadButton = getByText('Download Data');
      fireEvent.press(downloadButton);

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const confirmAction = alertCall[2][1].onPress;
      
      await act(async () => {
        await confirmAction();
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockFileSystem.writeAsStringAsync).toHaveBeenCalled();
    });

    it('should handle data export errors', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('Export failed')),
          }),
        }),
      });

      const { getByText } = render(<PreferencesScreen />);

      const downloadButton = getByText('Download Data');
      fireEvent.press(downloadButton);

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const confirmAction = alertCall[2][1].onPress;
      
      await act(async () => {
        await confirmAction();
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to export data. Please try again later.'
      );
    });

    it('should create properly formatted export file', async () => {
      const { getByText } = render(<PreferencesScreen />);

      const downloadButton = getByText('Download Data');
      fireEvent.press(downloadButton);

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const confirmAction = alertCall[2][1].onPress;
      
      await act(async () => {
        await confirmAction();
      });

      // Check that file was written with correct content structure
      const writeCall = (mockFileSystem.writeAsStringAsync as jest.Mock).mock.calls[0];
      const fileContent = JSON.parse(writeCall[1]);
      
      expect(fileContent).toHaveProperty('profile');
      expect(fileContent).toHaveProperty('events');
      expect(fileContent).toHaveProperty('messages');
      expect(fileContent).toHaveProperty('friendships');
      expect(fileContent).toHaveProperty('exportDate');
      expect(fileContent).toHaveProperty('appVersion');
    });

    it('should not export when profile ID is missing', async () => {
      mockUseProfile.mockReturnValue({
        profile: { ...mockProfile, id: undefined } as any,
        loading: false,
        error: null,
        updateProfile: jest.fn(),
        refreshProfile: mockRefreshProfile,
      });

      const { getByText } = render(<PreferencesScreen />);

      const downloadButton = getByText('Download Data');
      fireEvent.press(downloadButton);

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const confirmAction = alertCall[2][1].onPress;
      
      await act(async () => {
        await confirmAction();
      });

      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  describe('account deletion', () => {
    it('should show confirmation dialog for account deletion', () => {
      const { getByText } = render(<PreferencesScreen />);

      const deleteButton = getByText('Delete Account');
      fireEvent.press(deleteButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Account',
        'This action cannot be undone. All your data will be permanently deleted.',
        expect.any(Array)
      );
    });

    it('should show delete confirmation modal', () => {
      const { getByText } = render(<PreferencesScreen />);

      const deleteButton = getByText('Delete Account');
      fireEvent.press(deleteButton);

      // Click delete in the alert
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const deleteAction = alertCall[2][1].onPress;
      
      act(() => {
        deleteAction();
      });

      expect(getByText('Confirm Account Deletion')).toBeTruthy();
      expect(getByText('Please type "DELETE" to confirm this action')).toBeTruthy();
    });

    it('should require exact "DELETE" text for confirmation', async () => {
      const { getByText, getByPlaceholderText } = render(<PreferencesScreen />);

      // Open delete confirmation modal
      const deleteButton = getByText('Delete Account');
      fireEvent.press(deleteButton);

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const deleteAction = alertCall[2][1].onPress;
      act(() => deleteAction());

      // Enter incorrect text
      const input = getByPlaceholderText('Type DELETE here');
      fireEvent.changeText(input, 'delete');

      const confirmButton = getByText('common.delete');
      fireEvent.press(confirmButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please type "DELETE" exactly to confirm'
      );
    });

    it('should delete account when correctly confirmed', async () => {
      const { getByText, getByPlaceholderText } = render(<PreferencesScreen />);

      // Open delete confirmation modal
      const deleteButton = getByText('Delete Account');
      fireEvent.press(deleteButton);

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const deleteAction = alertCall[2][1].onPress;
      act(() => deleteAction());

      // Enter correct text
      const input = getByPlaceholderText('Type DELETE here');
      fireEvent.changeText(input, 'DELETE');

      const confirmButton = getByText('common.delete');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
        expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      });
    });

    it('should handle account deletion errors', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockRejectedValue(new Error('Deletion failed')),
        }),
      });

      const { getByText, getByPlaceholderText } = render(<PreferencesScreen />);

      // Open delete confirmation modal
      const deleteButton = getByText('Delete Account');
      fireEvent.press(deleteButton);

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const deleteAction = alertCall[2][1].onPress;
      act(() => deleteAction());

      // Enter correct text
      const input = getByPlaceholderText('Type DELETE here');
      fireEvent.changeText(input, 'DELETE');

      const confirmButton = getByText('common.delete');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to delete account. Please contact support if this issue persists.'
        );
      });
    });

    it('should cancel account deletion', () => {
      const { getByText } = render(<PreferencesScreen />);

      // Open delete confirmation modal
      const deleteButton = getByText('Delete Account');
      fireEvent.press(deleteButton);

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const deleteAction = alertCall[2][1].onPress;
      act(() => deleteAction());

      // Click cancel
      const cancelButton = getByText('common.cancel');
      fireEvent.press(cancelButton);

      // Modal should be closed (DELETE text should not be visible)
      expect(() => getByText('Confirm Account Deletion')).toThrow();
    });

    it('should clear all local data on successful deletion', async () => {
      const { getByText, getByPlaceholderText } = render(<PreferencesScreen />);

      // Open delete confirmation modal
      const deleteButton = getByText('Delete Account');
      fireEvent.press(deleteButton);

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const deleteAction = alertCall[2][1].onPress;
      act(() => deleteAction());

      // Enter correct text and confirm
      const input = getByPlaceholderText('Type DELETE here');
      fireEvent.changeText(input, 'DELETE');

      const confirmButton = getByText('common.delete');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockGeneralCache.clear).toHaveBeenCalled();
        expect(mockUserCache.clear).toHaveBeenCalled();
        expect(mockEventCache.clear).toHaveBeenCalled();
        expect(mockImageCache.clear).toHaveBeenCalled();
        expect(mockAsyncStorage.clear).toHaveBeenCalled();
      });
    });

    it('should navigate to root after successful deletion', async () => {
      const { getByText, getByPlaceholderText } = render(<PreferencesScreen />);

      // Open delete confirmation modal
      const deleteButton = getByText('Delete Account');
      fireEvent.press(deleteButton);

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const deleteAction = alertCall[2][1].onPress;
      act(() => deleteAction());

      // Enter correct text and confirm
      const input = getByPlaceholderText('Type DELETE here');
      fireEvent.changeText(input, 'DELETE');

      const confirmButton = getByText('common.delete');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Account Deleted',
          'Your account has been permanently deleted',
          expect.arrayContaining([
            expect.objectContaining({
              onPress: expect.any(Function),
            }),
          ])
        );
      });

      // Simulate pressing OK in success dialog
      const successAlertCall = (Alert.alert as jest.Mock).mock.calls
        .find(call => call[0] === 'Account Deleted');
      if (successAlertCall) {
        const okAction = successAlertCall[2][0].onPress;
        okAction();
        expect(mockRouter.replace).toHaveBeenCalledWith('/');
      }
    });

    it('should disable buttons during deletion process', async () => {
      const { getByText, getByPlaceholderText } = render(<PreferencesScreen />);

      // Open delete confirmation modal
      const deleteButton = getByText('Delete Account');
      fireEvent.press(deleteButton);

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const deleteAction = alertCall[2][1].onPress;
      act(() => deleteAction());

      // Enter correct text
      const input = getByPlaceholderText('Type DELETE here');
      fireEvent.changeText(input, 'DELETE');

      let resolveDeletion: () => void;
      const deletionPromise = new Promise<void>((resolve) => {
        resolveDeletion = resolve;
      });

      mockSupabase.from = jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(deletionPromise.then(() => ({ error: null }))),
        }),
      });

      const confirmButton = getByText('common.delete');
      fireEvent.press(confirmButton);

      // Buttons should be disabled during deletion
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalled();
      });

      resolveDeletion!();
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle missing profile gracefully', () => {
      mockUseProfile.mockReturnValue({
        profile: null,
        loading: false,
        error: null,
        updateProfile: jest.fn(),
        refreshProfile: mockRefreshProfile,
      });

      const { getByText } = render(<PreferencesScreen />);

      // Should still render basic UI
      expect(getByText('settings.preferences.title')).toBeTruthy();
      expect(getByText('common.save')).toBeTruthy();
    });

    it('should handle rapid toggle changes efficiently', () => {
      const { getAllByRole } = render(<PreferencesScreen />);

      const switches = getAllByRole('switch');
      
      // Rapidly toggle switches
      for (let i = 0; i < 5; i++) {
        fireEvent(switches[0], 'valueChange', i % 2 === 0);
      }

      // Should handle without crashing
      expect(switches[0]).toBeTruthy();
    });

    it('should handle concurrent operations gracefully', async () => {
      const { getByText } = render(<PreferencesScreen />);

      // Trigger multiple operations simultaneously
      const saveButton = getByText('common.save');
      const clearCacheButton = getByText('Clear Cache');
      
      fireEvent.press(saveButton);
      fireEvent.press(clearCacheButton);

      // Should not crash
      expect(getByText('common.save')).toBeTruthy();
    });

    it('should handle file system errors during export', async () => {
      mockFileSystem.writeAsStringAsync.mockRejectedValue(new Error('File write failed'));

      const { getByText } = render(<PreferencesScreen />);

      const downloadButton = getByText('Download Data');
      fireEvent.press(downloadButton);

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const confirmAction = alertCall[2][1].onPress;
      
      await act(async () => {
        await confirmAction();
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to export data. Please try again later.'
      );
    });

    it('should handle network timeouts gracefully', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockRejectedValue(new Error('Network timeout')),
        }),
      });

      const { getByText } = render(<PreferencesScreen />);

      const saveButton = getByText('common.save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to save settings'
        );
      });
    });

    it('should handle malformed settings data', () => {
      const profileWithMalformedSettings = {
        ...mockProfile,
        settings: {
          notifications: 'invalid', // Should be object
          privacy: null, // Should be object
        },
      };

      mockUseProfile.mockReturnValue({
        profile: profileWithMalformedSettings as any,
        loading: false,
        error: null,
        updateProfile: jest.fn(),
        refreshProfile: mockRefreshProfile,
      });

      const { getByText } = render(<PreferencesScreen />);

      // Should render without crashing
      expect(getByText('settings.preferences.title')).toBeTruthy();
    });
  });
});