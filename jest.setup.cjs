// Mock react-native-url-polyfill/auto
jest.mock('react-native-url-polyfill/auto', () => {});

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => {
  const mockNetInfo = {
    fetch: jest.fn(() => Promise.resolve({ isConnected: true, type: 'cellular' })),
    addEventListener: jest.fn(() => () => {}),
  };
  return {
    __esModule: true,
    default: mockNetInfo,
    fetch: mockNetInfo.fetch,
    addEventListener: mockNetInfo.addEventListener,
  };
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Supabase client
jest.mock('@/shared/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      getSession: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      ilike: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        download: jest.fn(),
        remove: jest.fn(),
        getPublicUrl: jest.fn(),
      })),
      listBuckets: jest.fn(),
    },
    realtime: {
      channel: jest.fn(() => ({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      })),
    },
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    })),
    rpc: jest.fn(),
  },
}));

// Mock phone validation utilities
jest.mock('@/shared/utils/phoneValidation', () => ({
  validatePhoneNumber: jest.fn((phone, country) => ({
    isValid: phone && phone.startsWith('+33') && phone.length > 10,
    formattedNumber: phone,
    cleanNumber: phone?.replace(/\D/g, ''),
    error: null,
  })),
  formatPhoneNumberForDisplay: jest.fn((phone) => phone?.replace(/(\\+\\d{2})(\\d)(\\d{2})(\\d{2})(\\d{2})(\\d{2})/, '$1 $2 $3 $4 $5 $6')),
  checkOTPRateLimit: jest.fn(() => Promise.resolve({ canRequest: true })),
  recordOTPRequest: jest.fn(() => Promise.resolve({ success: true, message: 'OTP request processed' })),
  PHONE_PATTERNS: {},
}));

// Mock brute force protection (for integration tests)
jest.mock('@/shared/utils/bruteforceProtection', () => ({
  recordFailedOTPAttempt: jest.fn(() => Promise.resolve({ isBanned: false })),
  checkBanStatus: jest.fn(() => Promise.resolve({ isBanned: false })),
  clearBruteforceData: jest.fn(() => Promise.resolve()),
}));

// Mock Expo Device
jest.mock('expo-device', () => ({
  deviceName: 'Mock Device',
  modelName: 'Mock Model',
  osName: 'Mock OS',
  osVersion: '1.0.0',
}));

// Mock Expo Crypto
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn().mockResolvedValue('mock-hash-123'),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA256',
  },
  CryptoEncoding: {
    HEX: 'hex',
  },
}));

// Mock device ID utility
jest.mock('@/shared/utils/deviceId', () => ({
  getDeviceId: jest.fn().mockResolvedValue('mock-device-id-123'),
}));

// Mock error logger
jest.mock('@/shared/utils/errorLogger', () => ({
  errorLogger: {
    log: jest.fn(),
    logError: jest.fn(),
    logWarning: jest.fn(),
    logInfo: jest.fn(),
  },
}));

// Global test utilities
global.fetch = jest.fn();
global.navigator = {
  onLine: true,
};

// Mock React Native globals
global.__DEV__ = true;
global.jest = true;

// Silence console warnings during tests
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});