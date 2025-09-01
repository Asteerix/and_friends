import { useWindowDimensions, PixelRatio } from 'react-native';

const baseWidth = 375; // iPhone 11 Pro
const baseHeight = 812;

interface ResponsiveDimensions {
  width: number;
  height: number;
  pixelRatio: number;
  isSmallDevice: boolean;
  isMediumDevice: boolean;
  isLargeDevice: boolean;
  isTablet: boolean;
  isLandscape: boolean;
  breakpoints: {
    small: number;
    medium: number;
    large: number;
  };
  scaleWidth: (size: number) => number;
  scaleHeight: (size: number) => number;
  scaleFontSize: (size: number) => number;
  getResponsiveValue: <T>(values: { small?: T; medium?: T; large?: T; default: T }) => T;
  headerHeight: number;
  tabBarHeight: number;
  avatarSize: number;
}

/**
 * Hook to get responsive dimensions that update on orientation change
 */
export const useResponsive = (): ResponsiveDimensions => {
  const { width, height } = useWindowDimensions();
  const pixelRatio = PixelRatio.get();

  // Scale functions
  const scaleWidth = (size: number) => (width / baseWidth) * size;
  const scaleHeight = (size: number) => (height / baseHeight) * size;
  const scaleFontSize = (size: number) => Math.round(scaleWidth(size));

  // Device type detection
  const isSmallDevice = width < 375;
  const isMediumDevice = width >= 375 && width < 768;
  const isLargeDevice = width >= 768;
  const isTablet = width >= 768;
  const isLandscape = width > height;

  // Breakpoints
  const breakpoints = {
    small: 375,
    medium: 768,
    large: 1024,
  };

  // Responsive values
  const getResponsiveValue = <T>(values: { small?: T; medium?: T; large?: T; default: T }): T => {
    if (isSmallDevice && values.small !== undefined) return values.small;
    if (isMediumDevice && values.medium !== undefined) return values.medium;
    if (isLargeDevice && values.large !== undefined) return values.large;
    return values.default;
  };

  // Common responsive dimensions
  const headerHeight = getResponsiveValue({
    small: height * 0.75,
    medium: height * 0.8,
    large: height * 0.85,
    default: height * 0.8,
  });

  const tabBarHeight = getResponsiveValue({
    small: 70,
    medium: 80,
    large: 90,
    default: 80,
  });

  const avatarSize = getResponsiveValue({
    small: 80,
    medium: 100,
    large: 120,
    default: 100,
  });

  return {
    width,
    height,
    pixelRatio,
    isSmallDevice,
    isMediumDevice,
    isLargeDevice,
    isTablet,
    isLandscape,
    breakpoints,
    scaleWidth,
    scaleHeight,
    scaleFontSize,
    getResponsiveValue,
    headerHeight,
    tabBarHeight,
    avatarSize,
  };
};

// Export individual utility functions for use outside of the hook
export const scaleSize = (size: number, baseSize: number, currentSize: number) =>
  (currentSize / baseSize) * size;

export const getAspectRatioHeight = (width: number, aspectRatio: number) => width / aspectRatio;

export const getAspectRatioWidth = (height: number, aspectRatio: number) => height * aspectRatio;
