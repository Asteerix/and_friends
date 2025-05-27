import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { format, formatDistanceToNow } from 'date-fns';
import { useStories } from "@/hooks/useStories";
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');
const STORY_DURATION = 5000; // 5 seconds per story

interface Story {
  id: string;
  image_url: string;
  text?: string;
  created_at: string;
  user: {
    id: string;
    display_name: string;
    avatar_url: string;
  };
}

export default function StoryViewerScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userId, storyIndex = 0 } = route.params as any;
  const { getStoriesByUser } = useStories();
  
  const [stories, setStories] = useState<Story[]>([]);
  const [currentIndex, setCurrentIndex] = useState(storyIndex);
  const [isPaused, setIsPaused] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadStories();
  }, [userId]);

  useEffect(() => {
    if (stories.length > 0 && !isPaused) {
      startProgress();
    }
  }, [currentIndex, stories, isPaused]);

  const loadStories = async () => {
    const userStories = await getStoriesByUser(userId);
    setStories(userStories);
  };

  const startProgress = () => {
    progressAnim.setValue(0);
    
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !isPaused) {
        handleNext();
      }
    });
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex(currentIndex + 1);
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    } else {
      handleClose();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex(currentIndex - 1);
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  const handlePressIn = () => {
    setIsPaused(true);
    progressAnim.stopAnimation();
  };

  const handlePressOut = () => {
    setIsPaused(false);
    progressAnim.setValue(progressAnim._value);
    
    const remainingDuration = STORY_DURATION * (1 - progressAnim._value);
    
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: remainingDuration,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !isPaused) {
        handleNext();
      }
    });
  };

  if (stories.length === 0) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={30} color="white" />
        </TouchableOpacity>
      </View>
    );
  }

  const currentStory = stories[currentIndex];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <Animated.View style={[styles.storyContainer, { opacity }]}>
        <Image 
          source={{ uri: currentStory.image_url }} 
          style={styles.storyImage}
          resizeMode="cover"
        />
        
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'transparent', 'rgba(0,0,0,0.3)']}
          style={styles.gradient}
        />

        {/* Progress Bars */}
        <View style={styles.progressContainer}>
          {stories.map((_, index) => (
            <View key={index} style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground} />
              {index < currentIndex && (
                <View style={[styles.progressBarFill, { width: '100%' }]} />
              )}
              {index === currentIndex && (
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        {/* Header */}
        <SafeAreaView style={styles.header}>
          <View style={styles.userInfo}>
            <Image 
              source={{ uri: currentStory.user.avatar_url }} 
              style={styles.avatar}
            />
            <View style={styles.userText}>
              <Text style={styles.username}>{currentStory.user.display_name}</Text>
              <Text style={styles.timestamp}>
                {formatDistanceToNow(new Date(currentStory.created_at), { addSuffix: true })}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Story Text */}
        {currentStory.text && (
          <View style={styles.textContainer}>
            <BlurView intensity={80} tint="dark" style={styles.textBlur}>
              <Text style={styles.storyText}>{currentStory.text}</Text>
            </BlurView>
          </View>
        )}

        {/* Touch Areas */}
        <View style={styles.touchAreas}>
          <TouchableOpacity 
            style={styles.touchArea} 
            onPress={handlePrevious}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
          />
          <TouchableOpacity 
            style={styles.touchArea} 
            onPress={handleNext}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
          />
        </View>

        {/* Action Bar */}
        <SafeAreaView style={styles.actionBar}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="paper-plane-outline" size={24} color="white" />
            <Text style={styles.actionText}>Reply</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="heart-outline" size={24} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="share-outline" size={24} color="white" />
          </TouchableOpacity>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  storyContainer: {
    flex: 1,
  },
  storyImage: {
    width: width,
    height: height,
    position: 'absolute',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  progressContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 60,
    gap: 4,
  },
  progressBarContainer: {
    flex: 1,
    height: 3,
    position: 'relative',
  },
  progressBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1.5,
  },
  progressBarFill: {
    height: 3,
    backgroundColor: 'white',
    borderRadius: 1.5,
  },
  header: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
  },
  userText: {
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  timestamp: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  textContainer: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
  },
  textBlur: {
    padding: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  storyText: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    fontWeight: '500',
  },
  touchAreas: {
    position: 'absolute',
    top: 100,
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
  },
  touchArea: {
    flex: 1,
  },
  actionBar: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 30,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
  },
});