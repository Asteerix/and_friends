/**
 * Setup for integration tests
 * This setup file bypasses mocks for real integration testing
 */

// Don't load the main jest setup that has mocks
// Just set up the basic environment

// Mock only the truly problematic modules for React Native environment
jest.mock('react-native-url-polyfill/auto', () => {});

// Mock NetInfo with basic implementation
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, type: 'cellular' })),
  addEventListener: jest.fn(() => () => {}),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((config) => config.ios),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
    addEventListener: jest.fn(),
  },
  Alert: {
    alert: jest.fn(),
  },
  StyleSheet: {
    create: jest.fn((styles) => styles),
    flatten: jest.fn((styles) => styles),
  },
  Text: 'Text',
  View: 'View',
  TouchableOpacity: 'TouchableOpacity',
  Image: 'Image',
  ScrollView: 'ScrollView',
  TextInput: 'TextInput',
}));

// Mock Expo modules that are not needed for integration tests
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  useSegments: jest.fn(() => []),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 44, bottom: 34, left: 0, right: 0 })),
}));

// Don't mock Supabase client for integration tests - we want the real one!

console.log('Integration test setup loaded - using real Supabase client');