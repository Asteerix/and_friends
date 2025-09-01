import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';

interface GradientBackgroundProps {
  colors: [string, string];
  style?: ViewStyle;
  animated?: boolean;
  duration?: number;
  children?: React.ReactNode;
}
export const gradientPresets = {
  splash: ['#FF6B6B', '#FF8787'] as [string, string],
  onboarding1: ['#FF6B6B', '#FF8787'] as [string, string],
  onboarding2: ['#4ECDC4', '#44A3AA'] as [string, string],
  onboarding3: ['#45B7D1', '#3498DB'] as [string, string],
  onboarding4: ['#96CEB4', '#88C999'] as [string, string],
  calendar1: ['#FFB6C1', '#FFE4E1'] as [string, string],
  calendar2: ['#87CEEB', '#E0F6FF'] as [string, string],
  calendar3: ['#DDA0DD', '#F8BBD0'] as [string, string],
  event1: ['#FFD93D', '#FFE873'] as [string, string],
  event2: ['#6BCF7F', '#92E3A9'] as [string, string],
  event3: ['#FF6B9D', '#FFC4D6'] as [string, string],
  default: ['#FFFFFF', '#F5F5F5'] as [string, string],
};

export default function GradientBackground({
  colors,
  style,
  animated = false,
  duration = 1000,
  children,
}: GradientBackgroundProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        useNativeDriver: false,
      }).start();
    } else {
      fadeAnim.setValue(1);
    }
  }, [animated, duration, fadeAnim]);

  return (
    <Animated.View style={[styles.container, style, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={colors}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
