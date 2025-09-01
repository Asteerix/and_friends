#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Running prebuild fixes for iOS...');

// Check if we're on EAS Build or local
const isEAS = process.env.EAS_BUILD === 'true';
const platform = process.env.EAS_BUILD_PLATFORM;

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

  // Install CocoaPods dependencies for iOS
  if (platform === 'ios') {
    console.log('📦 Installing CocoaPods dependencies...');
    try {
      // Change to ios directory
      process.chdir(path.join(__dirname, '..', 'ios'));
      
      // Run pod install with deployment flag for stability
      execSync('pod install --repo-update --deployment', { 
        stdio: 'inherit',
        env: { ...process.env }
      });
      
      console.log('✅ CocoaPods installation successful');
      
      // Change back to project root
      process.chdir(path.join(__dirname, '..'));
    } catch (error) {
      console.error('❌ CocoaPods installation failed:', error.message);
      process.exit(1);
    }
  }
} else {
  console.log('💻 Local environment detected, keeping existing .xcode.env.local');
}

console.log('✅ Prebuild fixes completed successfully');