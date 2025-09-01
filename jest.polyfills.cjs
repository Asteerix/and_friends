// Mock react-native-url-polyfill/auto properly for Jest
// Instead of importing the module directly (which contains ES6 imports),
// we'll mock the URL global ourselves

// Polyfill URL if not available
if (!global.URL) {
  const { URL, URLSearchParams } = require('url');
  global.URL = URL;
  global.URLSearchParams = URLSearchParams;
}

// Mock TextEncoder/TextDecoder for React Native
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock performance
if (!global.performance) {
  global.performance = {
    now: () => Date.now(),
  };
}