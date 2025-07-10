import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import BannedScreen from '@/features/auth/screens/BannedScreen';
import { checkBanStatus, BanStatus } from '@/shared/utils/bruteforceProtection';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_PHONE_KEY = '@last_phone_number';

export default function BannedPage() {
  const router = useRouter();
  const [banStatus, setBanStatus] = useState<BanStatus | null>(null);

  useEffect(() => {
    const loadBanStatus = async () => {
      try {
        // Get last used phone number
        const lastPhone = await AsyncStorage.getItem(LAST_PHONE_KEY);
        
        if (lastPhone) {
          const status = await checkBanStatus(lastPhone);
          setBanStatus(status);
          
          // If not banned, redirect to phone verification
          if (!status.isBanned) {
            router.replace('/auth/phone-verification');
          }
        } else {
          // No phone number stored, redirect to start
          router.replace('/auth/phone-verification');
        }
      } catch (error) {
        console.error('Error loading ban status:', error);
        // On error, redirect to start
        router.replace('/auth/phone-verification');
      }
    };

    loadBanStatus();

    // Check periodically if ban has expired
    const interval = setInterval(async () => {
      if (banStatus && banStatus.isBanned) {
        const lastPhone = await AsyncStorage.getItem(LAST_PHONE_KEY);
        if (lastPhone) {
          const status = await checkBanStatus(lastPhone);
          if (!status.isBanned) {
            router.replace('/auth/phone-verification');
          }
        }
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [router]);

  if (!banStatus || !banStatus.isBanned) {
    return null;
  }

  return <BannedScreen banStatus={banStatus} />;
}