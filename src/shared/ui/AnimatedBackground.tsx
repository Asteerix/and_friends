import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View, ColorValue } from 'react-native';

const { width, height } = Dimensions.get('window');

interface AnimatedBackgroundProps {
  colors?: string[];
  children: React.ReactNode;
}
export default function AnimatedBackground({
  colors = ['#1a1a1a', '#2d1b69', '#0e0e0e'] as [string, string, ...string[]],
  children,
}: AnimatedBackgroundProps) {
  const animatedValue1 = useRef(new Animated.Value(0)).current;
  const animatedValue2 = useRef(new Animated.Value(0)).current;
  const animatedValue3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = (animatedValue: Animated.Value, duration: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration,
            useNativeDriver: true,
          }),
        ])
      );
    };

    Animated.parallel([
      createAnimation(animatedValue1, 8000),
      createAnimation(animatedValue2, 10000),
      createAnimation(animatedValue3, 12000),
    ]).start();
  }, []);

  const translateX1 = animatedValue1.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  const translateY1 = animatedValue1.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -height / 4, 0],
  });

  const translateX2 = animatedValue2.interpolate({
    inputRange: [0, 1],
    outputRange: [width, -width],
  });

  const translateY2 = animatedValue2.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [height / 3, 0, height / 3],
  });

  const scale3 = animatedValue3.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.8, 1.2, 0.8],
  });

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <LinearGradient
        colors={colors as [ColorValue, ColorValue, ...ColorValue[]]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Floating orbs */}
      <Animated.View
        style={[
          styles.orb,
          {
            backgroundColor: 'rgba(147, 51, 234, 0.3)',
            width: width * 0.6,
            height: width * 0.6,
            transform: [{ translateX: translateX1 }, { translateY: translateY1 }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.orb,
          {
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            width: width * 0.8,
            height: width * 0.8,
            transform: [{ translateX: translateX2 }, { translateY: translateY2 }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.orb,
          {
            backgroundColor: 'rgba(236, 72, 153, 0.25)',
            width: width * 0.5,
            height: width * 0.5,
            bottom: -width * 0.25,
            left: width * 0.25,
            transform: [{ scale: scale3 }],
          },
        ]}
      />

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    borderRadius: 999,
    // Apply blur effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 50,
  },
});
