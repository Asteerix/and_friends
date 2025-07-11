import React, { useEffect, useState } from 'react';
import {
  Image,
  ImageProps,
  ActivityIndicator,
  View,
  StyleSheet,
} from 'react-native';
import { imageCacheManager } from '@/shared/utils/cache/imageCache';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  uri: string;
  placeholder?: string;
  fallback?: string;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: any) => void;
  priority?: 'low' | 'normal' | 'high';
}

export const CachedImage: React.FC<CachedImageProps> = ({
  uri,
  placeholder,
  fallback,
  onLoadStart,
  onLoadEnd,
  onError,
  priority = 'normal',
  style,
  ...props
}) => {
  const [source, setSource] = useState<string | null>(placeholder || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadImage = async () => {
      if (!uri) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        onLoadStart?.();

        // Try to get cached image
        const cachedPath = await imageCacheManager.getCachedImage(uri);
        
        if (cachedPath && isMounted) {
          setSource(cachedPath);
          setLoading(false);
          setError(false);
          onLoadEnd?.();
          return;
        }

        // Download and cache the image
        const localPath = await imageCacheManager.cacheImage(uri);
        
        if (isMounted) {
          setSource(localPath);
          setLoading(false);
          setError(false);
          onLoadEnd?.();
        }
      } catch (err) {
        console.error('Failed to load image:', err);
        if (isMounted) {
          setError(true);
          setLoading(false);
          setSource(fallback || null);
          onError?.(err);
          onLoadEnd?.();
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [uri, placeholder, fallback, onLoadStart, onLoadEnd, onError]);

  if (!source && loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="small" color="#999" />
      </View>
    );
  }

  if (!source) {
    return null;
  }

  return (
    <Image
      {...props}
      source={{ uri: source }}
      style={style}
      onError={(e) => {
        setError(true);
        setSource(fallback || null);
        onError?.(e.nativeEvent.error);
      }}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
});

// Hook for preloading images
export const usePreloadImages = (urls: string[]) => {
  useEffect(() => {
    if (urls.length > 0) {
      imageCacheManager.preloadImages(urls);
    }
  }, [urls]);
};

// Hook for managing image cache
export const useImageCache = () => {
  return {
    preload: (urls: string[]) => imageCacheManager.preloadImages(urls),
    clear: () => imageCacheManager.clearCache(),
    delete: (uri: string) => imageCacheManager.deleteImage(uri),
    getCacheInfo: () => imageCacheManager.getCacheInfo(),
  };
};