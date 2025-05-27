import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string, duration: number) => void;
  onCancel: () => void;
}

export default function VoiceRecorder({ onRecordingComplete, onCancel }: VoiceRecorderProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [duration, setDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const amplitudeAnim = useRef(new Animated.Value(0)).current;
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Request permissions and setup audio
    (async () => {
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      } catch (error) {
        console.error('Failed to get audio permissions:', error);
      }
    })();

    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Configure recording options
      const recordingOptions: Audio.RecordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        web: {
          mimeType: 'audio/mp4',
        },
      };

      // Create and start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        recordingOptions,
        onRecordingStatusUpdate
      );

      setRecording(newRecording);
      setIsRecording(true);
      setDuration(0);

      // Start duration counter
      durationInterval.current = setInterval(() => {
        setDuration(prev => prev + 1);
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
    if (!recording) return;

    try {
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Stop duration counter
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }

      // Stop and unload recording
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (uri && duration >= 1) {
        // Minimum 1 second recording
        onRecordingComplete(uri, duration);
      } else {
        Alert.alert('Too short', 'Recording must be at least 1 second long');
        onCancel();
      }

      // Reset state
      setRecording(null);
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
    if (!recording) return;

    try {
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      // Stop duration counter
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }

      // Stop and discard recording
      await recording.stopAndUnloadAsync();

      // Reset state
      setRecording(null);
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

  const onRecordingStatusUpdate = (status: Audio.RecordingStatus) => {
    if (status.isRecording && status.metering !== undefined) {
      // Normalize amplitude (iOS: -160 to 0, Android: varies)
      const normalizedAmplitude = Platform.OS === 'ios'
        ? (status.metering + 160) / 160
        : Math.min(status.metering / 100, 1);
      
      setAmplitude(normalizedAmplitude);
      
      // Animate waveform
      Animated.timing(amplitudeAnim, {
        toValue: normalizedAmplitude,
        duration: 100,
        useNativeDriver: true,
      }).start();
    }
  };

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
          <Ionicons 
            name="close" 
            size={24} 
            color={isRecording ? '#FF3B30' : '#999'} 
          />
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
            
            <Ionicons
              name={isRecording ? 'stop' : 'mic'}
              size={32}
              color="white"
            />
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