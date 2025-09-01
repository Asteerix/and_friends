const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Polyfills nécessaires pour les modules Node.js
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
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
};

module.exports = config;