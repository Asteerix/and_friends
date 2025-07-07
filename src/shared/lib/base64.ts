
/**
 * Base64 encoding/decoding utilities
 */

/**
 * Decode a base64 string
 * @param base64 - The base64 string to decode
 * @returns The decoded string
 */
export function decode(base64: string): string {
  try {
    // Handle both browser and React Native environments
    if (typeof atob !== 'undefined') {
      // Browser environment
      return atob(base64);
    } else {
      // React Native environment - use Buffer
      return Buffer.from(base64, 'base64').toString('utf-8');
    }
  } catch (error) {
    console.error('Failed to decode base64:', error);
    return '';
  }
}

/**
 * Encode a string to base64
 * @param str - The string to encode
 * @returns The base64 encoded string
 */
export function encode(str: string): string {
  try {
    // Handle both browser and React Native environments
    if (typeof btoa !== 'undefined') {
      // Browser environment
      return btoa(str);
    } else {
      // React Native environment - use Buffer
      return Buffer.from(str, 'utf-8').toString('base64');
    }
  } catch (error) {
    console.error('Failed to encode to base64:', error);
    return '';
  }
}