// Node.js polyfills for React Native
global.Buffer = require('buffer').Buffer;
global.process = require('process');

// Make sure process.env exists
if (!global.process.env) {
  global.process.env = {};
}

// Additional polyfills that might be needed
if (typeof btoa === 'undefined') {
  global.btoa = function (str) {
    return Buffer.from(str, 'binary').toString('base64');
  };
}

if (typeof atob === 'undefined') {
  global.atob = function (b64Encoded) {
    return Buffer.from(b64Encoded, 'base64').toString('binary');
  };
}