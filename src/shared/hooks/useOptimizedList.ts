/**
 * Optimized List Hook
 * Provides optimized configurations for FlatList/SectionList performance
 */

import { useCallback, useMemo } from 'react';
import { Dimensions, ListRenderItem } from 'react-native';

interface UseOptimizedListOptions {
  itemHeight?: number;
  estimatedItemSize?: number;
  windowSize?: number;
  initialNumToRender?: number;
  maxToRenderPerBatch?: number;
  updateCellsBatchingPeriod?: number;
  enableVirtualization?: boolean;
}

interface OptimizedListConfig {
  // Performance optimizations
  removeClippedSubviews: boolean;
  maxToRenderPerBatch: number;
  initialNumToRender: number;
  windowSize: number;
  updateCellsBatchingPeriod: number;
  getItemLayout?: (data: any, index: number) => { length: number; offset: number; index: number };
  keyExtractor: (item: any, index: number) => string;

  // Memory optimizations
  disableVirtualization: boolean;

  // Render optimizations
  renderItem: ListRenderItem<any>;
}

export function useOptimizedList<T>(
  data: T[],
  renderItemComponent: ListRenderItem<T>,
  options: UseOptimizedListOptions = {}
) {
  const {
    itemHeight,
    estimatedItemSize = 100,
    windowSize = 10,
    initialNumToRender = 10,
    maxToRenderPerBatch = 10,
    updateCellsBatchingPeriod = 50,
    enableVirtualization = true,
  } = options;

  // Optimize keyExtractor - use item id or fallback to index
  const keyExtractor = useCallback((item: T, index: number) => {
    if (typeof item === 'object' && item !== null && 'id' in item) {
      return String((item as any).id);
    }
    return String(index);
  }, []);

  // Create optimized getItemLayout if itemHeight is provided
  const getItemLayout = useMemo(() => {
    if (!itemHeight) return undefined;

    return (data: any, index: number) => ({
      length: itemHeight,
      offset: itemHeight * index,
      index,
    });
  }, [itemHeight]);

  // Memoize renderItem to prevent unnecessary re-renders
  const optimizedRenderItem = useCallback(renderItemComponent, [renderItemComponent]);

  // Calculate optimal viewport based on screen size
  const screenData = useMemo(() => {
    const { height } = Dimensions.get('window');
    const viewportHeight = height;
    const calculatedWindowSize = Math.max(
      windowSize,
      Math.ceil(viewportHeight / estimatedItemSize) * 2
    );

    return {
      windowSize: calculatedWindowSize,
      initialNumToRender: Math.min(
        initialNumToRender,
        Math.ceil(viewportHeight / estimatedItemSize)
      ),
    };
  }, [windowSize, initialNumToRender, estimatedItemSize]);

  const config: Partial<OptimizedListConfig> = {
    // Core performance optimizations
    removeClippedSubviews: true,
    maxToRenderPerBatch,
    initialNumToRender: screenData.initialNumToRender,
    windowSize: screenData.windowSize,
    updateCellsBatchingPeriod,

    // Memory management
    disableVirtualization: !enableVirtualization,

    // Optimized functions
    getItemLayout,
    keyExtractor,
    renderItem: optimizedRenderItem,
  };

  return config;
}

/**
 * Hook for optimizing large image lists
 */
export function useOptimizedImageList<T>(
  data: T[],
  renderItemComponent: ListRenderItem<T>,
  itemHeight: number = 200
) {
  return useOptimizedList(data, renderItemComponent, {
    itemHeight,
    windowSize: 5, // Smaller window for images to manage memory
    initialNumToRender: 5,
    maxToRenderPerBatch: 3,
    updateCellsBatchingPeriod: 100, // Slower batching for images
  });
}

/**
 * Hook for optimizing chat/message lists
 */
export function useOptimizedChatList<T>(data: T[], renderItemComponent: ListRenderItem<T>) {
  return useOptimizedList(data, renderItemComponent, {
    estimatedItemSize: 60, // Typical message height
    windowSize: 20, // Larger window for smooth scrolling
    initialNumToRender: 15,
    maxToRenderPerBatch: 20,
    updateCellsBatchingPeriod: 25, // Fast updates for real-time feel
  });
}

/**
 * Hook for optimizing event/card lists
 */
export function useOptimizedEventList<T>(data: T[], renderItemComponent: ListRenderItem<T>) {
  return useOptimizedList(data, renderItemComponent, {
    estimatedItemSize: 150, // Typical event card height
    windowSize: 8,
    initialNumToRender: 6,
    maxToRenderPerBatch: 8,
    updateCellsBatchingPeriod: 50,
  });
}
