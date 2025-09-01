// Override the global mock for this test file to allow unit testing
jest.unmock('@/shared/utils/bruteforceProtection');

import {
  recordFailedOTPAttempt,
  checkBanStatus,
  clearBruteforceData,
  BanStatus,
} from '../bruteforceProtection';
import { supabase } from '@/shared/lib/supabase/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('bruteforceProtection', () => {
  const mockPhoneNumber = '+33612345678';
  const mockDeviceId = 'device-12345';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Configure AsyncStorage mocks
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();
    mockAsyncStorage.multiRemove.mockResolvedValue();

    // Default successful Supabase mock
    mockSupabase.rpc.mockResolvedValue({
      data: [{ is_banned: false }],
      error: null,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('recordFailedOTPAttempt', () => {
    it('should record failed attempt and return not banned initially', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [{ is_banned: false }],
        error: null,
      });

      const result = await recordFailedOTPAttempt(mockPhoneNumber);

      expect(result.isBanned).toBe(false);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('record_failed_otp_attempt', {
        phone_num: mockPhoneNumber,
        device_id_param: 'mock-device-id-123',
        max_attempts: 5,
        window_minutes: 10,
        ban_duration_hours: 1,
      });
    });

    it('should return ban status when user gets banned', async () => {
      const bannedUntil = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          is_banned: true,
          banned_until: bannedUntil,
          ban_reason: 'Too many failed attempts',
        }],
        error: null,
      });

      const result = await recordFailedOTPAttempt(mockPhoneNumber);

      expect(result.isBanned).toBe(true);
      expect(result.bannedUntil).toEqual(new Date(bannedUntil));
      expect(result.reason).toBe('Too many failed attempts');
      expect(result.phoneNumber).toBe(mockPhoneNumber);
      expect(result.timeRemainingSeconds).toBeGreaterThan(3500); // Around 1 hour

      // Should store ban locally
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@ban_status',
        expect.stringContaining(mockPhoneNumber)
      );
    });

    it('should fall back to local tracking when Supabase fails', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      mockAsyncStorage.getItem.mockResolvedValue('[]'); // Empty attempts

      const result = await recordFailedOTPAttempt(mockPhoneNumber);

      expect(result.isBanned).toBe(false);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@failed_attempts',
        expect.stringContaining(mockPhoneNumber)
      );
    });

    it('should ban locally after 5 failed attempts in 10 minutes', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      // Mock 4 existing attempts within the last 10 minutes
      const existingAttempts = Array.from({ length: 4 }, (_, i) => ({
        phoneNumber: mockPhoneNumber,
        timestamp: new Date(Date.now() - (i + 1) * 60000), // 1-4 minutes ago
      }));

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingAttempts));

      const result = await recordFailedOTPAttempt(mockPhoneNumber);

      expect(result.isBanned).toBe(true);
      expect(result.bannedUntil).toBeDefined();
      expect(result.reason).toContain('Too many failed attempts');
      expect(result.timeRemainingSeconds).toBe(3600);

      // Should store ban status
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@ban_status',
        expect.any(String)
      );
    });

    it('should ignore old attempts when calculating ban', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      // Mock old attempts (over 10 minutes ago)
      const oldAttempts = Array.from({ length: 10 }, (_, i) => ({
        phoneNumber: mockPhoneNumber,
        timestamp: new Date(Date.now() - (15 + i) * 60000), // 15+ minutes ago
      }));

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(oldAttempts));

      const result = await recordFailedOTPAttempt(mockPhoneNumber);

      expect(result.isBanned).toBe(false);
    });

    it('should only count attempts for specific phone number', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      // Mix of attempts for different phone numbers
      const mixedAttempts = [
        { phoneNumber: '+33612345678', timestamp: new Date(Date.now() - 60000) },
        { phoneNumber: '+33687654321', timestamp: new Date(Date.now() - 120000) },
        { phoneNumber: '+33612345678', timestamp: new Date(Date.now() - 180000) },
        { phoneNumber: '+33687654321', timestamp: new Date(Date.now() - 240000) },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mixedAttempts));

      const result = await recordFailedOTPAttempt(mockPhoneNumber);

      expect(result.isBanned).toBe(false); // Only 2 attempts for this number
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await recordFailedOTPAttempt(mockPhoneNumber);

      expect(result.isBanned).toBe(false);
      // Should not throw error
    });

    it('should handle device ID retrieval failure', async () => {
      // Since device ID is mocked globally, we'll simulate by testing fallback behavior
      mockSupabase.rpc.mockRejectedValue(new Error('Database error'));

      const result = await recordFailedOTPAttempt(mockPhoneNumber);

      expect(result.isBanned).toBe(false);
      // Should fall back to local tracking
    });
  });

  describe('checkBanStatus', () => {
    it('should return not banned when no ban exists', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [{ is_banned: false }],
        error: null,
      });

      const result = await checkBanStatus(mockPhoneNumber);

      expect(result.isBanned).toBe(false);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('check_otp_ban_status', {
        phone_num: mockPhoneNumber,
        device_id_param: 'mock-device-id-123',
      });
    });

    it('should return ban status from server', async () => {
      const bannedUntil = new Date(Date.now() + 3600000).toISOString();

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          is_banned: true,
          banned_until: bannedUntil,
          ban_reason: 'Too many attempts',
          time_remaining_seconds: 3600,
        }],
        error: null,
      });

      const result = await checkBanStatus(mockPhoneNumber);

      expect(result.isBanned).toBe(true);
      expect(result.bannedUntil).toEqual(new Date(bannedUntil));
      expect(result.reason).toBe('Too many attempts');
      expect(result.timeRemainingSeconds).toBe(3600);

      // Should update local storage
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@ban_status',
        expect.any(String)
      );
    });

    it('should check server ban status first', async () => {
      const bannedUntil = new Date(Date.now() + 3600000);

      // Mock server returning ban status
      mockSupabase.rpc.mockResolvedValue({
        data: [{
          is_banned: true,
          banned_until: bannedUntil.toISOString(),
          ban_reason: 'Server ban',
          time_remaining_seconds: 3600,
        }],
        error: null,
      });

      const result = await checkBanStatus(mockPhoneNumber);

      expect(result.isBanned).toBe(true);
      expect(result.reason).toBe('Server ban');
      expect(result.timeRemainingSeconds).toBe(3600);
    });

    it('should ignore expired local bans', async () => {
      const expiredBan = {
        isBanned: true,
        bannedUntil: new Date(Date.now() - 3600000).toISOString(), // Expired 1 hour ago
        phoneNumber: mockPhoneNumber,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(expiredBan));

      mockSupabase.rpc.mockResolvedValue({
        data: [{ is_banned: false }],
        error: null,
      });

      const result = await checkBanStatus(mockPhoneNumber);

      expect(result.isBanned).toBe(false);
    });

    it('should clear local ban when not banned on server', async () => {
      const localBan = {
        isBanned: true,
        bannedUntil: new Date(Date.now() + 3600000).toISOString(),
        phoneNumber: 'other-phone',
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(localBan));

      mockSupabase.rpc.mockResolvedValue({
        data: [{ is_banned: false }],
        error: null,
      });

      const result = await checkBanStatus(mockPhoneNumber);

      expect(result.isBanned).toBe(false);
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@ban_status');
    });

    it('should fall back to local ban status when server fails', async () => {
      const localBan = {
        isBanned: true,
        bannedUntil: new Date(Date.now() + 3600000).toISOString(),
        phoneNumber: mockPhoneNumber,
        reason: 'Local ban',
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(localBan));

      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Server error' },
      });

      const result = await checkBanStatus(mockPhoneNumber);

      expect(result.isBanned).toBe(true);
      expect(result.reason).toBe('Local ban');
    });

    it('should handle malformed local ban data', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('invalid-json');

      mockSupabase.rpc.mockResolvedValue({
        data: [{ is_banned: false }],
        error: null,
      });

      const result = await checkBanStatus(mockPhoneNumber);

      expect(result.isBanned).toBe(false);
      // Should not throw error
    });

    it('should only return ban for matching phone number', async () => {
      const localBan = {
        isBanned: true,
        bannedUntil: new Date(Date.now() + 3600000).toISOString(),
        phoneNumber: '+33687654321', // Different phone number
        reason: 'Local ban',
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(localBan));

      mockSupabase.rpc.mockResolvedValue({
        data: [{ is_banned: false }],
        error: null,
      });

      const result = await checkBanStatus(mockPhoneNumber);

      expect(result.isBanned).toBe(false);
    });
  });

  describe('clearBruteforceData', () => {
    it('should clear all brute force data from local storage', async () => {
      await clearBruteforceData();

      expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith([
        '@ban_status',
        '@failed_attempts',
      ]);
    });

    it('should handle storage errors gracefully', async () => {
      mockAsyncStorage.multiRemove.mockRejectedValue(new Error('Storage error'));

      await expect(clearBruteforceData()).resolves.toBeUndefined();
      // Should not throw error
    });
  });

  describe('time calculations', () => {
    it('should calculate correct remaining time for bans', async () => {
      const bannedUntil = new Date(Date.now() + 1800000); // 30 minutes from now
      
      // Mock server returning ban with remaining time
      mockSupabase.rpc.mockResolvedValue({
        data: [{
          is_banned: true,
          banned_until: bannedUntil.toISOString(),
          ban_reason: 'Test ban',
          time_remaining_seconds: 1800, // 30 minutes
        }],
        error: null,
      });

      const result = await checkBanStatus(mockPhoneNumber);

      expect(result.isBanned).toBe(true);
      expect(result.timeRemainingSeconds).toBe(1800);
    });

    it('should handle zero or negative remaining time', async () => {
      const bannedUntil = new Date(Date.now() - 1000); // 1 second ago

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          is_banned: true,
          banned_until: bannedUntil.toISOString(),
          ban_reason: 'Test ban',
          time_remaining_seconds: -1,
        }],
        error: null,
      });

      const result = await checkBanStatus(mockPhoneNumber);

      expect(result.timeRemainingSeconds).toBeLessThanOrEqual(0);
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent failed attempt recordings', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [{ is_banned: false }],
        error: null,
      });

      const promises = Array.from({ length: 3 }, () =>
        recordFailedOTPAttempt(mockPhoneNumber)
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result).toBeDefined();
        expect(typeof result.isBanned).toBe('boolean');
      });
    });

    it('should handle concurrent ban status checks', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [{ is_banned: false }],
        error: null,
      });

      const promises = Array.from({ length: 5 }, () =>
        checkBanStatus(mockPhoneNumber)
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result).toBeDefined();
        expect(typeof result.isBanned).toBe('boolean');
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty phone numbers', async () => {
      const result = await recordFailedOTPAttempt('');

      expect(result).toBeDefined();
      expect(typeof result.isBanned).toBe('boolean');
    });

    it('should handle invalid phone number formats', async () => {
      const invalidNumbers = ['invalid', '123', 'not-a-phone'];

      for (const number of invalidNumbers) {
        const result = await recordFailedOTPAttempt(number);
        expect(result).toBeDefined();
        expect(typeof result.isBanned).toBe('boolean');
      }
    });

    it('should handle Supabase returning null data', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await checkBanStatus(mockPhoneNumber);

      expect(result.isBanned).toBe(false);
    });

    it('should handle Supabase returning empty array', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await checkBanStatus(mockPhoneNumber);

      expect(result.isBanned).toBe(false);
    });

    it('should handle malformed server responses', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [{ invalid_structure: true }],
        error: null,
      });

      const result = await checkBanStatus(mockPhoneNumber);

      expect(result.isBanned).toBe(false);
    });

    it('should handle network timeouts', async () => {
      mockSupabase.rpc.mockRejectedValue(new Error('Network timeout'));

      const result = await recordFailedOTPAttempt(mockPhoneNumber);

      expect(result).toBeDefined();
      expect(typeof result.isBanned).toBe('boolean');
    });

    it('should preserve ban data structure integrity', async () => {
      const bannedUntil = new Date(Date.now() + 3600000);

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          is_banned: true,
          banned_until: bannedUntil.toISOString(),
          ban_reason: 'Test ban',
        }],
        error: null,
      });

      const result = await recordFailedOTPAttempt(mockPhoneNumber);

      expect(result).toMatchObject({
        isBanned: true,
        bannedUntil: bannedUntil,
        reason: 'Test ban',
        phoneNumber: mockPhoneNumber,
        timeRemainingSeconds: expect.any(Number),
      });
    });

    it('should handle very long phone numbers', async () => {
      const longNumber = '+' + '1'.repeat(50);

      const result = await recordFailedOTPAttempt(longNumber);

      expect(result).toBeDefined();
      expect(typeof result.isBanned).toBe('boolean');
    });

    it('should handle special characters in phone numbers', async () => {
      const specialNumbers = [
        '+33(6)12-34-56-78',
        '+33 6.12.34.56.78',
        '+33\t612\n345678',
      ];

      for (const number of specialNumbers) {
        const result = await recordFailedOTPAttempt(number);
        expect(result).toBeDefined();
        expect(typeof result.isBanned).toBe('boolean');
      }
    });
  });

  describe('performance considerations', () => {
    it('should not store excessive failed attempts locally', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      // Create 100 failed attempts
      const manyAttempts = Array.from({ length: 100 }, (_, i) => ({
        phoneNumber: mockPhoneNumber,
        timestamp: new Date(Date.now() - i * 1000),
      }));

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(manyAttempts));

      await recordFailedOTPAttempt(mockPhoneNumber);

      // Should store ban status since we exceeded attempts
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@ban_status',
        expect.any(String)
      );
    });

    it('should handle rapid successive calls efficiently', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [{ is_banned: false }],
        error: null,
      });

      const startTime = Date.now();

      const promises = Array.from({ length: 10 }, () =>
        recordFailedOTPAttempt(mockPhoneNumber)
      );

      await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 2 seconds)
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('data consistency', () => {
    it('should maintain consistent ban status across multiple checks', async () => {
      const bannedUntil = new Date(Date.now() + 3600000);

      mockSupabase.rpc.mockResolvedValue({
        data: [{
          is_banned: true,
          banned_until: bannedUntil.toISOString(),
          ban_reason: 'Consistent ban',
        }],
        error: null,
      });

      const results = await Promise.all([
        checkBanStatus(mockPhoneNumber),
        checkBanStatus(mockPhoneNumber),
        checkBanStatus(mockPhoneNumber),
      ]);

      // All results should be consistent
      results.forEach(result => {
        expect(result.isBanned).toBe(true);
        expect(result.reason).toBe('Consistent ban');
        expect(result.bannedUntil).toEqual(bannedUntil);
      });
    });

    it('should sync local and server ban status correctly', async () => {
      // Set up expired local ban
      const localBan = {
        isBanned: true,
        bannedUntil: new Date(Date.now() - 1000).toISOString(), // Expired
        phoneNumber: mockPhoneNumber,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(localBan));

      // Server says not banned
      mockSupabase.rpc.mockResolvedValue({
        data: [{ is_banned: false }],
        error: null,
      });

      const result = await checkBanStatus(mockPhoneNumber);

      // Should return false since local ban is expired and server says not banned
      expect(result.isBanned).toBe(false);
    });
  });
});