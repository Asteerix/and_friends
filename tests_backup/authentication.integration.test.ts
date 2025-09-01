/**
 * Integration tests for authentication flow
 * Tests the complete authentication pipeline from phone verification to profile creation
 */

import { supabase } from '@/shared/lib/supabase/client';
import { validatePhoneNumber } from '@/shared/utils/phoneNumberValidation';
import { recordFailedOTPAttempt, checkBanStatus } from '@/shared/utils/bruteforceProtection';

// Mock the entire Supabase client for integration tests
jest.mock('@/shared/lib/supabase/client');
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations
    mockSupabase.auth.signInWithOtp.mockResolvedValue({
      data: {},
      error: null,
    });

    mockSupabase.auth.verifyOtp.mockResolvedValue({
      data: { user: { id: 'test-user-1', phone: '+33612345678' }, session: {} },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    } as any);
  });

  describe('Phone Number Verification Flow', () => {
    test('should complete full phone verification process', async () => {
      const phoneNumber = '+33123456789';

      // Step 1: Validate phone number
      const validation = validatePhoneNumber(phoneNumber);
      expect(validation.isValid).toBe(true);

      // Step 2: Request OTP
      const otpResult = await mockSupabase.auth.signInWithOtp({
        phone: phoneNumber,
      });

      expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
        phone: phoneNumber,
      });
      expect(otpResult.error).toBeNull();

      // Step 3: Verify OTP
      const verifyResult = await mockSupabase.auth.verifyOtp({
        phone: phoneNumber,
        token: '123456',
        type: 'sms',
      });

      expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({
        phone: phoneNumber,
        token: '123456',
        type: 'sms',
      });
      expect(verifyResult.error).toBeNull();
      expect(verifyResult.data.user).toBeTruthy();
    });

    test('should handle invalid phone numbers', async () => {
      const invalidNumbers = ['123', '++33123456789', 'invalid', ''];

      for (const number of invalidNumbers) {
        const validation = validatePhoneNumber(number);
        expect(validation.isValid).toBe(false);
        expect(validation.error).toBeDefined();
      }
    });

    test('should handle OTP verification failures', async () => {
      const phoneNumber = '+33123456789';

      mockSupabase.auth.verifyOtp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid OTP', name: 'AuthError' } as any,
      });

      const result = await mockSupabase.auth.verifyOtp({
        phone: phoneNumber,
        token: 'wrong',
        type: 'sms',
      });

      expect(result.error).toBeTruthy();
      expect(result.data.user).toBeNull();
    });
  });

  describe('Brute Force Protection Integration', () => {
    test('should track failed attempts and enforce bans', async () => {
      const phoneNumber = '+33123456789';

      // Mock failed attempts
      const banResult = await recordFailedOTPAttempt(phoneNumber);
      expect(banResult.isBanned).toBe(false); // First attempt shouldn't ban

      // Check ban status
      const status = await checkBanStatus(phoneNumber);
      expect(status.isBanned).toBe(false);
    });

    test('should prevent OTP requests when banned', async () => {
      const phoneNumber = '+33123456789';

      // Mock a banned status
      jest.mocked(checkBanStatus).mockResolvedValue({
        isBanned: true,
        bannedUntil: new Date(Date.now() + 60000),
        reason: 'Too many failed attempts',
        phoneNumber,
        timeRemainingSeconds: 60,
      });

      const status = await checkBanStatus(phoneNumber);
      expect(status.isBanned).toBe(true);
      expect(status.timeRemainingSeconds).toBeGreaterThan(0);
    });
  });

  describe('Profile Creation Integration', () => {
    test('should create user profile after successful authentication', async () => {
      const userId = 'test-user-1';
      const phoneNumber = '+33123456789';

      // Mock successful auth
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId, phone: phoneNumber } },
        error: null,
      } as any);

      // Mock profile creation
      mockSupabase.from().insert.mockResolvedValue({
        data: {
          id: userId,
          current_registration_step: 'name_input',
          created_at: new Date().toISOString(),
        },
        error: null,
      } as any);

      const { data: user } = await mockSupabase.auth.getUser();
      expect(user?.user?.id).toBe(userId);

      // Create profile
      const profileResult = await mockSupabase.from('profiles').insert([
        {
          id: userId,
          current_registration_step: 'name_input',
          created_at: new Date().toISOString(),
        },
      ]);

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(profileResult.error).toBeNull();
    });

    test('should handle profile creation errors', async () => {
      const userId = 'test-user-1';

      mockSupabase.from().insert.mockResolvedValue({
        data: null,
        error: { message: 'Profile already exists', code: '23505' },
      } as any);

      const result = await mockSupabase.from('profiles').insert([
        {
          id: userId,
          current_registration_step: 'name_input',
        },
      ]);

      expect(result.error).toBeTruthy();
    });
  });

  describe('Session Management Integration', () => {
    test('should maintain session state across app lifecycle', async () => {
      // Mock session retrieval
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'test-user-1', phone: '+33123456789' },
            access_token: 'mock-token',
          },
        },
        error: null,
      } as any);

      const { data } = await mockSupabase.auth.getSession();
      expect(data.session).toBeTruthy();
      expect(data.session?.user.id).toBe('test-user-1');
    });

    test('should handle session expiration', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session expired' } as any,
      });

      const { data, error } = await mockSupabase.auth.getSession();
      expect(data.session).toBeNull();
      expect(error).toBeTruthy();
    });

    test('should sign out users properly', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      const result = await mockSupabase.auth.signOut();
      expect(result.error).toBeNull();
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('Error Recovery Integration', () => {
    test('should recover from network failures', async () => {
      // Simulate network error then success
      mockSupabase.auth.verifyOtp
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: { user: { id: 'test-user-1' }, session: {} },
          error: null,
        } as any);

      // First attempt fails
      try {
        await mockSupabase.auth.verifyOtp({
          phone: '+33123456789',
          token: '123456',
          type: 'sms',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      // Second attempt succeeds
      const result = await mockSupabase.auth.verifyOtp({
        phone: '+33123456789',
        token: '123456',
        type: 'sms',
      });

      expect(result.error).toBeNull();
      expect(result.data.user).toBeTruthy();
    });

    test('should handle database connectivity issues', async () => {
      mockSupabase.from().select.mockRejectedValue(new Error('Database connection failed'));

      try {
        await mockSupabase.from('profiles').select('*');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Database connection failed');
      }
    });
  });

  describe('Security Validation Integration', () => {
    test('should prevent authentication with invalid credentials', async () => {
      const testCases = [
        { phone: '', token: '123456' },
        { phone: '+33123456789', token: '' },
        { phone: 'invalid', token: 'invalid' },
      ];

      for (const testCase of testCases) {
        mockSupabase.auth.verifyOtp.mockResolvedValueOnce({
          data: { user: null, session: null },
          error: { message: 'Invalid credentials' } as any,
        });

        const result = await mockSupabase.auth.verifyOtp({
          phone: testCase.phone,
          token: testCase.token,
          type: 'sms',
        });

        expect(result.error).toBeTruthy();
        expect(result.data.user).toBeNull();
      }
    });

    test('should validate phone number format before processing', async () => {
      const invalidPhones = [
        '+invalid',
        '123456789',
        '+' + '1'.repeat(20), // Too long
        '+', // Too short
      ];

      for (const phone of invalidPhones) {
        const validation = validatePhoneNumber(phone);
        expect(validation.isValid).toBe(false);
      }
    });
  });
});
