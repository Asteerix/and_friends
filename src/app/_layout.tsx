
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider } from '@/shared/providers/SessionContext';
import { NavigationErrorBoundary } from '@/shared/ui/NavigationErrorBoundary';
import { NetworkErrorProvider } from '@/shared/providers/NetworkErrorProvider';
import { StoriesProvider } from '@/shared/providers/StoriesContext';
import { UploadProvider } from '@/shared/providers/UploadProvider';
import { ProfileProvider } from '@/shared/providers/ProfileProvider';
import { NotificationProvider } from '@/shared/providers/NotificationProvider';
import { MemoriesProvider } from '@/shared/providers/MemoriesProvider';
import { UploadProgressBar } from '@/shared/ui/UploadProgressBar';
import { NetworkErrorModal } from '@/shared/ui/NetworkErrorModal';
import { EventCoverProvider } from '@/features/events/context/EventCoverContext';
import { EventProvider } from '@/features/events/context/EventProvider';

// import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
// Prevent auto-hiding splash screen
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore error if splash screen is already hidden
});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../../assets/fonts/SpaceMono-Regular.ttf'),
    // 'PlayfairDisplay-Bold': PlayfairDisplay_700Bold,
    Offbeat: require('../../assets/fonts/Offbeat.ttf'),
  });

  useEffect(() => {
    if (error) {
      console.error('Font loading error:', error);
      // Continue without throwing to prevent app crash
    }
  }, [error]);

  useEffect(() => {
    if (loaded || error) {
      // Hide splash screen even if fonts fail to load
      SplashScreen.hideAsync().catch(() => {
        // Ignore error if splash screen is already hidden
      });
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <NavigationErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <NetworkErrorProvider>
            <SessionProvider>
              <UploadProvider>
                <NotificationProvider>
                  <ProfileProvider>
                    <StoriesProvider>
                      <MemoriesProvider>
                        <EventCoverProvider>
                          <EventProvider>
                            <StatusBar style="dark" />
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
            </SessionProvider>
          </NetworkErrorProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </NavigationErrorBoundary>
  );
}