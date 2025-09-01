import { Ionicons } from '@expo/vector-icons';
import { useAudioRecorder, RecordingPresets, AudioModule } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import React, { useState, useRef, useEffect } from 'react';
import { Alert, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string, duration: number) => void;
  onCancel: () => void;
}
export default function VoiceRecorder({ onRecordingComplete, onCancel }: VoiceRecorderProps) {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [duration, setDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  // const [amplitude, setAmplitude] = useState(0);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const amplitudeAnim = useRef(new Animated.Value(0)).current;
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Request permissions
    (async () => {
      try {
        const { status } = await AudioModule.requestRecordingPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission required',
            'Please grant audio recording permission to use this feature.'
          );
        }
      } catch (error) {
        console.error('Failed to get audio permissions:', error);
      }
    })();

    return () => {
      // Cleanup on unmount
      if (audioRecorder.isRecording) {
        audioRecorder.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(0);
    }
  }, [isRecording]);

  const startRecording = async () => {
    try {
      // Haptic feedback
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Prepare and start recording
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      setIsRecording(true);
      setDuration(0);

      // Start duration counter
      durationInterval.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      // Animate button
      Animated.spring(scaleAnim, {
        toValue: 1.2,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!audioRecorder.isRecording) return;

    try {
      // Haptic feedback
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Stop duration counter
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }

      // Stop recording
      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (uri && duration >= 1) {
        // Minimum 1 second recording
        onRecordingComplete(uri, duration);
      } else {
        Alert.alert('Too short', 'Recording must be at least 1 second long');
        onCancel();
      }

      // Reset state
      setIsRecording(false);
      setDuration(0);

      // Animate button
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to save recording. Please try again.');
    }
  };

  const cancelRecording = async () => {
    if (!audioRecorder.isRecording) return;

    try {
      // Haptic feedback
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      // Stop duration counter
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }

      // Stop and discard recording
      await audioRecorder.stop();

      // Reset state
      setIsRecording(false);
      setDuration(0);

      // Animate button
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();

      onCancel();
    } catch (error) {
      console.error('Failed to cancel recording:', error);
    }
  };

  // Note: expo-audio doesn't provide real-time metering updates
  // The waveform animation will be simplified
  useEffect(() => {
    if (isRecording) {
      // Simulate waveform animation
      const waveInterval = setInterval(() => {
        const randomAmplitude = Math.random();
        Animated.timing(amplitudeAnim, {
          toValue: randomAmplitude,
          duration: 100,
          useNativeDriver: true,
        }).start();
      }, 100);

      return () => clearInterval(waveInterval);
    }
  }, [isRecording, amplitudeAnim]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Waveform visualization */}
      <View style={styles.waveformContainer}>
        {[...Array(20)].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.waveformBar,
              {
                transform: [
                  {
                    scaleY: amplitudeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.2, 1],
                    }),
                  },
                ],
                opacity: isRecording ? 1 : 0.3,
              },
            ]}
          />
        ))}
      </View>

      {/* Duration */}
      <Text style={styles.duration}>{formatDuration(duration)}</Text>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Cancel button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={cancelRecording}
          disabled={!isRecording}
        >
          <Ionicons name="close" size={24} color={isRecording ? '#FF3B30' : '#999'} />
        </TouchableOpacity>

        {/* Record/Stop button */}
        <TouchableOpacity
          onPress={isRecording ? stopRecording : startRecording}
          activeOpacity={0.8}
        >
          <Animated.View
            style={[
              styles.recordButton,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Pulse effect */}
            <Animated.View
              style={[
                styles.pulseCircle,
                {
                  opacity: pulseAnim,
                  transform: [
                    {
                      scale: pulseAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.5],
                      }),
                    },
                  ],
                },
              ]}
            />

            <Ionicons name={isRecording ? 'stop' : 'mic'} size={32} color="white" />
          </Animated.View>
        </TouchableOpacity>

        {/* Send button (placeholder for symmetry) */}
        <View style={styles.placeholderButton} />
      </View>

      {/* Instructions */}
      <Text style={styles.instructions}>
        {isRecording ? 'Tap to stop • Swipe to cancel' : 'Hold to record'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  waveformContainer: {
    flexDirection: 'row',
    height: 60,
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
  },
  waveformBar: {
    width: 3,
    height: 40,
    backgroundColor: '#007AFF',
    borderRadius: 1.5,
  },
  duration: {
    fontSize: 48,
    fontWeight: '200',
    marginBottom: 30,
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pulseCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF3B30',
  },
  cancelButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderButton: {
    width: 44,
    height: 44,
  },
  instructions: {
    marginTop: 20,
    fontSize: 14,
    color: '#666',
  },
});
