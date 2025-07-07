import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Dimensions,
  ImageBackground,
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
import { supabase } from '@/shared/lib/supabase/client';

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
  const ampersandScale = useSharedValue(0);
  const ampersandOpacity = useSharedValue(0);

  useEffect(() => {
    // Animate the ampersand
    ampersandScale.value = withSequence(
      withTiming(1.2, { duration: 600, easing: Easing.out(Easing.back(1.8)) }),
      withTiming(1, { duration: 300, easing: Easing.inOut(Easing.ease) })
    );
    ampersandOpacity.value = withTiming(1, { duration: 400 });

    // Navigate after animation and session check
    const timer = setTimeout(async () => {
      if (!loading) {
        if (session) {
          // Check registration progress
          const { data: profile } = await supabase
            .from('profiles')
            .select('current_registration_step')
            .eq('id', session.user.id)
            .single();
            
          const step = profile?.current_registration_step;
          console.log('🚀 [SplashScreen] User registration step:', step);
          
          if (!step) {
            // No step, user needs to start registration
            router.replace('/(auth)/onboarding');
          } else if (step === 'completed') {
            // Registration completed, go to home
            router.replace('/(tabs)/home');
          } else if (step === 'code_verification') {
            // If we're at code_verification, go back to phone_verification
            console.log('🔄 [SplashScreen] Redirecting from code_verification to phone_verification');
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
        } else {
          router.replace('/(auth)/onboarding');
        }
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [loading, session, router]);

  const ampersandAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ampersandScale.value }],
    opacity: ampersandOpacity.value,
  }));

  return (
    <ImageBackground
      source={require('@/assets/images/splash_background.png')}
      style={styles.container}
      resizeMode="cover"
    >
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
    </ImageBackground>
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
});