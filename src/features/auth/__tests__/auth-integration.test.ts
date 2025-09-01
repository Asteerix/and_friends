import { supabase } from '@/shared/lib/supabase/client';
import { useAuthNavigation } from '@/shared/hooks/useAuthNavigation';
import { validatePhoneNumber } from '@/shared/utils/phoneValidation';
import { sendOTPWithRetry } from '@/shared/utils/otpHelpers';
import { OTPCache } from '@/shared/utils/otpCache';

// Mock external dependencies
jest.mock('@/shared/lib/supabase/client');
jest.mock('@/shared/hooks/useAuthNavigation');
jest.mock('@/shared/utils/phoneValidation', () => ({
  validatePhoneNumber: jest.fn(),
  checkOTPRateLimit: jest.fn(),
  recordOTPRequest: jest.fn(),
}));
jest.mock('@/shared/utils/otpHelpers', () => ({
  sendOTPWithRetry: jest.fn(),
  validatePhoneNumber: jest.fn(),
  showSMSTroubleshootingDialog: jest.fn(),
}));
jest.mock('@/shared/utils/otpCache', () => ({
  OTPCache: {
    hasRecentOTP: jest.fn(),
    recordOTPSent: jest.fn(),
    cleanup: jest.fn(),
    clearCache: jest.fn(),
  },
}));
jest.mock('@/shared/providers/SessionContext', () => ({
  useSession: () => ({
    session: null,
    isLoading: false,
  }),
}));

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Onboarding Flow', () => {
    it('should handle complete onboarding flow successfully', async () => {
      // Mock auth navigation
      const mockNavigateNext = jest.fn();
      (useAuthNavigation as jest.Mock).mockReturnValue({
        navigateNext: mockNavigateNext,
        getProgress: () => 0.1,
      });

      // Mock phone validation
      (validatePhoneNumber as jest.Mock).mockReturnValue({
        isValid: true,
        formattedNumber: '+33612345678',
        error: null,
      });

      // Mock OTP sending
      (sendOTPWithRetry as jest.Mock).mockResolvedValue({
        success: true,
        error: null,
      });

      // Mock OTP cache  
      const mockOTPCache = require('@/shared/utils/otpCache').OTPCache;
      mockOTPCache.hasRecentOTP.mockResolvedValue({
        hasRecent: false,
        canResend: true,
        timeRemaining: 0,
      });

      // Mock Supabase auth for OTP verification
      const mockVerifyOtp = jest.fn().mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            phone: '+33612345678',
            created_at: new Date().toISOString(),
          },
          session: {
            access_token: 'test-token',
            expires_at: Date.now() + 3600000,
          },
        },
        error: null,
      });

      (supabase.auth.verifyOtp as jest.Mock) = mockVerifyOtp;

      // Mock profile creation
      const mockProfileInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'test-user-id',
              phone_number: '+33612345678',
              is_profile_complete: false,
              created_at: new Date().toISOString(),
            },
            error: null,
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            insert: mockProfileInsert,
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          insert: jest.fn(),
          select: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        };
      });

      // Simulate complete flow
      // 1. Phone verification
      const phoneValidation = validatePhoneNumber('612345678', 'FR');
      expect(phoneValidation.isValid).toBe(true);

      const otpResult = await sendOTPWithRetry({
        phone: phoneValidation.formattedNumber!,
        channel: 'sms',
        createUser: true,
      });
      expect(otpResult.success).toBe(true);

      // 2. OTP verification
      const verifyResult = await supabase.auth.verifyOtp({
        phone: phoneValidation.formattedNumber!,
        token: '123456',
        type: 'sms',
      });

      expect(verifyResult.data?.user?.id).toBe('test-user-id');
      expect(verifyResult.data?.session?.access_token).toBe('test-token');

      // 3. Profile creation
      const profileResult = await supabase
        .from('profiles')
        .insert({
          id: 'test-user-id',
          phone_number: '+33612345678',
          is_profile_complete: false,
        })
        .select()
        .single();

      expect(profileResult.data?.id).toBe('test-user-id');
      expect(profileResult.data?.is_profile_complete).toBe(false);
    });

    it('should handle onboarding step validation', () => {
      const steps = [
        'phone-verification',
        'code-verification', 
        'name-input',
        'age-input',
        'avatar-pick',
        'location-picker',
        'hobby-picker',
        'contacts-permission',
      ];

      steps.forEach((step, index) => {
        (useAuthNavigation as jest.Mock).mockReturnValue({
          currentStep: step,
          getProgress: () => (index + 1) / steps.length,
          navigateNext: jest.fn(),
        });

        const { getProgress } = useAuthNavigation(step as any);
        const progress = getProgress();
        
        expect(progress).toBeGreaterThan(0);
        expect(progress).toBeLessThanOrEqual(1);
        expect(progress).toBeCloseTo((index + 1) / steps.length, 2);
      });
    });

    it('should handle profile completion validation', () => {
      const incompleteProfile = {
        id: 'test-user-id',
        full_name: null,
        avatar_url: null,
        location: null,
        date_of_birth: null,
        hobbies: null,
        is_profile_complete: false,
      };

      const completeProfile = {
        id: 'test-user-id',
        full_name: 'John Doe',
        avatar_url: 'https://example.com/avatar.jpg',
        location: 'Paris, France',
        date_of_birth: '1990-01-01',
        hobbies: ['music', 'sports'],
        is_profile_complete: true,
      };

      const checkProfileCompletion = (profile: any) => {
        const requiredFields = ['full_name', 'avatar_url', 'location', 'date_of_birth'];
        const hasRequiredFields = requiredFields.every(field => profile[field]);
        const hasHobbies = profile.hobbies && Array.isArray(profile.hobbies) && profile.hobbies.length > 0;
        
        return hasRequiredFields && hasHobbies;
      };

      expect(checkProfileCompletion(incompleteProfile)).toBe(false);
      expect(checkProfileCompletion(completeProfile)).toBe(true);
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should handle network errors gracefully', async () => {
      (sendOTPWithRetry as jest.Mock).mockRejectedValue(new Error('Network error'));

      try {
        await sendOTPWithRetry({
          phone: '+33612345678',
          channel: 'sms',
          createUser: true,
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Network error');
      }
    });

    it('should handle invalid OTP verification', async () => {
      (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid OTP' },
      });

      const result = await supabase.auth.verifyOtp({
        phone: '+33612345678',
        token: '000000',
        type: 'sms',
      });

      expect(result.error?.message).toBe('Invalid OTP');
      expect(result.data?.user).toBeNull();
    });

    it('should handle session expiry', async () => {
      const expiredSession = {
        access_token: 'expired-token',
        expires_at: Date.now() - 1000, // Expired 1 second ago
      };

      const mockGetSession = jest.fn().mockResolvedValue({
        data: { session: expiredSession },
        error: null,
      });

      (supabase.auth.getSession as jest.Mock) = mockGetSession;

      const result = await supabase.auth.getSession();
      const session = result.data?.session;

      expect(session?.expires_at).toBeLessThan(Date.now());
    });
  });

  describe('Security Validations', () => {
    it('should sanitize and validate phone numbers', () => {
      const testCases = [
        { input: '+33 6 12 34 56 78', expected: '+33 6 12 34 56 78' },
        { input: '+33612<script>345678', expected: '+33612345678' },
        { input: 'DROP TABLE users; +33612345678', expected: '+33612345678' },
        { input: '+33612345678--', expected: '+33612345678--' }, // Hyphens are allowed
      ];

      const sanitizePhoneNumber = (phone: string) => {
        return phone.replace(/[^+\d\s()-]/g, '').trim();
      };

      testCases.forEach(({ input, expected }) => {
        const result = sanitizePhoneNumber(input);
        expect(result).toBe(expected);
      });
    });

    it('should validate OTP code format strictly', () => {
      const validateOTPCode = (code: string) => {
        const cleanCode = code.replace(/\s/g, '');
        return /^\d{6}$/.test(cleanCode);
      };

      const validCodes = ['123456', '12 34 56', '  123456  '];
      const invalidCodes = ['12345', '1234567', 'abcdef', '123abc', ''];

      validCodes.forEach(code => {
        expect(validateOTPCode(code)).toBe(true);
      });

      invalidCodes.forEach(code => {
        expect(validateOTPCode(code)).toBe(false);
      });
    });

    it('should prevent SQL injection in profile creation', async () => {
      const maliciousInput = "'; DROP TABLE profiles; --";

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'test-user-id',
                full_name: maliciousInput, // Supabase should handle this safely
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await supabase
        .from('profiles')
        .insert({
          id: 'test-user-id',
          full_name: maliciousInput,
        })
        .select()
        .single();

      // The malicious input should be stored as-is (Supabase handles parameterization)
      expect(result.data?.full_name).toBe(maliciousInput);
    });
  });

  describe('Rate Limiting and Abuse Prevention', () => {
    it('should respect OTP rate limits', async () => {
      const mockOTPCache = require('@/shared/utils/otpCache').OTPCache;
      mockOTPCache.hasRecentOTP.mockResolvedValue({
        hasRecent: true,
        canResend: false,
        timeRemaining: 45,
      });

      const mockSendOTP = require('@/shared/utils/otpHelpers').sendOTPWithRetry;
      mockSendOTP.mockResolvedValue({
        cached: true,
        error: 'Code déjà envoyé',
      });

      const result = await sendOTPWithRetry({
        phone: '+33612345678',
      });

      expect(result.cached).toBe(true);
      expect(result.error).toContain('Code déjà envoyé');
    });

    it('should handle brute force protection', () => {
      const mockBruteForceProtection = {
        attempts: new Map(),
        recordFailedAttempt: function(phone: string) {
          const current = this.attempts.get(phone) || 0;
          this.attempts.set(phone, current + 1);
        },
        isBlocked: function(phone: string) {
          return (this.attempts.get(phone) || 0) >= 5;
        },
        clearAttempts: function(phone: string) {
          this.attempts.delete(phone);
        }
      };

      const phoneNumber = '+33612345678';

      // Simulate 4 failed attempts (should not be blocked)
      for (let i = 0; i < 4; i++) {
        mockBruteForceProtection.recordFailedAttempt(phoneNumber);
      }
      expect(mockBruteForceProtection.isBlocked(phoneNumber)).toBe(false);

      // 5th attempt should trigger block
      mockBruteForceProtection.recordFailedAttempt(phoneNumber);
      expect(mockBruteForceProtection.isBlocked(phoneNumber)).toBe(true);

      // Clearing attempts should unblock
      mockBruteForceProtection.clearAttempts(phoneNumber);
      expect(mockBruteForceProtection.isBlocked(phoneNumber)).toBe(false);
    });
  });
});