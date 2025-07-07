import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // Always start with splash screen
    // The splash screen will handle session checking and navigation
    router.replace('/splash');
  }, [router]);

  return null;
}
