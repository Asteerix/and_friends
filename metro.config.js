// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ajoutez ou modifiez la configuration du resolver pour les polyfills
config.resolver = {
  ...config.resolver,
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
    fs: require.resolve('react-native-fs'),
  },
};

module.exports = config;