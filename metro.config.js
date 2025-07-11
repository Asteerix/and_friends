// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configuration pour react-native-svg-transformer
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter(ext => ext !== 'svg'),
  sourceExts: [...config.resolver.sourceExts, 'svg'],
  extraNodeModules: {
    ...config.resolver.extraNodeModules,
    stream: require.resolve('stream-browserify'),
    https: require.resolve('https-browserify'),
    http: require.resolve('stream-http'),
    crypto: require.resolve('crypto-browserify'),
    net: require.resolve('net-browserify'),
    tls: require.resolve('tls-browserify'),
    url: require.resolve('url/'),
    os: require.resolve('os-browserify/browser'),
    path: require.resolve('path-browserify'),
    vm: require.resolve('vm-browserify'),
    zlib: require.resolve('browserify-zlib'),
    util: require.resolve('util/'),
    assert: require.resolve('assert/'),
    querystring: require.resolve('querystring-es3'),
    buffer: require.resolve('buffer/'),
    process: require.resolve('process/browser'),
    timers: require.resolve('timers-browserify'),
    string_decoder: require.resolve('string_decoder/'),
    constants: require.resolve('constants-browserify'),
    fs: require.resolve('expo-file-system'),
  },
  resolveRequest: (context, moduleName, platform) => {
    // Fix for jest-util missing module
    if (moduleName === './testPathPatternToRegExp') {
      return { type: 'empty' };
    }
    // Default resolution
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;