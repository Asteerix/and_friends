import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Dimensions,
  ImageBackground,
  Text,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '@/shared/providers/SessionContext';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase/client';
import { startupLogger } from '@/shared/utils/startupLogger';
import { errorLogger } from '@/shared/utils/errorLogger';

const { width, height } = Dimensions.get('window');

// Map registration steps to routes
const STEP_TO_ROUTE: Record<string, string> = {
  phone_verification: '/(auth)/phone-verification',
  code_verification: '/(auth)/code-verification',
  name_input: '/(auth)/name-input',
  avatar_pick: '/(auth)/avatar-pick',
  contacts_permission: '/(auth)/contacts-permission',
  location_permission: '/(auth)/location-permission',
  age_input: '/(auth)/age-input',
  path_input: '/(auth)/path-input',
  jam_picker: '/(auth)/jam-picker',
  restaurant_picker: '/(auth)/restaurant-picker',
  hobby_picker: '/(auth)/hobby-picker',
  completed: '/(tabs)/home',
};

export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, loading } = useSession();
  const [hasError, setHasError] = useState(false);
  const [splashImage, setSplashImage] = useState<any>(null);
  const ampersandScale = useSharedValue(0);
  const ampersandOpacity = useSharedValue(0);
  
  // Load splash image with error handling
  useEffect(() => {
    try {
      setSplashImage(require('@/assets/images/splash_background.png'));
    } catch (error) {
      startupLogger.log('Failed to load splash background', 'warning', error);
      // Continue without background image
    }
  }, []);

  useEffect(() => {
    startupLogger.log('Splash screen mounted');
    
    // Animate the ampersand
    try {
      ampersandScale.value = withSequence(
        withTiming(1.2, { duration: 600, easing: Easing.out(Easing.back(1.8)) }),
        withTiming(1, { duration: 300, easing: Easing.inOut(Easing.ease) })
      );
      ampersandOpacity.value = withTiming(1, { duration: 400 });
    } catch (error) {
      startupLogger.log('Animation error', 'warning', error);
    }

    // Navigate after animation and session check
    const timer = setTimeout(async () => {
      try {
        if (!loading) {
          startupLogger.log('Session check complete', 'info', { hasSession: !!session });
          
          if (!isSupabaseConfigured) {
            startupLogger.log('Supabase not configured, going to onboarding', 'warning');
            router.replace('/(auth)/onboarding');
            return;
          }
          
          if (session) {
            // Check registration progress with error handling
            try {
              const { data: profile, error } = await supabase
                .from('profiles')
                .select('current_registration_step')
                .eq('id', session.user.id)
                .single();
              
              if (error) {
                startupLogger.log('Profile fetch error', 'error', error);
                // If profile doesn't exist, start registration
                router.replace('/(auth)/onboarding');
                return;
              }
              
              const step = profile?.current_registration_step;
              startupLogger.log('User registration step', 'info', { step });
              
              if (!step) {
                // No step, user needs to start registration
                router.replace('/(auth)/onboarding');
              } else if (step === 'completed') {
                // Registration completed, go to home
                router.replace('/(tabs)/home');
              } else if (step === 'code_verification') {
                // If we're at code_verification, go back to phone_verification
                startupLogger.log('Redirecting from code_verification to phone_verification');
                router.replace('/(auth)/phone-verification');
              } else {
                // Resume registration at the appropriate step
                const route = STEP_TO_ROUTE[step];
                if (route) {
                  router.replace(route);
                } else {
                  router.replace('/(auth)/onboarding');
                }
              }
            } catch (profileError) {
              errorLogger.log(profileError as Error, { context: 'profile check' });
              router.replace('/(auth)/onboarding');
            }
          } else {
            router.replace('/(auth)/onboarding');
          }
        }
      } catch (error) {
        const err = error as Error;
        errorLogger.log(err, { context: 'splash navigation' });
        setHasError(true);
        // Fallback navigation
        setTimeout(() => {
          router.replace('/(auth)/onboarding');
        }, 1000);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [loading, session, router]);

  const ampersandAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ampersandScale.value }],
    opacity: ampersandOpacity.value,
  }));

  // Error state
  if (hasError) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorText}>Loading...</Text>
        <ActivityIndicator size="large" color="#FF6B6B" style={{ marginTop: 20 }} />
      </View>
    );
  }
  
  // Render with or without background image
  const content = (
    <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
      {/* &Friends title */}
      <Animated.Text
        entering={FadeIn.delay(200).duration(600)}
        style={styles.title}
      >
        &Friends
      </Animated.Text>

      {/* Animated & in the center */}
      <View style={styles.ampersandContainer}>
        <Animated.Text style={[styles.ampersand, ampersandAnimatedStyle]}>
          &
        </Animated.Text>
      </View>
    </View>
  );
  
  if (splashImage) {
    return (
      <ImageBackground
        source={splashImage}
        style={styles.container}
        resizeMode="cover"
        onError={(error) => {
          startupLogger.log('Splash image load error', 'error', error);
          setSplashImage(null);
        }}
      >
        {content}
      </ImageBackground>
    );
  }
  
  // Fallback without background image
  return (
    <View style={[styles.container, { backgroundColor: '#FF6B6B' }]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width,
    height,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  ampersandContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ampersand: {
    fontSize: 120,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  errorContainer: {
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 10,
  },
});