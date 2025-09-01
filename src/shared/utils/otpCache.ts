import AsyncStorage from '@react-native-async-storage/async-storage';

const OTP_CACHE_KEY = '@otp_cache';
const OTP_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface OTPCacheEntry {
  phoneNumber: string;
  sentAt: number;
  expiresAt: number;
  retryCount: number;
  lastError?: string;
}

/**
 * Cache OTP requests to avoid duplicate sends within short time window
 */
export class OTPCache {
  /**
   * Check if we recently sent OTP to this number
   */
  static async hasRecentOTP(phoneNumber: string): Promise<{
    hasRecent: boolean;
    timeRemaining?: number;
    canResend?: boolean;
  }> {
    try {
      const cacheData = await AsyncStorage.getItem(OTP_CACHE_KEY);
      if (!cacheData) return { hasRecent: false, canResend: true };

      const cache: Record<string, OTPCacheEntry> = JSON.parse(cacheData);
      const entry = cache[phoneNumber];

      if (!entry) return { hasRecent: false, canResend: true };

      const now = Date.now();

      // If expired, allow resend
      if (now > entry.expiresAt) {
        delete cache[phoneNumber];
        await AsyncStorage.setItem(OTP_CACHE_KEY, JSON.stringify(cache));
        return { hasRecent: false, canResend: true };
      }

      // Check if we can resend (after 60 seconds)
      const timeSinceSent = now - entry.sentAt;
      const canResend = timeSinceSent > 60000; // 1 minute
      const timeRemaining = Math.max(0, Math.ceil((entry.expiresAt - now) / 1000));

      return {
        hasRecent: true,
        timeRemaining,
        canResend,
      };
    } catch (error) {
      console.error('Error checking OTP cache:', error);
      return { hasRecent: false, canResend: true };
    }
  }

  /**
   * Record that OTP was sent
   */
  static async recordOTPSent(phoneNumber: string): Promise<void> {
    try {
      const cacheData = await AsyncStorage.getItem(OTP_CACHE_KEY);
      const cache: Record<string, OTPCacheEntry> = cacheData ? JSON.parse(cacheData) : {};

      const existing = cache[phoneNumber];

      cache[phoneNumber] = {
        phoneNumber,
        sentAt: Date.now(),
        expiresAt: Date.now() + OTP_CACHE_DURATION,
        retryCount: existing ? existing.retryCount + 1 : 0,
      };

      await AsyncStorage.setItem(OTP_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Error recording OTP sent:', error);
    }
  }

  /**
   * Clear cache for a number (e.g., after successful verification)
   */
  static async clearCache(phoneNumber: string): Promise<void> {
    try {
      const cacheData = await AsyncStorage.getItem(OTP_CACHE_KEY);
      if (!cacheData) return;

      const cache: Record<string, OTPCacheEntry> = JSON.parse(cacheData);
      delete cache[phoneNumber];

      await AsyncStorage.setItem(OTP_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Error clearing OTP cache:', error);
    }
  }

  /**
   * Clean up expired entries
   */
  static async cleanup(): Promise<void> {
    try {
      const cacheData = await AsyncStorage.getItem(OTP_CACHE_KEY);
      if (!cacheData) return;

      const cache: Record<string, OTPCacheEntry> = JSON.parse(cacheData);
      const now = Date.now();

      // Remove expired entries
      Object.keys(cache).forEach((key) => {
        if (cache[key] && cache[key].expiresAt < now) {
          delete cache[key];
        }
      });

      await AsyncStorage.setItem(OTP_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Error cleaning OTP cache:', error);
    }
  }
}
