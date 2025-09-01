import { useRouter } from 'expo-router';
import { useCallback } from 'react';

// Define the auth flow order
const AUTH_FLOW = [
  'onboarding',
  'phone-verification',
  'code-verification',
  'name-input',
  'avatar-pick',
  'contacts-permission',
  'contacts-friends',
  'location-permission',
  'location-picker',
  'age-input',
  'path-input',
  'jam-picker',
  'restaurant-picker',
  'hobby-picker',
  'loading',
];

export const useAuthNavigation = (currentScreen: string) => {
  const router = useRouter();

  const navigateBack = useCallback(() => {
    // First try to go back normally
    if (router.canGoBack()) {
      router.back();
      return;
    }

    // If can't go back, find the previous screen in the auth flow
    const currentIndex = AUTH_FLOW.indexOf(currentScreen);
    if (currentIndex > 0) {
      const previousScreen = AUTH_FLOW[currentIndex - 1];
      router.replace(`/(auth)/${previousScreen}`);
    }
  }, [router, currentScreen]);

  const navigateNext = useCallback(
    (nextScreen: string, params?: Record<string, string>) => {
      const queryString = params
        ? '?' +
          Object.entries(params)
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&')
        : '';
      router.push(`/(auth)/${nextScreen}${queryString}`);
    },
    [router]
  );

  const getProgress = useCallback(() => {
    const currentIndex = AUTH_FLOW.indexOf(currentScreen);
    if (currentIndex === -1) return 0;
    return (currentIndex + 1) / AUTH_FLOW.length;
  }, [currentScreen]);

  return {
    navigateBack,
    navigateNext,
    getProgress,
  };
};
