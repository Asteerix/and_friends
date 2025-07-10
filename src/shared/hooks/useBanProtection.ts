import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkBanStatus, BanStatus } from '@/shared/utils/bruteforceProtection';

const BAN_CHECK_INTERVAL = 10000; // Check every 10 seconds
const LAST_PHONE_KEY = '@last_phone_number';

/**
 * Hook to protect the app from banned users
 * Checks ban status periodically and redirects to banned screen if necessary
 */
export function useBanProtection() {
  const router = useRouter();
  const segments = useSegments();
  const [banStatus, setBanStatus] = useState<BanStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkBan = async () => {
      try {
        // Get last used phone number
        const lastPhone = await AsyncStorage.getItem(LAST_PHONE_KEY);
        
        if (lastPhone) {
          const status = await checkBanStatus(lastPhone);
          setBanStatus(status);
          
          // If banned and not on banned screen, redirect
          if (status.isBanned && !segments.includes('banned')) {
            router.replace('/auth/banned');
          }
          
          // If not banned and on banned screen, redirect to start
          if (!status.isBanned && segments.includes('banned')) {
            router.replace('/auth/phone-verification');
          }
        }
      } catch (error) {
        console.error('Error checking ban status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    // Initial check
    checkBan();

    // Set up periodic checks
    interval = setInterval(checkBan, BAN_CHECK_INTERVAL);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [router, segments]);

  return {
    banStatus,
    isChecking,
    isBanned: banStatus?.isBanned || false
  };
}

/**
 * Stores the last used phone number for ban checking
 */
export async function storeLastPhoneNumber(phoneNumber: string) {
  try {
    await AsyncStorage.setItem(LAST_PHONE_KEY, phoneNumber);
  } catch (error) {
    console.error('Error storing last phone number:', error);
  }
}

/**
 * Clears the last used phone number
 */
export async function clearLastPhoneNumber() {
  try {
    await AsyncStorage.removeItem(LAST_PHONE_KEY);
  } catch (error) {
    console.error('Error clearing last phone number:', error);
  }
}