
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider } from '@/shared/providers/SessionContext';
import { NavigationErrorBoundary } from '@/shared/ui/NavigationErrorBoundary';
import { GlobalErrorBoundary } from '@/shared/ui/GlobalErrorBoundary';
import { NetworkErrorProvider } from '@/shared/providers/NetworkErrorProvider';
import { NetworkProvider } from '@/shared/providers/NetworkProvider';
import { StoriesProvider } from '@/shared/providers/StoriesContext';
import { UploadProvider } from '@/shared/providers/UploadProvider';
import { ProfileProvider } from '@/shared/providers/ProfileProvider';
import { NotificationProvider } from '@/shared/providers/NotificationProvider';
import { MemoriesProvider } from '@/shared/providers/MemoriesProvider';
import { UploadProgressBar } from '@/shared/ui/UploadProgressBar';
import { NetworkErrorModal } from '@/shared/ui/NetworkErrorModal';
import { NetworkBanner } from '@/shared/components/NetworkBanner';
import { EventCoverProvider } from '@/features/events/context/EventCoverContext';
import { EventProvider } from '@/features/events/context/EventProvider';
import { CacheProvider } from '@/shared/providers/CacheProvider';
import { initializeNetworkMonitoring } from '@/shared/stores/networkStore';
import { setupGlobalErrorHandler, errorLogger } from '@/shared/utils/errorLogger';
import { startupLogger } from '@/shared/utils/startupLogger';
import '@/i18n/i18n';

// Initialize error handling and logging
setupGlobalErrorHandler();

// Initialize startup logger
startupLogger.init().catch(error => {
  errorLogger.log(error, { context: 'startup logger init' });
});

// Prevent auto-hiding splash screen
SplashScreen.preventAutoHideAsync().catch((error) => {
  errorLogger.log(error, { context: 'splash screen prevent auto hide' });
  console.warn('SplashScreen.preventAutoHideAsync error:', error);
});

export default function RootLayout() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);
  
  // Load fonts with proper error handling
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../../assets/fonts/SpaceMono-Regular.ttf'),
    Offbeat: require('../../assets/fonts/Offbeat.ttf'),
  });

  // Initialize app with comprehensive error handling
  useEffect(() => {
    const initializeApp = async () => {
      try {
        startupLogger.log('Starting app initialization');
        
        // Check font loading
        if (fontError) {
          startupLogger.log('Font loading error', 'error', fontError);
          errorLogger.log(fontError, { context: 'font loading' });
        }
        
        // Initialize critical services
        startupLogger.log('Initializing network monitoring');
        await initializeNetworkMonitoring();
        
        startupLogger.log('App initialization complete', 'info', {
          startupTime: startupLogger.getStartupTime()
        });
        
        setIsInitialized(true);
      } catch (error) {
        const err = error as Error;
        startupLogger.log('App initialization failed', 'error', err);
        errorLogger.log(err, { context: 'app initialization' });
        setInitError(err);
        setIsInitialized(true); // Still mark as initialized to show error UI
      }
    };
    
    initializeApp();
  }, [fontError]);

  // Handle splash screen with proper error recovery
  useEffect(() => {
    const hideSplash = async () => {
      try {
        // Wait for both initialization and fonts (or timeout)
        if (isInitialized && (fontsLoaded || fontError)) {
          startupLogger.log('Hiding splash screen');
          await SplashScreen.hideAsync();
          startupLogger.log('Splash screen hidden successfully');
        }
      } catch (error) {
        const err = error as Error;
        startupLogger.log('Failed to hide splash screen', 'error', err);
        errorLogger.log(err, { context: 'hide splash screen' });
        // Don't throw - app should continue
      }
    };
    
    hideSplash();
  }, [isInitialized, fontsLoaded, fontError]);

  // Show loading screen while initializing
  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Loading & friends...</Text>
      </View>
    );
  }
  
  // Show error screen if critical initialization failed
  if (initError) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Failed to Start</Text>
        <Text style={styles.errorMessage}>{initError.message}</Text>
        <Text style={styles.errorHint}>Please restart the app</Text>
      </SafeAreaView>
    );
  }

  return (
    <GlobalErrorBoundary>
      <NavigationErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <NetworkProvider>
              <NetworkErrorProvider>
                <SessionProvider>
                  <CacheProvider>
                    <UploadProvider>
                      <NotificationProvider>
                        <ProfileProvider>
                          <StoriesProvider>
                            <MemoriesProvider>
                              <EventCoverProvider>
                                <EventProvider>
                                  <StatusBar style="dark" />
                                  <NetworkBanner />
                                  <UploadProgressBar />
                                  <NetworkErrorModal />
                            <Stack
                      screenOptions={{
                        headerShown: false,
                        animation: 'slide_from_right',
                      }}
                    >
            <Stack.Screen name="index" />
            <Stack.Screen name="splash" options={{ animation: 'fade' }} />
            <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen name="screens/chat" />
            <Stack.Screen name="screens/conversation" />
            <Stack.Screen name="screens/create-story" />
            <Stack.Screen name="screens/event-details" />
            <Stack.Screen name="screens/map" />
            <Stack.Screen name="screens/notifications" />
            <Stack.Screen name="screens/person-card" />
            <Stack.Screen name="screens/friends" />
            <Stack.Screen name="screens/search-users" />
            <Stack.Screen name="screens/profile/edit" />
            <Stack.Screen name="screens/settings/index" />
            <Stack.Screen name="screens/settings/preferences" />
            <Stack.Screen name="screens/calendar-month" />
            <Stack.Screen name="screens/stories" />
            <Stack.Screen name="screens/create-event" />
            <Stack.Screen name="screens/create-event-advanced" />
            <Stack.Screen name="screens/edit-cover" />
            <Stack.Screen name="screens/invite-friends" />
            <Stack.Screen name="screens/rsvp-confirmation" />
            <Stack.Screen name="screens/rsvp-management" />
            <Stack.Screen name="screens/poll" />
            <Stack.Screen name="screens/conversations-list" />
            <Stack.Screen name="screens/map-ar" />
            <Stack.Screen name="screens/notifications-full" />
            <Stack.Screen name="screens/story-viewer" />
          </Stack>
                                </EventProvider>
                              </EventCoverProvider>
                            </MemoriesProvider>
                          </StoriesProvider>
                        </ProfileProvider>
                      </NotificationProvider>
                    </UploadProvider>
                  </CacheProvider>
                </SessionProvider>
              </NetworkErrorProvider>
            </NetworkProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </NavigationErrorBoundary>
    </GlobalErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff'
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 10
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20
  },
  errorHint: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic'
  }
});