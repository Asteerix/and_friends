import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/shared/lib/supabase/client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface VoiceRecorderModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (audioUrl: string, duration: number) => void;
  chatId: string;
  userId: string;
}

export default function VoiceRecorderModal({
  visible,
  onClose,
  onSend,
  chatId,
  userId,
}: VoiceRecorderModalProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [duration, setDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const animatedScale = useRef(new Animated.Value(1)).current;
  const animatedAmplitude = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [recording]);

  useEffect(() => {
    if (visible) {
      startRecording();
    } else {
      stopRecording(false);
    }
  }, [visible]);

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
      setDuration(0);

      // Start animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(animatedScale, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(animatedScale, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Update duration
      intervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      console.error('Failed to start recording', err);
      onClose();
    }
  };

  const stopRecording = async (shouldSend: boolean) => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      if (shouldSend && duration >= 1) {
        const uri = recording.getURI();
        if (uri) {
          await uploadAndSend(uri);
        }
      }

      setRecording(null);
      setDuration(0);
      animatedScale.stopAnimation();

      if (!shouldSend) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  const uploadAndSend = async (uri: string) => {
    try {
      // Read the file
      const response = await fetch(uri);
      const blob = await response.blob();

      // Upload to Supabase
      const fileName = `voice/${Date.now()}.m4a`;
      const { data, error } = await supabase.storage.from('chat-media').upload(fileName, blob, {
        contentType: 'audio/m4a',
        cacheControl: '3600',
      });

      if (error) throw error;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('chat-media').getPublicUrl(fileName);

      onSend(publicUrl, duration);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error uploading voice message:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCancel = () => {
    stopRecording(false);
    onClose();
  };

  const handleSend = () => {
    stopRecording(true);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
      <View style={styles.container}>
        <View style={styles.content}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          <View style={styles.recordingInfo}>
            <Animated.View
              style={[styles.recordingIndicator, { transform: [{ scale: animatedScale }] }]}
            >
              <View style={styles.recordingDot} />
            </Animated.View>

            <Text style={styles.duration}>{formatDuration(duration)}</Text>

            <Text style={styles.hint}>
              {isRecording ? 'Enregistrement...' : 'Appuyez pour enregistrer'}
            </Text>
          </View>

          <View style={styles.waveformContainer}>
            {/* Simple waveform visualization */}
            {[...Array(20)].map((_, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.waveformBar,
                  {
                    height: Math.random() * 40 + 10,
                    opacity: isRecording ? 1 : 0.3,
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.deleteButton, { opacity: duration > 0 ? 1 : 0.5 }]}
              onPress={handleCancel}
              disabled={duration === 0}
            >
              <Ionicons name="trash-outline" size={28} color="#FF3B30" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sendButton, { opacity: duration >= 1 ? 1 : 0.5 }]}
              onPress={handleSend}
              disabled={duration < 1}
            >
              <Ionicons name="send" size={28} color="#3797F0" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  cancelButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
  },
  recordingInfo: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  recordingIndicator: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  recordingDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  duration: {
    fontSize: 32,
    fontWeight: '300',
    color: '#fff',
    marginBottom: 8,
  },
  hint: {
    fontSize: 16,
    color: '#999',
  },
  waveformContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 60,
    paddingHorizontal: 40,
    marginBottom: 40,
    gap: 3,
  },
  waveformBar: {
    width: 3,
    backgroundColor: '#3797F0',
    borderRadius: 1.5,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 80,
  },
  deleteButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(55, 151, 240, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
