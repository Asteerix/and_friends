
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Video, ResizeMode, Audio } from 'expo-av';
import { router } from 'expo-router';
import React from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Message } from '@/hooks/useMessages';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  onLongPress?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');
const MAX_BUBBLE_WIDTH = screenWidth * 0.75;

export default function MessageBubble({ message, isOwnMessage, onLongPress }: MessageBubbleProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [sound, setSound] = React.useState<Audio.Sound>();
  const videoRef = React.useRef<Video>(null);

  React.useEffect(() => {
    return sound
      ? () => {
        sound.unloadAsync();
      }
      : undefined;
  }, [sound]);

  const playAudio = async (url: string) => {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: url });
      setSound(sound);
      setIsPlaying(true);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const renderContent = () => {
    switch (message.message_type) {
    case 'text':
      return (
        <Text style={{
          color: isOwnMessage ? '#fff' : '#000',
          fontSize: 16,
          lineHeight: 20,
        }}>
          {message.content}
        </Text>
      );

    case 'image':
      return (
        <TouchableOpacity
          onPress={() => {
            // TODO: Open image viewer
          }}
        >
          <Image
            source={{ uri: message.metadata?.image_url }}
            style={{
              width: MAX_BUBBLE_WIDTH,
              height: 200,
              borderRadius: 12,
            }}
            resizeMode="cover"
          />
        </TouchableOpacity>
      );

    case 'video':
      return (
        <View style={{ width: MAX_BUBBLE_WIDTH }}>
          <Video
            ref={videoRef}
            source={{ uri: message.metadata?.video_url || '' }}
            style={{
              width: '100%',
              height: 200,
              borderRadius: 12,
            }}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            isLooping={false}
          />
        </View>
      );

    case 'voice':
    case 'audio':
      return (
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 8,
          }}
          onPress={() => {
            const url = message.metadata?.voice_url || message.metadata?.audio_url;
            if (url) playAudio(url);
          }}
        >
          <Ionicons
            name={isPlaying ? 'pause-circle' : 'play-circle'}
            size={32}
            color={isOwnMessage ? '#fff' : '#000'}
          />
          <View style={{
            flex: 1,
            height: 2,
            backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)',
            marginLeft: 8,
            borderRadius: 1,
          }} />
          {message.metadata?.duration && (
            <Text style={{
              color: isOwnMessage ? '#fff' : '#666',
              fontSize: 12,
              marginLeft: 8,
            }}>
              {Math.floor(message.metadata.duration / 60)}:{(message.metadata.duration % 60).toString().padStart(2, '0')}
            </Text>
          )}
        </TouchableOpacity>
      );

    case 'location':
      return (
        <TouchableOpacity
          onPress={() => {
            // TODO: Open map view
          }}
        >
          <View style={{
            width: MAX_BUBBLE_WIDTH,
            height: 150,
            backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            borderRadius: 12,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Ionicons name="location" size={32} color={isOwnMessage ? '#fff' : '#000'} />
            <Text style={{
              color: isOwnMessage ? '#fff' : '#000',
              marginTop: 8,
              fontSize: 14,
            }}>
              {message.metadata?.location?.address || 'Position partagée'}
            </Text>
          </View>
        </TouchableOpacity>
      );

    case 'event_share':
      return (
        <TouchableOpacity
          onPress={() => {
            if (message.metadata?.event_id) {
              void router.push(`/screens/event-details?id=${message.metadata.event_id}`);
            }
          }}
          style={{
            backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            padding: 12,
            borderRadius: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="calendar" size={24} color={isOwnMessage ? '#fff' : '#000'} />
            <Text style={{
              color: isOwnMessage ? '#fff' : '#000',
              fontSize: 14,
              marginLeft: 8,
              fontWeight: '600',
            }}>
                Événement partagé
            </Text>
          </View>
        </TouchableOpacity>
      );

    case 'story_reply':
      return (
        <View>
          <View style={{
            backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            padding: 8,
            borderRadius: 8,
            marginBottom: 8,
          }}>
            <Text style={{
              color: isOwnMessage ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)',
              fontSize: 12,
            }}>
                Réponse à une story
            </Text>
          </View>
          <Text style={{
            color: isOwnMessage ? '#fff' : '#000',
            fontSize: 16,
          }}>
            {message.content}
          </Text>
        </View>
      );

    default:
      return null;
    }
  };

  return (
    <Pressable
      onLongPress={onLongPress}
      style={{
        alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
        maxWidth: MAX_BUBBLE_WIDTH,
        marginVertical: 2,
        marginHorizontal: 16,
      }}
    >
      <View style={{
        backgroundColor: isOwnMessage ? '#007AFF' : '#E9E9EB',
        borderRadius: 16,
        padding: message.message_type === 'text' ? 12 : 4,
        minWidth: 60,
      }}>
        {renderContent()}
        
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 4,
          paddingHorizontal: message.message_type !== 'text' ? 8 : 0,
        }}>
          <Text style={{
            color: isOwnMessage ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)',
            fontSize: 11,
          }}>
            {formatDistanceToNow(new Date(message.created_at || Date.now()), { 
              addSuffix: true,
              locale: fr,
            })}
          </Text>
          {message.is_edited && (
            <Text style={{
              color: isOwnMessage ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)',
              fontSize: 11,
              marginLeft: 4,
            }}>
              (modifié)
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}