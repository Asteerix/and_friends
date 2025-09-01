module.exports = {
  // Fix for React Native bundling on iOS
  project: {
    ios: {
      sourceDir: './ios',
    },
    android: {
      sourceDir: './android',
    },
  },
  dependencies: {
    // Disable autolinking for packages that cause issues
    '@react-native-community/netinfo': {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};