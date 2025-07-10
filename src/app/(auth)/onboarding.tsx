import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
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
  FadeInDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const ampersandScale = useSharedValue(0);
  const ampersandOpacity = useSharedValue(0);

  useEffect(() => {
    // Animate the ampersand
    ampersandScale.value = withSequence(
      withTiming(1.2, { duration: 600, easing: Easing.out(Easing.back(1.5)) }),
      withTiming(1, { duration: 300, easing: Easing.ease })
    );
    ampersandOpacity.value = withTiming(1, { duration: 400 });
  }, []);

  const ampersandAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ampersandScale.value }],
    opacity: ampersandOpacity.value,
  }));

  const handleContinue = () => {
    router.push('/(auth)/phone-verification');
  };

  return (
    <ImageBackground
      source={require('@/assets/images/splash_background.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
        <View style={styles.topSection}>
          {/* &Friends title */}
          <Animated.Text
            entering={FadeInDown.delay(800).duration(600)}
            style={styles.title}
          >
            &Friends
          </Animated.Text>

          {/* Tagline */}
          <Animated.Text
            entering={FadeInDown.delay(1200).duration(600)}
            style={styles.tagline}
          >
            No more guessing.{'\n'}Real plans, real people, real good times.
          </Animated.Text>
        </View>

        {/* Animated & in the center */}
        <View style={styles.ampersandContainer}>
          <Animated.Text style={[styles.ampersand, ampersandAnimatedStyle]}>
            &
          </Animated.Text>
        </View>

        {/* Continue button */}
        <Animated.View
          entering={FadeIn.delay(1600).duration(600)}
          style={[styles.buttonContainer, { paddingBottom: insets.bottom + 40 }]}
        >
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleContinue}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>
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
  topSection: {
    alignItems: 'center',
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
  tagline: {
    fontSize: 24,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 32,
    paddingHorizontal: 40,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 40,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});