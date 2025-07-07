import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import CustomText from '@/shared/ui/CustomText';

interface UploadProgressProps {
  isVisible: boolean;
  progress?: number;
  message?: string;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  isVisible,
  progress = 0,
  message = 'Publication en cours...',
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  if (!isVisible) return null;

  return (
    <Modal transparent animationType="fade" visible={isVisible}>
      <BlurView intensity={30} style={styles.container}>
        <Animated.View 
          style={[
            styles.content,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.progressCircle}>
            <Animated.View 
              style={[
                styles.progressFill,
                {
                  height: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]} 
            />
            <CustomText size="xl" weight="bold" color="#FFF">
              {Math.round(progress)}%
            </CustomText>
          </View>
          
          <CustomText size="md" color="#FFF" style={styles.message}>
            {message}
          </CustomText>
        </Animated.View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  content: {
    alignItems: 'center',
    padding: 30,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  progressCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 64, 129, 0.3)',
  },
  message: {
    textAlign: 'center',
  },
});