import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/shared/lib/supabase/client';
import { useOtpVerification } from '@/hooks/useOtpVerification';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { useRegistrationStep } from '@/shared/hooks/useRegistrationStep';

// Mock dependencies
jest.mock('@/shared/lib/supabase/client');
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('Authentication Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Phone Verification', () => {
    it('should validate French phone numbers correctly', () => {
      const validNumbers = [
        '+33612345678',
        '0612345678',
        '+33 6 12 34 56 78',
        '06 12 34 56 78',
      ];

      const invalidNumbers = [
        '123',
        '+1234567890',
        'notanumber',
        '',
      ];

      validNumbers.forEach(number => {
        const formatted = number.replace(/\s/g, '').replace(/^0/, '+33');
        expect(formatted).toMatch(/^\+33[67]\d{8}$/);
      });

      invalidNumbers.forEach(number => {
        const formatted = number.replace(/\s/g, '').replace(/^0/, '+33');
        expect(formatted).not.toMatch(/^\+33[67]\d{8}$/);
      });
    });

    it('should handle OTP verification flow', async () => {
      const mockSignInWithOtp = jest.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      (supabase.auth.signInWithOtp as jest.Mock) = mockSignInWithOtp;

      const { result } = renderHook(() => useOtpVerification());

      await act(async () => {
        await result.current.sendOtp('+33612345678');
      });

      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        phone: '+33612345678',
      });
    });
  });

  describe('Registration Steps', () => {
    it('should track registration progress', async () => {
      const { result } = renderHook(() => useRegistrationStep());

      expect(result.current.currentStep).toBe('phone-verification');

      await act(async () => {
        await result.current.completeStep('phone-verification');
      });

      expect(result.current.currentStep).toBe('code-verification');
    });
  });
});
