import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';

import { useStories } from '../hooks/useStories';
import { Story, StorySticker } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORY_DURATION = 5000; // 5 seconds per story

export default function StoriesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ initialUserId: string }>();
  const { initialUserId } = params;
  const { userStories, markAsViewed } = useStories();

  const [currentUserIndex, setCurrentUserIndex] = useState(
    userStories.findIndex((u: any) => u.userId === initialUserId) || 0
  );
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');

  const progressAnimation = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  const currentUser = userStories[currentUserIndex];
  const currentStory = currentUser?.stories[currentStoryIndex];

  useEffect(() => {
    if (!currentStory || isPaused) return;

    // Mark story as viewed
    markAsViewed(currentStory.id);

    // Start progress animation
    progressAnimation.setValue(0);
    const animation = Animated.timing(progressAnimation, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    });

    animation.start(({ finished }) => {
      if (finished) {
        goToNextStory();
      }
    });

    return () => animation.stop();
  }, [currentStory, isPaused]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (_evt: GestureResponderEvent) => {
        const touchX = _evt.nativeEvent.locationX;
        if (touchX < SCREEN_WIDTH / 2) {
          goToPreviousStory();
        } else {
          goToNextStory();
        }
      },
      onMoveShouldSetPanResponder: (_evt: any, _gestureState: PanResponderGestureState) => true,
      onPanResponderMove: (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        if (Math.abs(gestureState.dy) > Math.abs(gestureState.dx)) {
          translateX.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (
        _evt: GestureResponderEvent,
        gestureState: PanResponderGestureState
      ) => {
        if (gestureState.dy > 100) {
          // Swipe down to close
          void router.back();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const goToNextStory = () => {
    if (currentUser && currentStoryIndex < currentUser.stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
    } else if (currentUserIndex < userStories.length - 1) {
      setCurrentUserIndex(currentUserIndex + 1);
      setCurrentStoryIndex(0);
    } else {
      void router.back();
    }
  };

  const goToPreviousStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
    } else if (currentUserIndex > 0) {
      setCurrentUserIndex(currentUserIndex - 1);
      const prevUser = userStories[currentUserIndex - 1];
      setCurrentStoryIndex(prevUser ? prevUser.stories.length - 1 : 0);
    }
  };

  const handleSendReply = () => {
    if (replyText.trim()) {
      // Send reply logic here
      setReplyText('');
      setShowReplyInput(false);
    }
  };

  if (!currentStory) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Animated.View
        style={[styles.storyContainer, { transform: [{ translateY: translateX }] }]}
        {...panResponder.panHandlers}
      >
        {/* Story Content */}
        {currentStory.type === 'photo' ? (
          <Image source={{ uri: currentStory.mediaUrl }} style={styles.media} />
        ) : (
          <Video
            source={{ uri: currentStory.mediaUrl }}
            style={styles.media}
            resizeMode={ResizeMode.COVER}
            isLooping={false}
            shouldPlay={!isPaused}
          />
        )}

        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent', 'transparent', 'rgba(0,0,0,0.6)']}
          style={styles.gradient}
        />

        {/* Header */}
        <SafeAreaView style={styles.header}>
          {/* Progress Bars */}
          <View style={styles.progressContainer}>
            {currentUser.stories.map((_: Story, index: number) => (
              <View key={index} style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground} />
                <Animated.View
                  style={[
                    styles.progressBar,
                    {
                      width:
                        index === currentStoryIndex
                          ? progressAnimation.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0%', '100%'],
                            })
                          : index < currentStoryIndex
                            ? '100%'
                            : '0%',
                    },
                  ]}
                />
              </View>
            ))}
          </View>

          {/* User Info */}
          <View style={styles.userInfo}>
            <TouchableOpacity
              style={styles.userInfoLeft}
              onPress={() => router.push(`/profile?userId=${currentUser.userId}`)}
            >
              <Image source={{ uri: currentUser.avatar }} style={styles.avatar} />
              <View style={styles.userDetails}>
                <Text style={styles.username}>{currentUser.name}</Text>
                <Text style={styles.timestamp}>{getTimeAgo(currentStory.createdAt)}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Story Overlays */}
        {currentStory.caption && (
          <View style={styles.captionContainer}>
            <Text style={styles.caption}>{currentStory.caption}</Text>
          </View>
        )}

        {currentStory.musicData && (
          <View style={styles.musicContainer}>
            <Ionicons name="musical-notes" size={16} color="white" />
            <Text style={styles.musicText}>
              {currentStory.musicData.artist} • {currentStory.musicData.title}
            </Text>
          </View>
        )}

        {/* Stickers */}
        {currentStory.stickers?.map((sticker: StorySticker) => (
          <View
            key={sticker.id}
            style={[
              styles.sticker,
              {
                left: sticker.position.x,
                top: sticker.position.y,
                width: sticker.size.width,
                height: sticker.size.height,
                transform: [{ rotate: `${sticker.rotation || 0}deg` }],
              },
            ]}
          >
            {/* Render sticker based on type */}
          </View>
        ))}
      </Animated.View>

      {/* Reply Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.replyContainer}
      >
        <View style={styles.replyInputContainer}>
          <TextInput
            style={styles.replyInput}
            placeholder="Send a message..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={replyText}
            onChangeText={setReplyText}
            onFocus={() => {
              setIsPaused(true);
              setShowReplyInput(true);
            }}
            onBlur={() => {
              setIsPaused(false);
              if (!replyText) setShowReplyInput(false);
            }}
          />
          {replyText.length > 0 && (
            <TouchableOpacity onPress={handleSendReply}>
              <Ionicons name="send" size={24} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
  return `${Math.floor(diffInMinutes / 1440)}d`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  storyContainer: {
    flex: 1,
  },
  media: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  progressContainer: {
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
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
  },
  progressBar: {
    height: 2,
    backgroundColor: 'white',
    borderRadius: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'white',
  },
  userDetails: {
    justifyContent: 'center',
  },
  username: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  timestamp: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  captionContainer: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
  },
  caption: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  musicContainer: {
    position: 'absolute',
    bottom: 140,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  musicText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 6,
  },
  sticker: {
    position: 'absolute',
  },
  replyContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  replyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 34,
    paddingTop: 12,
  },
  replyInput: {
    flex: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    color: 'white',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
});
