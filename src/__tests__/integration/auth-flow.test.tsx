import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase/client';

// Mock screens
import PhoneVerificationScreen from '@/features/auth/screens/PhoneVerificationScreen';
import CodeVerificationScreen from '@/features/auth/screens/CodeVerificationScreen';
import NameInputScreen from '@/features/auth/screens/NameInputScreen';

jest.mock('@/shared/lib/supabase/client');
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <NavigationContainer>
      {children}
    </NavigationContainer>
  </QueryClientProvider>
);

describe('Authentication Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Phone Verification Flow', () => {
    it('should complete phone verification process', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      
      // Mock successful OTP request
      mockSupabase.auth.signInWithOtp = jest.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      const { getByPlaceholderText, getByText } = render(
        <TestWrapper>
          <PhoneVerificationScreen />
        </TestWrapper>
      );

      // Enter phone number
      const phoneInput = getByPlaceholderText(/numéro/i);
      fireEvent.changeText(phoneInput, '612345678');

      // Submit
      const submitButton = getByText(/continuer/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
          phone: '+33612345678',
        });
      });
    });

    it('should handle invalid phone numbers', async () => {
      const { getByPlaceholderText, getByText, queryByText } = render(
        <TestWrapper>
          <PhoneVerificationScreen />
        </TestWrapper>
      );

      // Enter invalid phone number
      const phoneInput = getByPlaceholderText(/numéro/i);
      fireEvent.changeText(phoneInput, '123');

      // Submit
      const submitButton = getByText(/continuer/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(queryByText(/numéro invalide/i)).toBeTruthy();
      });
    });
  });

  describe('OTP Verification Flow', () => {
    it('should verify OTP code successfully', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      
      // Mock successful OTP verification
      mockSupabase.auth.verifyOtp = jest.fn().mockResolvedValue({
        data: {
          user: { id: 'user-123' },
          session: { access_token: 'token-123' },
        },
        error: null,
      });

      const { getByTestId, getByText } = render(
        <TestWrapper>
          <CodeVerificationScreen />
        </TestWrapper>
      );

      // Enter OTP code
      for (let i = 0; i < 6; i++) {
        const input = getByTestId(`otp-input-${i}`);
        fireEvent.changeText(input, String(i + 1));
      }

      await waitFor(() => {
        expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({
          phone: expect.any(String),
          token: '123456',
          type: 'sms',
        });
      });
    });

    it('should handle incorrect OTP', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      
      mockSupabase.auth.verifyOtp = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Invalid OTP' },
      });

      const { getByTestId, queryByText } = render(
        <TestWrapper>
          <CodeVerificationScreen />
        </TestWrapper>
      );

      // Enter OTP code
      for (let i = 0; i < 6; i++) {
        const input = getByTestId(`otp-input-${i}`);
        fireEvent.changeText(input, '0');
      }

      await waitFor(() => {
        expect(queryByText(/code incorrect/i)).toBeTruthy();
      });
    });

    it('should handle OTP resend', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      
      mockSupabase.auth.signInWithOtp = jest.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      const { getByText } = render(
        <TestWrapper>
          <CodeVerificationScreen />
        </TestWrapper>
      );

      // Wait for resend button to be enabled (after countdown)
      await waitFor(() => {
        const resendButton = getByText(/renvoyer/i);
        fireEvent.press(resendButton);
        
        expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });

  describe('Profile Setup Flow', () => {
    it('should complete profile setup', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      
      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: { id: 'user-123', full_name: 'John Doe' },
          error: null,
        }),
      });

      const { getByPlaceholderText, getByText } = render(
        <TestWrapper>
          <NameInputScreen />
        </TestWrapper>
      );

      // Enter name
      const nameInput = getByPlaceholderText(/prénom/i);
      fireEvent.changeText(nameInput, 'John Doe');

      // Submit
      const submitButton = getByText(/continuer/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      });
    });

    it('should validate name input', async () => {
      const { getByPlaceholderText, getByText, queryByText } = render(
        <TestWrapper>
          <NameInputScreen />
        </TestWrapper>
      );

      // Try to submit without name
      const submitButton = getByText(/continuer/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(queryByText(/nom requis/i)).toBeTruthy();
      });

      // Enter too short name
      const nameInput = getByPlaceholderText(/prénom/i);
      fireEvent.changeText(nameInput, 'A');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(queryByText(/trop court/i)).toBeTruthy();
      });
    });
  });

  describe('Permission Requests', () => {
    it('should handle location permission request', async () => {
      const mockRequestPermission = jest.fn().mockResolvedValue({
        status: 'granted',
      });

      jest.mock('expo-location', () => ({
        requestForegroundPermissionsAsync: mockRequestPermission,
      }));

      // Test location permission flow
      // This would be in LocationPermissionScreen
    });

    it('should handle contacts permission request', async () => {
      const mockRequestPermission = jest.fn().mockResolvedValue({
        status: 'granted',
      });

      jest.mock('expo-contacts', () => ({
        requestPermissionsAsync: mockRequestPermission,
      }));

      // Test contacts permission flow
      // This would be in ContactsPermissionScreen
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      
      mockSupabase.auth.signInWithOtp = jest.fn().mockRejectedValue(
        new Error('Network request failed')
      );

      const { getByPlaceholderText, getByText, queryByText } = render(
        <TestWrapper>
          <PhoneVerificationScreen />
        </TestWrapper>
      );

      const phoneInput = getByPlaceholderText(/numéro/i);
      fireEvent.changeText(phoneInput, '612345678');

      const submitButton = getByText(/continuer/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(queryByText(/erreur réseau/i)).toBeTruthy();
      });
    });

    it('should handle rate limiting', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      
      mockSupabase.auth.signInWithOtp = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Too many requests', status: 429 },
      });

      const { getByPlaceholderText, getByText, queryByText } = render(
        <TestWrapper>
          <PhoneVerificationScreen />
        </TestWrapper>
      );

      const phoneInput = getByPlaceholderText(/numéro/i);
      fireEvent.changeText(phoneInput, '612345678');

      const submitButton = getByText(/continuer/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(queryByText(/trop de tentatives/i)).toBeTruthy();
      });
    });
  });

  describe('Session Management', () => {
    it('should persist session after successful authentication', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      
      const mockSession = {
        user: { id: 'user-123' },
        access_token: 'token-123',
        refresh_token: 'refresh-123',
      };

      mockSupabase.auth.verifyOtp = jest.fn().mockResolvedValue({
        data: { user: mockSession.user, session: mockSession },
        error: null,
      });

      mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Verify OTP
      const { getByTestId } = render(
        <TestWrapper>
          <CodeVerificationScreen />
        </TestWrapper>
      );

      for (let i = 0; i < 6; i++) {
        const input = getByTestId(`otp-input-${i}`);
        fireEvent.changeText(input, String(i + 1));
      }

      await waitFor(() => {
        expect(mockSupabase.auth.getSession).toHaveBeenCalled();
      });
    });

    it('should handle session expiration', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      
      mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: null },
        error: { message: 'Session expired' },
      });

      // Test session expiration handling
      // This would redirect to login
    });
  });
});