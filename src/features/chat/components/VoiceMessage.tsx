import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

interface VoiceMessageProps {
  uri: string;
  duration: number;
  isOwn: boolean;
  transcription?: string;
  onTranscribe?: () => void;
}

export default function VoiceMessage({
  uri,
  duration,
  isOwn,
  transcription,
  onTranscribe,
}: VoiceMessageProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(duration * 1000);
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  const playbackSubscription = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const loadAudio = async () => {
    try {
      setIsLoading(true);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );
      setSound(newSound);
      setIsLoading(false);
      return newSound;
    } catch (error) {
      console.error('Failed to load audio:', error);
      setIsLoading(false);
      return null;
    }
  };

  const onPlaybackStatusUpdate = (status: Audio.PlaybackStatus) => {
    if (status.isLoaded) {
      setPlaybackPosition(status.positionMillis || 0);
      setPlaybackDuration(status.durationMillis || duration * 1000);
      
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPlaybackPosition(0);
        progressAnim.setValue(0);
      }
    }
  };

  const togglePlayback = async () => {
    try {
      let currentSound = sound;
      
      if (!currentSound) {
        currentSound = await loadAudio();
        if (!currentSound) return;
      }

      if (isPlaying) {
        await currentSound.pauseAsync();
        setIsPlaying(false);
      } else {
        // Reset if at the end
        if (playbackPosition >= playbackDuration - 100) {
          await currentSound.setPositionAsync(0);
        }
        await currentSound.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Playback error:', error);
    }
  };

  const handleSliderChange = async (value: number) => {
    if (sound) {
      const position = value * playbackDuration;
      await sound.setPositionAsync(position);
      setPlaybackPosition(position);
    }
  };

  const formatTime = (millis: number): string => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = playbackDuration > 0 ? playbackPosition / playbackDuration : 0;

  return (
    <View style={[styles.container, isOwn ? styles.ownMessage : styles.otherMessage]}>
      <View style={styles.audioContainer}>
        {/* Play/Pause Button */}
        <TouchableOpacity
          style={styles.playButton}
          onPress={togglePlayback}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={isOwn ? 'white' : '#007AFF'} />
          ) : (
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={20}
              color={isOwn ? 'white' : '#007AFF'}
            />
          )}
        </TouchableOpacity>

        {/* Waveform/Progress */}
        <View style={styles.waveformContainer}>
          <Slider
            style={styles.slider}
            value={progress}
            onSlidingComplete={handleSliderChange}
            minimumTrackTintColor={isOwn ? 'rgba(255,255,255,0.8)' : '#007AFF'}
            maximumTrackTintColor={isOwn ? 'rgba(255,255,255,0.3)' : '#E0E0E0'}
            thumbTintColor={isOwn ? 'white' : '#007AFF'}
          />
          
          {/* Waveform visualization (static) */}
          <View style={styles.waveform}>
            {[...Array(30)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.waveformBar,
                  {
                    height: Math.random() * 20 + 5,
                    backgroundColor: isOwn ? 'rgba(255,255,255,0.3)' : 'rgba(0,122,255,0.3)',
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Duration */}
        <Text style={[styles.duration, isOwn && styles.ownDuration]}>
          {formatTime(playbackPosition || 0)}
        </Text>
      </View>

      {/* Transcription */}
      {transcription ? (
        <Text style={[styles.transcription, isOwn && styles.ownTranscription]}>
          "{transcription}"
        </Text>
      ) : (
        <TouchableOpacity
          style={styles.transcribeButton}
          onPress={onTranscribe}
        >
          <Ionicons name="text" size={16} color={isOwn ? 'white' : '#007AFF'} />
          <Text style={[styles.transcribeText, isOwn && styles.ownTranscribeText]}>
            Transcribe
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '80%',
    marginVertical: 4,
    padding: 12,
    borderRadius: 16,
  },
  ownMessage: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    backgroundColor: '#F0F0F0',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveformContainer: {
    flex: 1,
    height: 36,
    position: 'relative',
  },
  slider: {
    position: 'absolute',
    left: -8,
    right: -8,
    top: 0,
    bottom: 0,
    zIndex: 2,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    gap: 2,
  },
  waveformBar: {
    width: 2,
    borderRadius: 1,
  },
  duration: {
    fontSize: 12,
    color: '#666',
    minWidth: 35,
    fontVariant: ['tabular-nums'],
  },
  ownDuration: {
    color: 'rgba(255,255,255,0.8)',
  },
  transcription: {
    marginTop: 8,
    fontSize: 14,
    fontStyle: 'italic',
    color: '#333',
  },
  ownTranscription: {
    color: 'rgba(255,255,255,0.9)',
  },
  transcribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  transcribeText: {
    fontSize: 12,
    color: '#007AFF',
  },
  ownTranscribeText: {
    color: 'rgba(255,255,255,0.8)',
  },
});