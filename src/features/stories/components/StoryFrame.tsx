import React from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import CustomText from '@/shared/ui/CustomText';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface StoryFrameProps {
  uri: string;
  caption?: string | null;
  type?: 'image' | 'video';
  aspectRatio?: { width: number; height: number };
  captionPosition?: number;
}

export const StoryFrame: React.FC<StoryFrameProps> = ({ 
  uri, 
  caption, 
  aspectRatio,
  captionPosition = screenHeight * 0.5
}) => {
  // Calculate if we need blur background
  const imageAspectRatio = aspectRatio ? aspectRatio.width / aspectRatio.height : 1;
  const targetAspectRatio = 9 / 16; // Stories are 16:9
  const needsBlur = Math.abs(imageAspectRatio - targetAspectRatio) > 0.01;

  return (
    <View style={styles.container}>
      {/* Blurred Background - only if aspect ratio doesn't match */}
      {needsBlur && (
        <Image 
          source={{ uri }} 
          style={styles.blurredBackground} 
          blurRadius={Platform.OS === 'ios' ? 50 : 25}
        />
      )}
      
      {/* Main Image */}
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri }} 
          style={styles.image}
          resizeMode="contain"
        />
      </View>

      {/* Top Gradient */}
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'transparent']}
        style={styles.topGradient}
        pointerEvents="none"
      />

      {/* Bottom Gradient */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.6)']}
        style={styles.bottomGradient}
        pointerEvents="none"
      />
      
      {/* Caption */}
      {caption && caption.trim().length > 0 && (
        <View style={[styles.captionContainer, { top: captionPosition }]}>
          <View style={styles.captionBackground}>
            <CustomText 
              size="lg" 
              color="#FFF" 
              style={styles.captionText}
              numberOfLines={3}
            >
              {caption}
            </CustomText>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  blurredBackground: {
    ...StyleSheet.absoluteFillObject,
    width: screenWidth,
    height: screenHeight,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  captionContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  captionBackground: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    maxWidth: '100%',
  },
  captionText: {
    textAlign: 'center',
    lineHeight: 24,
  },
});