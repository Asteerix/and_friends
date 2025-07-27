import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { startupLogger } from '@/shared/utils/startupLogger';
import { errorLogger } from '@/shared/utils/errorLogger';

export default function Index() {
  const router = useRouter();
  
  useEffect(() => {
    startupLogger.log('App index loaded, redirecting to splash');
    
    // Add a small delay to ensure everything is loaded
    const timer = setTimeout(() => {
      try {
        router.replace('/splash');
      } catch (error) {
        errorLogger.log(error as Error, { context: 'index redirect' });
        // Fallback to Redirect component
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [router]);
  
  // Show loading state briefly
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FF6B6B" />
      <Text style={styles.text}>Starting & friends...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    color: '#666'
  }
});
