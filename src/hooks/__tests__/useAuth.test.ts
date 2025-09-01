import { renderHook, act, waitFor } from '@testing-library/react-native';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { useOtpVerification } from '../useOtpVerification';
import { useOnboardingStatus } from '../useOnboardingStatus';
import { supabase } from '@/shared/lib/supabase/client';

// Mock Supabase client
jest.mock('@/shared/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ 
        data: { subscription: { unsubscribe: jest.fn() } } 
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          maybeSingle: jest.fn(),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
    })),
  },
}));

describe('Authentication Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useOtpVerification', () => {
    it('should send OTP successfully', async () => {
      const { result } = renderHook(() => useOtpVerification());
      
      supabase.auth.signInWithOtp.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      await act(async () => {
        await result.current.sendOtp('+33612345678');
      });

      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        phone: '+33612345678',
      });
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle OTP sending errors', async () => {
      const { result } = renderHook(() => useOtpVerification());
      
      const errorMessage = 'Rate limit exceeded';
      supabase.auth.signInWithOtp.mockResolvedValue({
        data: null,
        error: { message: errorMessage },
      });

      await act(async () => {
        await result.current.sendOtp('+33612345678');
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.loading).toBe(false);
    });

    it('should verify OTP successfully', async () => {
      const { result } = renderHook(() => useOtpVerification());
      
      const mockSession = {
        user: { id: 'user123', phone: '+33612345678' },
        access_token: 'token',
        refresh_token: 'refresh',
      };

      supabase.auth.verifyOtp.mockResolvedValue({
        data: { user: mockSession.user, session: mockSession },
        error: null,
      });

      await act(async () => {
        const success = await result.current.verifyOtp('+33612345678', '123456');
        expect(success).toBe(true);
      });

      expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
        phone: '+33612345678',
        token: '123456',
        type: 'sms',
      });
    });

    it('should handle verification errors', async () => {
      const { result } = renderHook(() => useOtpVerification());
      
      supabase.auth.verifyOtp.mockResolvedValue({
        data: null,
        error: { message: 'Invalid OTP' },
      });

      await act(async () => {
        const success = await result.current.verifyOtp('+33612345678', '999999');
        expect(success).toBe(false);
      });

      expect(result.current.error).toBe('Invalid OTP');
    });

    it('should implement retry logic with exponential backoff', async () => {
      const { result } = renderHook(() => useOtpVerification());
      
      // First attempt fails
      supabase.auth.signInWithOtp
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Network error' },
        })
        // Second attempt succeeds
        .mockResolvedValueOnce({
          data: { user: null, session: null },
          error: null,
        });

      await act(async () => {
        await result.current.sendOtpWithRetry('+33612345678');
      });

      expect(supabase.auth.signInWithOtp).toHaveBeenCalledTimes(2);
    });
  });

  describe('useOnboardingStatus', () => {
    it('should track onboarding progress', async () => {
      const { result } = renderHook(() => useOnboardingStatus());

      const mockProfile = {
        id: 'user123',
        onboarding_completed: false,
        onboarding_step: 3,
      };

      supabase.from().select().eq().single.mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      await act(async () => {
        await result.current.checkOnboardingStatus('user123');
      });

      expect(result.current.isCompleted).toBe(false);
      expect(result.current.currentStep).toBe(3);
    });

    it('should update onboarding step', async () => {
      const { result } = renderHook(() => useOnboardingStatus());

      supabase.from().update().eq().select().single.mockResolvedValue({
        data: { onboarding_step: 4 },
        error: null,
      });

      await act(async () => {
        await result.current.updateStep(4);
      });

      expect(result.current.currentStep).toBe(4);
    });

    it('should complete onboarding', async () => {
      const { result } = renderHook(() => useOnboardingStatus());

      supabase.from().update().eq().select().single.mockResolvedValue({
        data: { onboarding_completed: true },
        error: null,
      });

      await act(async () => {
        await result.current.completeOnboarding();
      });

      expect(result.current.isCompleted).toBe(true);
    });
  });
});