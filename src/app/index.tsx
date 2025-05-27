// UNUSED: This file is part of Expo Router structure but the app uses React Navigation instead

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useSession } from '@/lib/SessionContext';

/*
export default function Index() {
  const router = useRouter();
  const { session, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading) {
      if (session) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/(auth)/phone-verification');
      }
    }
  }, [session, isLoading]);

  return null;
}
*/