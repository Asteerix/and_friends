import React from 'react';
import { View, Image, Text, StyleSheet, ImageStyle, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Import fonts and backgrounds data
import {
  FONTS as IMPORTED_FONTS,
  BACKGROUNDS as IMPORTED_BACKGROUNDS,
} from '../data/eventTemplates';

// Map fonts with their styles
const FONTS = IMPORTED_FONTS.map((font) => ({
  ...font,
  style: {
    fontFamily: font.value,
    fontWeight:
      font.name === 'AFTERPARTY'
        ? ('bold' as const)
        : font.name === 'Bold Impact'
          ? ('900' as const)
          : font.name === 'Modern'
            ? ('300' as const)
            : font.name === 'Elegant'
              ? ('500' as const)
              : ('normal' as const),
    fontStyle:
      font.name === 'Classic Invite' || font.name === 'Fun Script'
        ? ('italic' as const)
        : ('normal' as const),
  },
}));

const BACKGROUNDS = IMPORTED_BACKGROUNDS.map((bg) => ({
  ...bg,
  colors: bg.colors as [string, string],
}));

interface EventCoverPreviewProps {
  event: {
    title?: string;
    subtitle?: string;
    image_url?: string;
    cover_data?: {
      selectedBackground?: string;
      selectedTemplate?: any;
      coverImage?: string;
      uploadedImage?: string;
      placedStickers?: Array<{
        id: string;
        emoji: string;
        x: number;
        y: number;
        scale: number;
        rotation: number;
      }>;
      selectedTitleFont?: string;
      selectedSubtitleFont?: string;
    };
  };
  style?: ViewStyle;
  showTitle?: boolean;
  showOverlay?: boolean;
}

export default function EventCoverPreview({
  event,
  style,
  showTitle = true,
  showOverlay = true,
}: EventCoverPreviewProps) {
  const coverData = event.cover_data || {};

  // Get font styles
  const getTitleFontStyle = () => {
    const font = FONTS.find((f) => f.id === coverData.selectedTitleFont);
    return font?.style || {};
  };

  const getSubtitleFontStyle = () => {
    const font = FONTS.find((f) => f.id === coverData.selectedSubtitleFont);
    return font?.style || {};
  };

  // Get background gradient colors
  const getBackgroundColors = () => {
    if (coverData.selectedBackground) {
      const bg = BACKGROUNDS.find((b) => b.id === coverData.selectedBackground);
      return bg?.colors || ['#C8E6C9', '#C8E6C9'];
    }
    return ['#C8E6C9', '#C8E6C9'];
  };

  return (
    <View style={[styles.container, style]}>
      {/* Background */}
      {coverData.selectedBackground && !coverData.coverImage && !coverData.selectedTemplate ? (
        <LinearGradient colors={getBackgroundColors() as any} style={styles.gradient} />
      ) : coverData.selectedTemplate ? (
        <Image
          source={coverData.selectedTemplate.image}
          style={styles.image as ImageStyle}
          resizeMode="cover"
        />
      ) : coverData.coverImage || coverData.uploadedImage || event.image_url ? (
        <Image
          source={{ uri: coverData.coverImage || coverData.uploadedImage || event.image_url }}
          style={styles.image as ImageStyle}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.placeholder}>
          <LinearGradient colors={['#E0E0E0', '#CCCCCC']} style={styles.gradient} />
          <Ionicons name="image-outline" size={40} color="#FFF" style={{ opacity: 0.5 }} />
        </View>
      )}

      {/* Stickers */}
      {coverData.placedStickers && coverData.placedStickers.length > 0 && (
        <View style={styles.stickersLayer} pointerEvents="none">
          {coverData.placedStickers.map((sticker) => (
            <View
              key={sticker.id}
              style={[
                styles.sticker,
                {
                  left: `${sticker.x}%`,
                  top: `${sticker.y}%`,
                  transform: [
                    { scale: sticker.scale * 0.5 }, // Scale down for preview
                    { rotate: `${sticker.rotation}deg` },
                  ],
                },
              ]}
            >
              <Text style={styles.stickerEmoji}>{sticker.emoji}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Overlay gradient for readability */}
      {showOverlay && (
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.6)']}
          style={styles.overlay}
          pointerEvents="none"
        />
      )}

      {/* Title overlay */}
      {showTitle && (event.title || event.subtitle) && (
        <View style={styles.titleContainer}>
          {event.title && (
            <Text style={[styles.title, getTitleFontStyle()]} numberOfLines={2}>
              {event.title}
            </Text>
          )}
          {event.subtitle && (
            <Text style={[styles.subtitle, getSubtitleFontStyle()]} numberOfLines={1}>
              {event.subtitle}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickersLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sticker: {
    position: 'absolute',
    zIndex: 10,
  },
  stickerEmoji: {
    fontSize: 20,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  titleContainer: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    right: 12,
    zIndex: 20,
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 2,
  } as TextStyle,
  subtitle: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  } as TextStyle,
});
