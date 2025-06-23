import { LinearGradient } from 'expo-linear-gradient';
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
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={[COLORS.purple, COLORS.blue, COLORS.orange]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.centered}>
          {step === 'loading' && (
            <>
              <ActivityIndicator size="large" color={COLORS.white} style={{ marginBottom: 32 }} />
              <Text style={styles.title}>Bienvenue !</Text>
              <Text style={styles.subtitle}>Nous préparons ton expérience...</Text>
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
              <Text style={styles.title}>C'est prêt !</Text>
              <Text style={styles.subtitle}>Bienvenue dans l'aventure 🎉</Text>
            </>
          )}
          {step === 'error' && (
            <>
              <Text style={[styles.title, { color: COLORS.orange }]}>Oups...</Text>
              <Text style={styles.subtitle}>{errorMsg || 'Une erreur est survenue.'}</Text>
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
                <Text style={styles.retryText}>Accéder à l'app</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.purple },
  gradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  title: {
    fontSize: Platform.OS === 'ios' ? 34 : 28,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: Platform.OS === 'ios' ? 'normal' : 'bold',
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.cream,
    textAlign: 'center',
    marginBottom: 24,
    marginTop: 4,
    fontWeight: '400',
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
    marginTop: 24,
    backgroundColor: COLORS.blue,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },
  retryText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '600',
  },
});

export default LoadingScreen;
