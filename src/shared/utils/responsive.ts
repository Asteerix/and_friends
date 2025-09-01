import { Dimensions, PixelRatio } from 'react-native';

// Design base dimensions (iPhone 14)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

// Get current device dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Calculate scale factors
const widthScale = screenWidth / BASE_WIDTH;
const heightScale = screenHeight / BASE_HEIGHT;
const scale = Math.min(widthScale, heightScale);

/**
 * Responsive width - scales based on device width
 */
export const rw = (width: number): number => {
  return Math.round(width * widthScale);
};

/**
 * Responsive height - scales based on device height
 */
export const rh = (height: number): number => {
  return Math.round(height * heightScale);
};

/**
 * Responsive size - scales based on smaller dimension
 */
export const rs = (size: number): number => {
  return Math.round(size * scale);
};

/**
 * Responsive font size - scales with pixel ratio consideration
 */
export const rf = (fontSize: number): number => {
  const newSize = fontSize * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Get percentage width
 */
export const wp = (percentage: number): number => {
  return Math.round((percentage / 100) * screenWidth);
};

/**
 * Get percentage height
 */
export const hp = (percentage: number): number => {
  return Math.round((percentage / 100) * screenHeight);
};

/**
 * Check if device is tablet
 */
export const isTablet = (): boolean => {
  return screenWidth >= 768;
};

/**
 * Check if device is in landscape mode
 */
export const isLandscape = (): boolean => {
  return screenWidth > screenHeight;
};

/**
 * Get responsive spacing
 */
export const spacing = {
  xs: rs(4),
  sm: rs(8),
  md: rs(16),
  lg: rs(24),
  xl: rs(32),
  xxl: rs(48),
};

/**
 * Get responsive border radius
 */
export const borderRadius = {
  sm: rs(4),
  md: rs(8),
  lg: rs(12),
  xl: rs(16),
  xxl: rs(24),
  full: 9999,
};

/**
 * Common responsive dimensions
 */
export const dimensions = {
  buttonHeight: rs(48),
  inputHeight: rs(56),
  avatarSm: rs(32),
  avatarMd: rs(48),
  avatarLg: rs(64),
  iconSm: rs(16),
  iconMd: rs(24),
  iconLg: rs(32),
};
