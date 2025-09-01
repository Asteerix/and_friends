/**
 * Optimized Image Hook
 * Provides intelligent image loading and caching for better performance
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { ImageSourcePropType, Dimensions } from 'react-native';
import * as FileSystem from 'expo-file-system';

interface UseOptimizedImageOptions {
  placeholder?: ImageSourcePropType;
  quality?: number;
  width?: number;
  height?: number;
  cache?: boolean;
  lazy?: boolean;
  priority?: 'high' | 'normal' | 'low';
}

interface OptimizedImageState {
  source: ImageSourcePropType | null;
  isLoading: boolean;
  error: Error | null;
  isVisible: boolean;
}

const imageCache = new Map<string, string>();
const loadingQueue: { [key: string]: Promise<string> } = {};

export function useOptimizedImage(
  uri: string | null | undefined,
  options: UseOptimizedImageOptions = {}
) {
  const {
    placeholder,
    quality = 0.8,
    width,
    height,
    cache = true,
    lazy = false,
    priority = 'normal',
  } = options;

  const [state, setState] = useState<OptimizedImageState>({
    source: placeholder || null,
    isLoading: false,
    error: null,
    isVisible: !lazy,
  });

  const isMountedRef = useRef(true);

  // Generate cache key based on URI and transformations
  const getCacheKey = useCallback(
    (imageUri: string) => {
      const params = new URLSearchParams({
        uri: imageUri,
        quality: quality.toString(),
        ...(width && { width: width.toString() }),
        ...(height && { height: height.toString() }),
      });
      return params.toString();
    },
    [quality, width, height]
  );

  // Optimize image dimensions based on screen size
  const getOptimizedDimensions = useCallback(() => {
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;

    return {
      width: width || Math.min(screenWidth, 800), // Max width for performance
      height: height || Math.min(screenHeight, 600), // Max height for performance
    };
  }, [width, height]);

  // Load and cache image
  const loadImage = useCallback(
    async (imageUri: string): Promise<string> => {
      if (!cache) return imageUri;

      const cacheKey = getCacheKey(imageUri);

      // Check memory cache first
      if (imageCache.has(cacheKey)) {
        return imageCache.get(cacheKey)!;
      }

      // Check if already loading
      if (loadingQueue[cacheKey]) {
        return loadingQueue[cacheKey];
      }

      // Start loading
      const loadPromise = (async () => {
        try {
          // For local files, return as-is
          if (imageUri.startsWith('file://') || imageUri.startsWith('asset://')) {
            return imageUri;
          }

          // For remote images, use FileSystem caching
          const filename = cacheKey.replace(/[^a-zA-Z0-9]/g, '_') + '.jpg';
          const cacheUri = `${FileSystem.cacheDirectory}images/${filename}`;

          // Check if cached version exists
          const cacheInfo = await FileSystem.getInfoAsync(cacheUri);
          if (cacheInfo.exists) {
            const cachedUri = cacheInfo.uri;
            imageCache.set(cacheKey, cachedUri);
            return cachedUri;
          }

          // Ensure cache directory exists
          const cacheDir = `${FileSystem.cacheDirectory}images/`;
          await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });

          // Download and cache
          const downloadResult = await FileSystem.downloadAsync(imageUri, cacheUri);
          const finalUri = downloadResult.uri;

          imageCache.set(cacheKey, finalUri);
          return finalUri;
        } catch (error) {
          console.warn('Failed to cache image:', error);
          // Return original URI as fallback
          return imageUri;
        } finally {
          delete loadingQueue[cacheKey];
        }
      })();

      loadingQueue[cacheKey] = loadPromise;
      return loadPromise;
    },
    [cache, getCacheKey]
  );

  // Load image when URI changes or when becoming visible
  useEffect(() => {
    if (!uri || !state.isVisible || !isMountedRef.current) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const loadImageAsync = async () => {
      try {
        const optimizedUri = await loadImage(uri);

        if (isMountedRef.current) {
          setState((prev) => ({
            ...prev,
            source: { uri: optimizedUri },
            isLoading: false,
            error: null,
          }));
        }
      } catch (error) {
        if (isMountedRef.current) {
          setState((prev) => ({
            ...prev,
            source: placeholder || null,
            isLoading: false,
            error: error as Error,
          }));
        }
      }
    };

    // Prioritize loading based on priority
    if (priority === 'high') {
      loadImageAsync();
    } else {
      // Defer low and normal priority images slightly
      const delay = priority === 'low' ? 100 : 0;
      setTimeout(loadImageAsync, delay);
    }
  }, [uri, state.isVisible, loadImage, placeholder, priority]);

  // Make image visible (for lazy loading)
  const makeVisible = useCallback(() => {
    if (lazy && !state.isVisible) {
      setState((prev) => ({ ...prev, isVisible: true }));
    }
  }, [lazy, state.isVisible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    source: state.source,
    isLoading: state.isLoading,
    error: state.error,
    makeVisible,
    optimizedDimensions: getOptimizedDimensions(),
  };
}

/**
 * Hook specifically for avatar images (small, circular)
 */
export function useOptimizedAvatar(uri: string | null | undefined) {
  return useOptimizedImage(uri, {
    width: 100,
    height: 100,
    quality: 0.7,
    cache: true,
    priority: 'normal',
  });
}

/**
 * Hook specifically for cover images (large, banner-style)
 */
export function useOptimizedCover(uri: string | null | undefined) {
  const screenWidth = Dimensions.get('window').width;

  return useOptimizedImage(uri, {
    width: screenWidth,
    height: Math.round(screenWidth * 0.6), // 16:10 aspect ratio
    quality: 0.8,
    cache: true,
    priority: 'high',
  });
}

/**
 * Hook for thumbnail images (medium size)
 */
export function useOptimizedThumbnail(uri: string | null | undefined, lazy = true) {
  return useOptimizedImage(uri, {
    width: 200,
    height: 200,
    quality: 0.6,
    cache: true,
    lazy,
    priority: 'low',
  });
}

/**
 * Clear image cache (useful for memory management)
 */
export function clearImageCache() {
  imageCache.clear();

  // Also clear FileSystem cache
  FileSystem.deleteAsync(`${FileSystem.cacheDirectory}images/`, { idempotent: true }).catch(
    (error) => console.warn('Failed to clear image cache:', error)
  );
}

/**
 * Get cache statistics
 */
export function getImageCacheStats() {
  return {
    memoryItems: imageCache.size,
    loadingItems: Object.keys(loadingQueue).length,
  };
}
