import { validatePhoneNumber } from '@/shared/utils/phoneValidation';
import {
  validatePhoneNumber as validateOtpPhone,
  formatPhoneForSupabase,
} from '@/shared/utils/otpHelpers';

describe('Authentication Utils', () => {
  describe('Phone Validation', () => {
    test('should validate correct phone numbers', () => {
      expect(validatePhoneNumber('+33612345678', 'FR')).toBe(true);
      expect(validatePhoneNumber('+1234567890', 'US')).toBe(true);
    });

    test('should reject invalid phone numbers', () => {
      expect(validatePhoneNumber('123', 'FR')).toBe(false);
      expect(validatePhoneNumber('', 'FR')).toBe(false);
      expect(validatePhoneNumber('abc', 'FR')).toBe(false);
    });

    test('should handle different country codes', () => {
      expect(validatePhoneNumber('+33612345678', 'FR')).toBe(true);
      expect(validatePhoneNumber('+447911123456', 'GB')).toBe(true);
      expect(validatePhoneNumber('+4915123456789', 'DE')).toBe(true);
    });
  });

  describe('OTP Helpers', () => {
    test('should validate phone number format', () => {
      const validResult = validateOtpPhone('+33612345678');
      expect(validResult.isValid).toBe(true);

      const invalidResult = validateOtpPhone('123');
      expect(invalidResult.isValid).toBe(false);
    });

    test('should format phone numbers for Supabase', () => {
      const formatted = formatPhoneForSupabase('0612345678', '33');
      expect(formatted).toBe('+33612345678');
    });
  });
});
