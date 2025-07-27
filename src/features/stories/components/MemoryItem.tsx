import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useEffect } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Text, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useSession } from '@/shared/providers/SessionContext';

type Props = {
  imageUri?: string;
  avatarUri?: string;
  type?: 'add' | 'story';
  username?: string | null;
  userId?: string;
  isOwn?: boolean;
  hasActiveStory?: boolean;
  isViewed?: boolean;
};

export default function MemoryItem({ imageUri, avatarUri, type, username, userId, isOwn, hasActiveStory = true, isViewed = false }: Props) {
  const router = useRouter();
  const { session } = useSession();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (hasActiveStory && !isViewed) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(borderAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(borderAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [hasActiveStory, isViewed]);

  // console.log('[MemoryItem] Rendering:', {
  //   type,
  //   username,
  //   hasActiveStory,
  //   isViewed,
  //   avatarUri: avatarUri?.substring(0, 50) + '...',
  // });

  const handleAddStory = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void router.push('/screens/create-story');
  };

  const handleViewStory = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (userId) {
      void router.push(`/screens/story-viewer?userId=${userId}`);
    } else if (isOwn && session?.user?.id) {
      void router.push(`/screens/story-viewer?userId=${session.user.id}`);
    }
  };
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  if (type === 'add') {
    return (
      <TouchableOpacity 
        onPress={handleAddStory} 
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9} 
        style={styles.container}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <View 
          style={[
            styles.storyImageContainer,
            hasActiveStory && styles.hasStoryContainer
          ]}
        >
          {hasActiveStory && !isViewed && (
            <View style={styles.activeStoryBorder} />
          )}
          <Image source={{ uri: imageUri }} style={styles.storyImage} />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.gradient}
          />
          <View style={styles.addTextContainer}>
            <Text style={styles.addMemoryText}>Add Memory</Text>
          </View>
          <View style={styles.addButtonContainer}>
            <View style={styles.addCircle}>
              <Text style={styles.plusSign}>+</Text>
            </View>
          </View>
        </View>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={handleViewStory} 
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <View 
        style={[
          styles.storyImageContainer,
          !hasActiveStory && styles.noActiveStory,
          isViewed && styles.viewedStory
        ]}
      >
        {hasActiveStory && !isViewed && (
          <Animated.View 
            style={[
              styles.activeStoryBorder,
              {
                opacity: borderAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.7, 1],
                }),
              },
            ]} 
          />
        )}
        <Image 
          source={{ uri: imageUri || avatarUri }} 
          style={[
            styles.storyImage,
            (!hasActiveStory || isViewed) && styles.fadedImage
          ]} 
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.gradient}
        />
        <View style={styles.usernameContainer}>
          <Text style={styles.storyUsername} numberOfLines={1}>{username || '@user'}</Text>
        </View>
        {!hasActiveStory && (
          <View style={styles.noStoryOverlay}>
            <Text style={styles.noStoryText}>No active story</Text>
          </View>
        )}
      </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 110,
  },
  storyImageContainer: {
    width: 100,
    height: 130,
    borderRadius: 20,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  storyImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  plusSign: {
    fontSize: 20,
    color: '#000000',
    fontWeight: '600',
  },
  addTextContainer: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  addMemoryText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  addButtonContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  addCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  usernameContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
  },
  storyUsername: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  activeStoryBorder: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#FF4081',
    backgroundColor: 'transparent',
    zIndex: -1,
  },
  noActiveStory: {
    opacity: 0.7,
  },
  viewedStory: {
    opacity: 0.7,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  fadedImage: {
    opacity: 0.7,
  },
  noStoryOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noStoryText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.8,
  },
  hasStoryContainer: {
    // Position relative for the border to work properly
    position: 'relative',
  },
});
