
module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  setupFiles: ['<rootDir>/jest.polyfills.cjs'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(svg|png|jpg|jpeg|gif)$': '<rootDir>/__mocks__/imageMock.js',
    '^@expo/vector-icons$': '<rootDir>/__mocks__/@expo/vector-icons.js',
    '^expo-(.*)$': '<rootDir>/__mocks__/expo-$1.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|expo|@expo|@unimodules|@react-navigation|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|react-native-vector-icons|react-native-svg|@react-native-async-storage|uuid|react-native-url-polyfill|@supabase|@tanstack|react-native-.*|expo-.*)/)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/', '/.expo/'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/__tests__/**',
  ],
  testTimeout: 10000,
  clearMocks: true,
  restoreMocks: true,
  verbose: true,
};
