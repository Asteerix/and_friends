import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  Platform,
  Animated,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import CustomText from '@/shared/ui/CustomText';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface DraggableStoryFrameProps {
  uri: string;
  caption?: string | null;
  type?: 'image' | 'video';
  aspectRatio?: { width: number; height: number };
  captionPosition?: number;
  onCaptionPositionChange?: (position: number) => void;
  isDraggable?: boolean;
}

export const DraggableStoryFrame: React.FC<DraggableStoryFrameProps> = ({
  uri,
  caption,
  aspectRatio,
  captionPosition = screenHeight * 0.5,
  onCaptionPositionChange,
  isDraggable = false,
}) => {
  // Calculate if we need blur background
  const imageAspectRatio = aspectRatio ? aspectRatio.width / aspectRatio.height : 1;
  const targetAspectRatio = 9 / 16; // Stories are 16:9
  const needsBlur = Math.abs(imageAspectRatio - targetAspectRatio) > 0.01;

  const [currentPosition, setCurrentPosition] = useState(captionPosition);
  const pan = useRef(new Animated.Value(currentPosition)).current;
  const [isDragging, setIsDragging] = useState(false);
  const [captionHeight, setCaptionHeight] = useState(100); // Estimation initiale

  // Hauteur estimée du caption avec padding
  const CAPTION_PADDING = 24; // paddingVertical: 12 * 2
  const estimatedCaptionHeight = captionHeight + CAPTION_PADDING;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => isDraggable,
      onPanResponderGrant: () => {
        setIsDragging(true);
      },
      onPanResponderMove: (_, gestureState) => {
        // Calculate new position with constraints
        const newPosition = currentPosition + gestureState.dy;

        // Limites ajustées en fonction de la hauteur du caption
        // Le haut du caption ne peut pas dépasser 20% de l'écran
        const minY = screenHeight * 0.2;
        // Le bas du caption ne peut pas dépasser 80% de l'écran
        const maxY = screenHeight * 0.8 - estimatedCaptionHeight;

        const constrainedPosition = Math.max(minY, Math.min(maxY, newPosition));

        // Set the pan value to the constrained position
        pan.setValue(constrainedPosition);
      },
      onPanResponderRelease: () => {
        // @ts-ignore
        const finalPosition = pan._value;

        setCurrentPosition(finalPosition);
        onCaptionPositionChange?.(finalPosition);
        setIsDragging(false);
      },
    })
  ).current;

  // Mettre à jour la position quand la prop change
  useEffect(() => {
    setCurrentPosition(captionPosition);
    pan.setValue(captionPosition);
  }, [captionPosition]);

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
        <Image source={{ uri }} style={styles.image} resizeMode="contain" />
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

      {/* Draggable Caption */}
      {caption && caption.trim().length > 0 && (
        <Animated.View
          style={[
            styles.captionContainer,
            {
              transform: [{ translateY: isDraggable ? pan : 0 }],
              top: isDraggable ? 0 : currentPosition,
            },
          ]}
          {...(isDraggable ? panResponder.panHandlers : {})}
        >
          <View
            style={[
              styles.captionBackground,
              isDragging && styles.captionDragging,
              isDraggable && styles.captionDraggable,
            ]}
            onLayout={(event) => {
              const { height } = event.nativeEvent.layout;
              setCaptionHeight(height);
            }}
          >
            <CustomText size="lg" color="#FFF" style={styles.captionText} numberOfLines={3}>
              {caption}
            </CustomText>
          </View>
        </Animated.View>
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
  captionDraggable: {
    // Removed border
  },
  captionDragging: {
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
});
