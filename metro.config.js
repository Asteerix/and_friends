// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Handle pnpm's node_modules structure
const pnpmRoot = path.resolve(__dirname, 'node_modules/.pnpm');

// Fix for missing-asset-registry-path and polyfills
config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [
    path.resolve(__dirname, 'node_modules'),
    pnpmRoot,
  ],
  extraNodeModules: {
    ...config.resolver.extraNodeModules,
    'missing-asset-registry-path': path.resolve(__dirname, 'node_modules/@react-native/assets-registry/registry.js'),
    stream: require.resolve('stream-browserify'),
    https: require.resolve('https-browserify'),
    http: require.resolve('stream-http'),
    crypto: require.resolve('crypto-browserify'),
    net: require.resolve('net-browserify'),
    tls: require.resolve('tls-browserify'),
    os: require.resolve('os-browserify'),
    path: require.resolve('path-browserify'),
    vm: require.resolve('vm-browserify'),
    zlib: require.resolve('browserify-zlib'),
    querystring: require.resolve('querystring-es3'),
    timers: require.resolve('timers-browserify'),
    string_decoder: require.resolve('string_decoder'),
    constants: require.resolve('constants-browserify'),
    fs: require.resolve('expo-file-system'),
    events: require.resolve('events'),
    buffer: require.resolve('buffer'),
    process: require.resolve('process'),
    url: require.resolve('url'),
  },
  resolveRequest: (context, moduleName, platform) => {
    // Handle missing-asset-registry-path
    if (moduleName === 'missing-asset-registry-path') {
      return {
        type: 'sourceFile',
        filePath: path.resolve(__dirname, 'node_modules/@react-native/assets-registry/registry.js'),
      };
    }
    // Default resolution
    return context.resolveRequest(context, moduleName, platform);
  },
};

// Add watchFolders for pnpm
config.watchFolders = [
  path.resolve(__dirname, 'node_modules'),
  pnpmRoot,
];

module.exports = config;