/**
 * Tests for PhoneNumberValidator
 */

import { PhoneNumberValidator } from '@/shared/utils/phoneNumberValidation';

describe('PhoneNumberValidator', () => {
  describe('validate', () => {
    it('should validate French mobile numbers correctly', () => {
      const result = PhoneNumberValidator.validate('+33623456789', 'FR');

      expect(result.isValid).toBe(true);
      expect(result.riskScore).toBeLessThan(30);
      expect(result.isDisposable).toBe(false);
    });

    it('should reject disposable numbers', () => {
      const result = PhoneNumberValidator.validate('+33706543210', 'FR');

      expect(result.isDisposable).toBe(true);
      expect(result.riskScore).toBeGreaterThan(40);
    });

    it('should detect suspicious patterns', () => {
      const result = PhoneNumberValidator.validate('+33611111111', 'FR');

      expect(result.isSuspicious).toBe(true);
      expect(result.riskScore).toBeGreaterThan(20);
    });

    it('should handle empty or invalid input', () => {
      const result = PhoneNumberValidator.validate('', 'FR');

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('court');
    });

    it('should validate country-specific format correctly', () => {
      // Valid French mobile
      const validFR = PhoneNumberValidator.validate('+33623456789', 'FR');
      expect(validFR.isValid).toBe(true);

      // Invalid French mobile (starts with 5)
      const invalidFR = PhoneNumberValidator.validate('+33523456789', 'FR');
      expect(invalidFR.isValid).toBe(false);
    });
  });

  describe('getRiskMessage', () => {
    it('should return null for low risk numbers', () => {
      const result = {
        isValid: true,
        isSuspicious: false,
        isDisposable: false,
        riskScore: 10,
      };

      const message = PhoneNumberValidator.getRiskMessage(result);
      expect(message).toBeNull();
    });

    it('should return message for disposable numbers', () => {
      const result = {
        isValid: false,
        isSuspicious: false,
        isDisposable: true,
        riskScore: 60,
      };

      const message = PhoneNumberValidator.getRiskMessage(result);
      expect(message).toContain('temporaire');
    });

    it('should return message for high risk numbers', () => {
      const result = {
        isValid: false,
        isSuspicious: true,
        isDisposable: false,
        riskScore: 80,
      };

      const message = PhoneNumberValidator.getRiskMessage(result);
      expect(message).toContain('ne peut pas être utilisé');
    });
  });
});
