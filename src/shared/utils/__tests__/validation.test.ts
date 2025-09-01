import { describe, it, expect, beforeEach } from '@jest/globals';
import { validatePhoneNumber, formatPhoneNumber } from '../phoneNumberValidation';
import { validateSupabaseConnection } from '../supabaseValidation';
import { validateSession } from '../sessionHelpers';

describe('Validation Utils', () => {
  describe('Phone Number Validation', () => {
    it('should validate French phone numbers', () => {
      expect(validatePhoneNumber('+33612345678')).toBe(true);
      expect(validatePhoneNumber('0612345678')).toBe(true);
      expect(validatePhoneNumber('+33 6 12 34 56 78')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhoneNumber('123')).toBe(false);
      expect(validatePhoneNumber('invalid')).toBe(false);
      expect(validatePhoneNumber('')).toBe(false);
    });

    it('should format phone numbers correctly', () => {
      expect(formatPhoneNumber('0612345678')).toBe('+33612345678');
      expect(formatPhoneNumber('+33612345678')).toBe('+33612345678');
    });
  });

  describe('Supabase Connection Validation', () => {
    it('should validate Supabase URL format', () => {
      const validUrl = 'https://project.supabase.co';
      const invalidUrl = 'not-a-url';
      
      expect(() => validateSupabaseConnection(validUrl, 'key')).not.toThrow();
      expect(() => validateSupabaseConnection(invalidUrl, 'key')).toThrow();
    });

    it('should validate Supabase anon key format', () => {
      const validKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature';
      const invalidKey = 'invalid-key';
      
      expect(() => validateSupabaseConnection('https://test.supabase.co', validKey)).not.toThrow();
      expect(() => validateSupabaseConnection('https://test.supabase.co', invalidKey)).toThrow();
    });
  });

  describe('Session Validation', () => {
    it('should validate active sessions', () => {
      const validSession = {
        access_token: 'valid-token',
        refresh_token: 'refresh-token',
        expires_at: Date.now() / 1000 + 3600,
        user: { id: 'user-id' }
      };

      expect(validateSession(validSession)).toBe(true);
    });

    it('should reject expired sessions', () => {
      const expiredSession = {
        access_token: 'valid-token',
        refresh_token: 'refresh-token',
        expires_at: Date.now() / 1000 - 3600,
        user: { id: 'user-id' }
      };

      expect(validateSession(expiredSession)).toBe(false);
    });

    it('should reject invalid session structure', () => {
      expect(validateSession(null)).toBe(false);
      expect(validateSession({})).toBe(false);
      expect(validateSession({ access_token: 'token' })).toBe(false);
    });
  });
});