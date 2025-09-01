import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/shared/lib/supabase/client';
import { useRegistrationStep } from '@/shared/hooks/useRegistrationStep';

const COLORS = {
  blue: '#3B82F6',
  cream: '#FFF6DB',
  purple: '#E879F9',
  orange: '#FDBA74',
  white: '#FFFFFF',
  green: '#22C55E',
  black: '#000000',
};

const { width, height } = Dimensions.get('window');

const LoadingScreen: React.FC = () => {
  const router = useRouter();
  const [step, setStep] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const checkAnim = useRef(new Animated.Value(0)).current;

  // Save registration step - only save 'completed' after successful profile update
  useRegistrationStep(step === 'success' ? 'completed' : 'loading');

  useEffect(() => {
    const complete = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Session expirée.');
        const { error } = await supabase
          .from('profiles')
          .update({ is_profile_complete: true, current_registration_step: 'onboarding_complete' })
          .eq('id', user.id);
        if (error) throw new Error(error.message);
        setStep('success');
        Animated.timing(checkAnim, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }).start();
        setTimeout(() => {
          router.replace('/(tabs)/home');
        }, 1400);
      } catch (e) {
        setStep('error');
        setErrorMsg(e instanceof Error ? e.message : String(e));
      }
    };
    complete();
  }, [router, checkAnim]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ImageBackground
        source={require('@/assets/images/splash_background.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centered}>
            {step === 'loading' && (
              <>
                <ActivityIndicator size="large" color={COLORS.white} style={styles.spinner} />
                <View style={styles.textContainer}>
                  <Text style={styles.loadingText}>We're getting</Text>
                  <Text style={styles.loadingText}>everything ready</Text>
                  <Text style={styles.loadingText}>for you</Text>
                </View>
              </>
            )}
            {step === 'success' && (
              <>
                <Animated.View style={[styles.checkCircle, { backgroundColor: COLORS.green }]}>
                  <Animated.View
                    style={{
                      position: 'absolute',
                      left: 18,
                      top: 28,
                      width: 24,
                      height: 12,
                      borderLeftWidth: 4,
                      borderBottomWidth: 4,
                      borderColor: COLORS.white,
                      borderRadius: 4,
                      transform: [
                        {
                          scaleX: checkAnim.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0, 1, 1],
                          }),
                        },
                        {
                          scaleY: checkAnim.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0, 1, 1],
                          }),
                        },
                        {
                          rotate: checkAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['-45deg', '-45deg'],
                          }),
                        },
                      ],
                    }}
                  />
                </Animated.View>
                <View style={styles.textContainer}>
                  <Text style={styles.successText}>All set!</Text>
                  <Text style={styles.successSubtext}>Welcome to the adventure 🎉</Text>
                </View>
              </>
            )}
            {step === 'error' && (
              <>
                <View style={styles.textContainer}>
                  <Text style={[styles.errorText]}>Oops...</Text>
                  <Text style={styles.errorSubtext}>{errorMsg || 'Something went wrong.'}</Text>
                </View>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => {
                    setStep('loading');
                    setErrorMsg(null);
                    setTimeout(() => {
                      router.replace('/(tabs)/home');
                    }, 500);
                  }}
                >
                  <Text style={styles.retryText}>Access the app</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.blue,
  },
  backgroundImage: {
    flex: 1,
    width: width,
    height: height,
  },
  safeArea: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  spinner: {
    marginBottom: 40,
    transform: [{ scale: 1.2 }],
  },
  textContainer: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 28,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    color: COLORS.white,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  successText: {
    fontSize: 32,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    color: COLORS.white,
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 20,
    color: COLORS.white,
    textAlign: 'center',
    fontWeight: '500',
    opacity: 0.9,
  },
  errorText: {
    fontSize: 32,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    color: COLORS.white,
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 18,
    color: COLORS.white,
    textAlign: 'center',
    fontWeight: '400',
    opacity: 0.9,
    paddingHorizontal: 40,
  },
  checkCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  retryBtn: {
    marginTop: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  retryText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '600',
  },
});

export default LoadingScreen;
