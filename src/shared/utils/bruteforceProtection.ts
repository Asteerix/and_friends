import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/shared/lib/supabase/client';
import { getDeviceId } from './deviceId';

const BAN_STATUS_KEY = '@ban_status';
const FAILED_ATTEMPTS_KEY = '@failed_attempts';

export interface BanStatus {
  isBanned: boolean;
  bannedUntil?: Date;
  reason?: string;
  phoneNumber?: string;
  timeRemainingSeconds?: number;
}

export interface FailedAttempt {
  phoneNumber: string;
  timestamp: Date;
}

/**
 * Records a failed OTP verification attempt and checks for bruteforce
 * @param phoneNumber - The phone number that failed verification
 * @returns Ban status after recording the failed attempt
 */
export async function recordFailedOTPAttempt(phoneNumber: string): Promise<BanStatus> {
  try {
    const deviceId = await getDeviceId();
    
    // Call Supabase function to record failed attempt
    const { data, error } = await supabase
      .rpc('record_failed_otp_attempt', {
        phone_num: phoneNumber,
        device_id_param: deviceId,
        max_attempts: 5, // 5 attempts
        window_minutes: 10, // in 10 minutes
        ban_duration_hours: 1 // ban for 1 hour
      });
    
    if (error) {
      console.error('Error recording failed attempt:', error);
      // Fall back to local tracking
      return await recordFailedAttemptLocally(phoneNumber);
    }
    
    if (data && data.length > 0) {
      const result = data[0];
      
      if (result.is_banned) {
        const banStatus: BanStatus = {
          isBanned: true,
          bannedUntil: new Date(result.banned_until),
          reason: result.ban_reason,
          phoneNumber: phoneNumber,
          timeRemainingSeconds: Math.max(0, Math.floor((new Date(result.banned_until).getTime() - Date.now()) / 1000))
        };
        
        // Store ban status locally
        await storeBanStatusLocally(banStatus);
        
        return banStatus;
      }
    }
    
    return { isBanned: false };
  } catch (error) {
    console.error('Error in recordFailedOTPAttempt:', error);
    // Fall back to local tracking
    return await recordFailedAttemptLocally(phoneNumber);
  }
}

/**
 * Checks if a phone number is currently banned
 * @param phoneNumber - The phone number to check
 * @returns Current ban status
 */
export async function checkBanStatus(phoneNumber: string): Promise<BanStatus> {
  try {
    // First check local storage
    const localBan = await getLocalBanStatus();
    if (localBan.isBanned && localBan.phoneNumber === phoneNumber) {
      if (localBan.bannedUntil && new Date(localBan.bannedUntil) > new Date()) {
        return {
          ...localBan,
          timeRemainingSeconds: Math.max(0, Math.floor((new Date(localBan.bannedUntil).getTime() - Date.now()) / 1000))
        };
      }
    }
    
    const deviceId = await getDeviceId();
    
    // Check with Supabase
    const { data, error } = await supabase
      .rpc('check_otp_ban_status', {
        phone_num: phoneNumber,
        device_id_param: deviceId
      });
    
    if (error) {
      console.error('Error checking ban status:', error);
      // Return local ban status if available
      return localBan;
    }
    
    if (data && data.length > 0) {
      const result = data[0];
      
      if (result.is_banned) {
        const banStatus: BanStatus = {
          isBanned: true,
          bannedUntil: new Date(result.banned_until),
          reason: result.ban_reason,
          phoneNumber: phoneNumber,
          timeRemainingSeconds: result.time_remaining_seconds || 0
        };
        
        // Update local storage
        await storeBanStatusLocally(banStatus);
        
        return banStatus;
      }
    }
    
    // Clear local ban if not banned on server
    await clearLocalBan();
    
    return { isBanned: false };
  } catch (error) {
    console.error('Error in checkBanStatus:', error);
    // Return local ban status if available
    return await getLocalBanStatus();
  }
}

/**
 * Local fallback for recording failed attempts
 */
async function recordFailedAttemptLocally(phoneNumber: string): Promise<BanStatus> {
  try {
    // Get existing attempts
    const attemptsJson = await AsyncStorage.getItem(FAILED_ATTEMPTS_KEY);
    let attempts: FailedAttempt[] = attemptsJson ? JSON.parse(attemptsJson) : [];
    
    // Add new attempt
    attempts.push({
      phoneNumber,
      timestamp: new Date()
    });
    
    // Filter attempts within last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentAttempts = attempts.filter(
      a => a.phoneNumber === phoneNumber && new Date(a.timestamp) > tenMinutesAgo
    );
    
    // Check if should ban
    if (recentAttempts.length >= 5) {
      const bannedUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      const banStatus: BanStatus = {
        isBanned: true,
        bannedUntil,
        reason: `Too many failed attempts (${recentAttempts.length} in 10 minutes)`,
        phoneNumber,
        timeRemainingSeconds: 3600
      };
      
      await storeBanStatusLocally(banStatus);
      return banStatus;
    }
    
    // Store updated attempts
    await AsyncStorage.setItem(FAILED_ATTEMPTS_KEY, JSON.stringify(attempts));
    
    return { isBanned: false };
  } catch (error) {
    console.error('Error in local attempt tracking:', error);
    return { isBanned: false };
  }
}

/**
 * Stores ban status locally
 */
async function storeBanStatusLocally(banStatus: BanStatus): Promise<void> {
  try {
    await AsyncStorage.setItem(BAN_STATUS_KEY, JSON.stringify(banStatus));
  } catch (error) {
    console.error('Error storing ban status:', error);
  }
}

/**
 * Gets local ban status
 */
async function getLocalBanStatus(): Promise<BanStatus> {
  try {
    const banJson = await AsyncStorage.getItem(BAN_STATUS_KEY);
    if (banJson) {
      const ban = JSON.parse(banJson);
      // Check if ban is still valid
      if (ban.bannedUntil && new Date(ban.bannedUntil) > new Date()) {
        return {
          ...ban,
          bannedUntil: new Date(ban.bannedUntil),
          timeRemainingSeconds: Math.max(0, Math.floor((new Date(ban.bannedUntil).getTime() - Date.now()) / 1000))
        };
      }
    }
  } catch (error) {
    console.error('Error getting local ban status:', error);
  }
  
  return { isBanned: false };
}

/**
 * Clears local ban status
 */
async function clearLocalBan(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BAN_STATUS_KEY);
  } catch (error) {
    console.error('Error clearing local ban:', error);
  }
}

/**
 * Clears all local bruteforce protection data
 */
export async function clearBruteforceData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([BAN_STATUS_KEY, FAILED_ATTEMPTS_KEY]);
  } catch (error) {
    console.error('Error clearing bruteforce data:', error);
  }
}