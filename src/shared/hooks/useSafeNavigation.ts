import { useRouter } from 'expo-router';
import { useCallback } from 'react';

export const useSafeNavigation = () => {
  const router = useRouter();

  const safeGoBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return true;
    }
    return false;
  }, [router]);

  const safeNavigate = useCallback((
    path: string,
    options?: { replace?: boolean }
  ) => {
    try {
      if (options?.replace) {
        router.replace(path);
      } else {
        router.push(path);
      }
      return true;
    } catch (error) {
      console.error('Navigation error:', error);
      return false;
    }
  }, [router]);

  return {
    safeGoBack,
    safeNavigate,
    router,
  };
};