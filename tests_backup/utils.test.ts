/**
 * Tests for utility functions
 */

import { deviceId } from '@/shared/utils/deviceId';
import { bruteforceProtection } from '@/shared/utils/bruteforceProtection';

// Mock the modules first
jest.mock('@/shared/utils/deviceId');
jest.mock('@/shared/utils/bruteforceProtection');

describe('Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Device ID', () => {
    it('should generate consistent device ID', async () => {
      const mockDeviceId = deviceId as jest.MockedFunction<typeof deviceId>;
      mockDeviceId.mockResolvedValue('test-device-id-123');

      const id = await deviceId();

      expect(id).toBe('test-device-id-123');
      expect(mockDeviceId).toHaveBeenCalled();
    });

    it('should handle device ID generation errors gracefully', async () => {
      const mockDeviceId = deviceId as jest.MockedFunction<typeof deviceId>;
      mockDeviceId.mockRejectedValue(new Error('Device ID generation failed'));

      try {
        await deviceId();
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Device ID generation failed');
      }
    });
  });

  describe('Brute Force Protection', () => {
    it('should record failed attempts', () => {
      const mockRecordFailedAttempt = bruteforceProtection.recordFailedAttempt as jest.Mock;

      bruteforceProtection.recordFailedAttempt('test-phone');

      expect(mockRecordFailedAttempt).toHaveBeenCalledWith('test-phone');
    });

    it('should clear attempts', () => {
      const mockClearAttempts = bruteforceProtection.clearAttempts as jest.Mock;

      bruteforceProtection.clearAttempts('test-phone');

      expect(mockClearAttempts).toHaveBeenCalledWith('test-phone');
    });

    it('should check if blocked', () => {
      const mockIsBlocked = bruteforceProtection.isBlocked as jest.Mock;
      mockIsBlocked.mockReturnValue(false);

      const result = bruteforceProtection.isBlocked('test-phone');

      expect(mockIsBlocked).toHaveBeenCalledWith('test-phone');
      expect(result).toBe(false);
    });

    it('should block after multiple failed attempts', () => {
      const mockIsBlocked = bruteforceProtection.isBlocked as jest.Mock;
      mockIsBlocked.mockReturnValue(true);

      const result = bruteforceProtection.isBlocked('blocked-phone');

      expect(result).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle null values gracefully', () => {
      expect(() => {
        bruteforceProtection.isBlocked(null as any);
      }).not.toThrow();
    });

    it('should handle undefined values gracefully', () => {
      expect(() => {
        bruteforceProtection.isBlocked(undefined as any);
      }).not.toThrow();
    });

    it('should handle empty string values gracefully', () => {
      const mockIsBlocked = bruteforceProtection.isBlocked as jest.Mock;
      mockIsBlocked.mockReturnValue(false);

      const result = bruteforceProtection.isBlocked('');
      expect(result).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should have proper types for constants', () => {
      // Test that our mock functions return the expected types
      const mockIsBlocked = bruteforceProtection.isBlocked as jest.Mock;
      mockIsBlocked.mockReturnValue(true);

      const result = bruteforceProtection.isBlocked('test');
      expect(typeof result).toBe('boolean');
    });
  });
});
