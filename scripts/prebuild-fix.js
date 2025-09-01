#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Running prebuild fixes for iOS...');

// Check if we're on EAS Build or local
const isEAS = process.env.EAS_BUILD === 'true';

if (isEAS) {
  console.log('📱 Detected EAS Build environment');
  
  // For EAS, we need to ensure .xcode.env.local uses the correct node path
  const xcodeEnvPath = path.join(__dirname, '..', 'ios', '.xcode.env.local');
  const xcodeEnvContent = `#!/bin/bash

# Use the Node.js binary from PATH (works on EAS)
export NODE_BINARY=$(command -v node)

# Ensure we have the right environment
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
`;

  fs.writeFileSync(xcodeEnvPath, xcodeEnvContent, 'utf8');
  console.log('✅ Created .xcode.env.local for EAS environment');

  // Make sure the file is executable
  try {
    fs.chmodSync(xcodeEnvPath, '755');
  } catch (e) {
    // Ignore chmod errors on CI
  }
} else {
  console.log('💻 Local environment detected, keeping existing .xcode.env.local');
}

console.log('✅ Prebuild fixes completed successfully');