import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Auth & Onboarding Screens
import SplashScreen from "@/screens/splash/SplashScreen";
import OnboardingScreen from "@/screens/splash/OnboardingScreen";
import {
  PhoneVerificationScreen,
  CodeVerificationScreen,
  NameInputScreen,
  AvatarPickScreen,
  ContactsPermissionScreen,
  LocationPermissionScreen,
  AgeInputScreen,
  PathInputScreen,
  JamPickerScreen,
  RestaurantPickerScreen,
  HobbyPickerScreen,
  LoadingScreen,
} from "@/features/auth/screens";

// Main App
import RootTabNavigator from './RootTabNavigator';

// Home & Map Screens
import MapScreen from "@/screens/MapScreen";
import SearchScreen from "@/screens/home/SearchScreen";

// Event Screens
import EventDetailsScreen from "@/features/events/screens/EventDetailsScreen";
import CreateEventScreen from "@/features/events/screens/CreateEventScreen";
import EditCoverScreen from "@/features/events/screens/EditCoverScreen";
import RSVPConfirmationScreen from "@/features/events/screens/RSVPConfirmationScreen";
import InviteFriendsScreen from "@/features/events/screens/InviteFriendsScreen";

// Message Screens
import ConversationScreen from "@/features/chat/screens/ConversationScreen";
import PollScreen from "@/features/chat/screens/PollScreen";

// Calendar Screens
import CalendarScreen from "@/screens/CalendarScreen";
import CalendarMonthScreen from "@/screens/calendar/CalendarMonthScreen";

// Profile Screens
import ProfileScreen from "@/screens/ProfileScreen";
import EditProfileScreen from "@/screens/profile/EditProfileScreen";
import PersonCardScreen from "@/screens/profile/PersonCardScreen";

// Notification Screens
import NotificationsFullScreen from "@/screens/NotificationsFullScreen";

// Memory Screens
import MemoriesScreen from "@/screens/MemoriesScreen";
import CreateStoryScreen from "@/screens/memories/CreateStoryScreen";

// Settings Screens
import SettingsScreen from "@/screens/settings/SettingsScreen";
import PreferencesScreen from "@/screens/settings/PreferencesScreen";

// Contexts
import { SessionProvider } from "@/lib/SessionContext";
import { supabase } from "@/lib/supabase";

const Stack = createStackNavigator();

export default function RootNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check if this is the first launch
      const hasLaunched = await AsyncStorage.getItem('hasLaunched');
      if (hasLaunched) {
        setIsFirstLaunch(false);
      }

      // Check authentication status
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      
      // Hide splash after checking
      setTimeout(() => {
        setShowSplash(false);
        setIsLoading(false);
      }, 2000);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsLoading(false);
      setShowSplash(false);
    }
  };

  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem('hasLaunched', 'true');
    setIsFirstLaunch(false);
  };

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              gestureEnabled: true,
              cardStyleInterpolator: ({ current, layouts }) => {
                return {
                  cardStyle: {
                    transform: [
                      {
                        translateX: current.progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [layouts.screen.width, 0],
                        }),
                      },
                    ],
                  },
                };
              },
            }}
          >
            {!isAuthenticated ? (
              <>
                {isFirstLaunch && (
                  <Stack.Screen 
                    name="Onboarding" 
                    component={OnboardingScreen}
                    options={{ gestureEnabled: false }}
                  />
                )}
                <Stack.Screen name="PhoneVerification" component={PhoneVerificationScreen as any} />
                <Stack.Screen name="CodeVerification" component={CodeVerificationScreen} />
                <Stack.Screen name="NameInput" component={NameInputScreen} />
                <Stack.Screen name="AvatarPick" component={AvatarPickScreen} />
                <Stack.Screen name="ContactsPermission" component={ContactsPermissionScreen} />
                <Stack.Screen name="LocationPermission" component={LocationPermissionScreen} />
                <Stack.Screen name="AgeInput" component={AgeInputScreen} />
                <Stack.Screen name="PathInput" component={PathInputScreen} />
                <Stack.Screen name="JamPicker" component={JamPickerScreen} />
                <Stack.Screen name="RestaurantPicker" component={RestaurantPickerScreen} />
                <Stack.Screen name="HobbyPicker" component={HobbyPickerScreen} />
                <Stack.Screen name="Loading" component={LoadingScreen} />
              </>
            ) : (
              <>
                <Stack.Screen name="Main" component={RootTabNavigator} />
                
                {/* Home & Map */}
                <Stack.Screen name="MapScreen" component={MapScreen} />
                <Stack.Screen 
                  name="Search" 
                  component={SearchScreen}
                  options={{ presentation: 'modal' }}
                />
                
                {/* Events */}
                <Stack.Screen name="EventDetailsScreen" component={EventDetailsScreen} />
                <Stack.Screen 
                  name="CreateEventScreen" 
                  component={CreateEventScreen}
                  options={{ presentation: 'modal' }}
                />
                <Stack.Screen 
                  name="EditCoverScreen" 
                  component={EditCoverScreen}
                  options={{ presentation: 'modal' }}
                />
                <Stack.Screen 
                  name="RSVPConfirmation" 
                  component={RSVPConfirmationScreen}
                  options={{
                    presentation: 'modal',
                    cardStyleInterpolator: ({ current, layouts }) => {
                      return {
                        cardStyle: {
                          transform: [
                            {
                              translateY: current.progress.interpolate({
                                inputRange: [0, 1],
                                outputRange: [layouts.screen.height, 0],
                              }),
                            },
                          ],
                        },
                      };
                    },
                  }}
                />
                <Stack.Screen 
                  name="InviteFriends" 
                  component={InviteFriendsScreen}
                  options={{ presentation: 'modal' }}
                />
                
                {/* Messages */}
                <Stack.Screen name="ConversationScreen" component={ConversationScreen} />
                <Stack.Screen 
                  name="PollScreen" 
                  component={PollScreen}
                  options={{ presentation: 'modal' }}
                />
                
                {/* Calendar */}
                <Stack.Screen name="CalendarScreen" component={CalendarScreen} />
                <Stack.Screen name="CalendarMonthScreen" component={CalendarMonthScreen} />
                
                {/* Profile */}
                <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
                <Stack.Screen 
                  name="EditProfile" 
                  component={EditProfileScreen}
                  options={{ presentation: 'modal' }}
                />
                <Stack.Screen 
                  name="PersonCard" 
                  component={PersonCardScreen}
                  options={{
                    presentation: 'modal',
                    gestureEnabled: true,
                    cardStyleInterpolator: ({ current, layouts }) => {
                      return {
                        cardStyle: {
                          transform: [
                            {
                              translateY: current.progress.interpolate({
                                inputRange: [0, 1],
                                outputRange: [layouts.screen.height, 0],
                              }),
                            },
                          ],
                        },
                      };
                    },
                  }}
                />
                
                {/* Notifications */}
                <Stack.Screen name="NotificationsFullScreen" component={NotificationsFullScreen} />
                
                {/* Memories */}
                <Stack.Screen name="MemoriesScreen" component={MemoriesScreen} />
                <Stack.Screen 
                  name="CreateStory" 
                  component={CreateStoryScreen}
                  options={{
                    presentation: 'modal',
                    gestureEnabled: false,
                  }}
                />
                
                {/* Settings */}
                <Stack.Screen name="Settings" component={SettingsScreen} />
                <Stack.Screen name="Preferences" component={PreferencesScreen} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SessionProvider>
    </SafeAreaProvider>
  );
}