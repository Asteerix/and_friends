import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface StoryProgressBarProps {
  stories: any[];
  currentIndex: number;
  duration: number;
  isPaused: boolean;
  onComplete: () => void;
}

export const StoryProgressBar: React.FC<StoryProgressBarProps> = ({
  stories,
  currentIndex,
  duration,
  isPaused,
  onComplete,
}) => {
  const progressAnims = useRef(stories.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Reset all animations
    progressAnims.forEach((anim, index) => {
      if (index < currentIndex) {
        anim.setValue(1);
      } else if (index > currentIndex) {
        anim.setValue(0);
      }
    });

    // Start current animation
    if (currentIndex < stories.length && currentIndex >= 0 && !isPaused) {
      const currentAnim = progressAnims[currentIndex];
      if (!currentAnim) return;

      currentAnim.setValue(0);

      const animation = Animated.timing(currentAnim, {
        toValue: 1,
        duration: duration,
        useNativeDriver: false,
      });

      animation.start(({ finished }) => {
        if (finished) {
          onComplete();
        }
      });

      return () => {
        animation.stop();
      };
    }

    // Return undefined for other cases
    return undefined;
  }, [currentIndex, isPaused, stories.length]);

  return (
    <View style={styles.container}>
      {stories.map((_, index) => (
        <View key={index} style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground} />
          <Animated.View
            style={[
              styles.progressBar,
              {
                width:
                  progressAnims[index]?.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }) || '0%',
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 8,
    gap: 4,
  },
  progressBarContainer: {
    flex: 1,
    height: 2,
    position: 'relative',
  },
  progressBarBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 2,
    backgroundColor: '#FFF',
    borderRadius: 1,
  },
});
