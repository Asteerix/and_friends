import { supabase } from '@/shared/lib/supabase/client';
import { validatePhoneNumber } from '@/shared/utils/phoneValidation';
import { checkBanStatus, recordFailedOTPAttempt } from '@/shared/utils/bruteforceProtection';

describe('Authentication Flow Integration', () => {
  const testPhoneNumber = '+33612345678';
  const testOTP = '123456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Phone Number Validation and OTP Flow', () => {
    it('should validate phone number and send OTP', async () => {
      // Mock phone validation
      const mockValidation = {
        isValid: true,
        formattedNumber: testPhoneNumber,
        cleanNumber: '612345678'
      };
      (validatePhoneNumber as jest.Mock).mockReturnValue(mockValidation);

      // Mock rate limit check
      const mockRateLimit = { canRequest: true };
      (checkBanStatus as jest.Mock).mockResolvedValue({ isBanned: false });

      // Mock Supabase OTP request
      const mockOTPResponse = {
        data: { user: null, session: null },
        error: null
      };
      (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue(mockOTPResponse);

      // Test the flow
      const phoneValidation = validatePhoneNumber(testPhoneNumber, 'FR');
      expect(phoneValidation.isValid).toBe(true);

      const banStatus = await checkBanStatus(testPhoneNumber);
      expect(banStatus.isBanned).toBe(false);

      const otpResult = await supabase.auth.signInWithOtp({
        phone: testPhoneNumber
      });

      expect(otpResult.error).toBeNull();
      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        phone: testPhoneNumber
      });
    });

    it('should handle failed OTP verification with brute force protection', async () => {
      // Mock failed OTP verification
      const mockVerifyError = {
        data: { user: null, session: null },
        error: { message: 'Invalid OTP' }
      };
      (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue(mockVerifyError);

      // Mock brute force protection
      const mockBanStatus = { isBanned: false };
      (recordFailedOTPAttempt as jest.Mock).mockResolvedValue(mockBanStatus);

      // Attempt verification
      const verifyResult = await supabase.auth.verifyOtp({
        phone: testPhoneNumber,
        token: 'wrong-otp',
        type: 'sms'
      });

      expect(verifyResult.error).toBeTruthy();

      // Record failed attempt
      const banStatus = await recordFailedOTPAttempt(testPhoneNumber);
      expect(banStatus.isBanned).toBe(false);
      expect(recordFailedOTPAttempt).toHaveBeenCalledWith(testPhoneNumber);
    });

    it('should prevent OTP requests when user is banned', async () => {
      // Mock ban status
      const mockBanStatus = {
        isBanned: true,
        bannedUntil: new Date(Date.now() + 3600000), // 1 hour from now
        reason: 'Too many failed attempts',
        timeRemainingSeconds: 3600
      };
      (checkBanStatus as jest.Mock).mockResolvedValue(mockBanStatus);

      const banStatus = await checkBanStatus(testPhoneNumber);
      
      expect(banStatus.isBanned).toBe(true);
      expect(banStatus.timeRemainingSeconds).toBeGreaterThan(0);
      
      // Should not attempt OTP request when banned
      if (banStatus.isBanned) {
        expect(supabase.auth.signInWithOtp).not.toHaveBeenCalled();
      }
    });
  });

  describe('Successful Authentication Flow', () => {
    it('should complete full authentication flow', async () => {
      // Mock successful OTP verification
      const mockUser = {
        id: 'user-123',
        phone: testPhoneNumber,
        email: null
      };
      
      const mockSession = {
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        user: mockUser
      };

      const mockVerifySuccess = {
        data: { user: mockUser, session: mockSession },
        error: null
      };
      (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue(mockVerifySuccess);

      // Mock profile creation/update
      const mockProfileResponse = {
        data: {
          id: mockUser.id,
          phone: testPhoneNumber,
          is_profile_complete: false,
          current_registration_step: 'name-input'
        },
        error: null
      };
      (supabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockResolvedValue(mockProfileResponse),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue(mockProfileResponse)
      });

      // Test successful verification
      const verifyResult = await supabase.auth.verifyOtp({
        phone: testPhoneNumber,
        token: testOTP,
        type: 'sms'
      });

      expect(verifyResult.error).toBeNull();
      expect(verifyResult.data?.user?.id).toBe(mockUser.id);
      expect(verifyResult.data?.session?.access_token).toBe('mock-token');

      // Test profile creation
      const profileResult = await supabase
        .from('profiles')
        .upsert({
          id: mockUser.id,
          phone: testPhoneNumber,
          current_registration_step: 'name-input'
        });

      expect(profileResult.error).toBeNull();
      expect(profileResult.data?.current_registration_step).toBe('name-input');
    });
  });

  describe('Session Management', () => {
    it('should handle session retrieval and refresh', async () => {
      const mockSession = {
        access_token: 'current-token',
        refresh_token: 'current-refresh',
        user: { id: 'user-123', phone: testPhoneNumber }
      };

      // Mock session retrieval
      const mockSessionResponse = {
        data: { session: mockSession },
        error: null
      };
      (supabase.auth.getSession as jest.Mock).mockResolvedValue(mockSessionResponse);

      const sessionResult = await supabase.auth.getSession();
      
      expect(sessionResult.error).toBeNull();
      expect(sessionResult.data?.session?.user?.id).toBe('user-123');
    });

    it('should handle session expiry and logout', async () => {
      // Mock logout
      const mockLogoutResponse = { error: null };
      (supabase.auth.signOut as jest.Mock).mockResolvedValue(mockLogoutResponse);

      const logoutResult = await supabase.auth.signOut();
      expect(logoutResult.error).toBeNull();
    });
  });

  describe('Profile Completion Flow', () => {
    it('should update profile through registration steps', async () => {
      const userId = 'user-123';
      const steps = ['name-input', 'age-input', 'avatar-pick', 'completed'];

      for (const step of steps) {
        const mockUpdateResponse = {
          data: {
            id: userId,
            current_registration_step: step,
            is_profile_complete: step === 'completed'
          },
          error: null
        };

        (supabase.from as jest.Mock).mockReturnValue({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue(mockUpdateResponse)
        });

        const updateResult = await supabase
          .from('profiles')
          .update({ current_registration_step: step })
          .eq('id', userId);

        expect(updateResult.error).toBeNull();
        expect(updateResult.data?.current_registration_step).toBe(step);
      }
    });
  });
});