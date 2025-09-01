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
    console.log('Current directory:', process.cwd());
    
    const iosDir = path.join(__dirname, '..', 'ios');
    console.log('iOS directory:', iosDir);
    
    // Check if ios directory exists
    if (!fs.existsSync(iosDir)) {
      console.error('❌ iOS directory not found at:', iosDir);
      process.exit(1);
    }
    
    // Check if Podfile exists
    const podfilePath = path.join(iosDir, 'Podfile');
    if (!fs.existsSync(podfilePath)) {
      console.error('❌ Podfile not found at:', podfilePath);
      process.exit(1);
    }
    
    try {
      // Change to ios directory
      process.chdir(iosDir);
      console.log('Changed to iOS directory:', process.cwd());
      
      // Check if pod command is available
      try {
        execSync('which pod', { stdio: 'pipe' });
        console.log('✅ CocoaPods is installed');
      } catch (e) {
        console.error('❌ CocoaPods not found. Installing via gem...');
        try {
          execSync('gem install cocoapods', { stdio: 'inherit' });
        } catch (gemError) {
          console.error('❌ Failed to install CocoaPods:', gemError.message);
          process.exit(1);
        }
      }
      
      // Run pod install without deployment flag first
      console.log('Running pod install...');
      execSync('pod install --repo-update', { 
        stdio: 'inherit',
        env: { ...process.env }
      });
      
      console.log('✅ CocoaPods installation successful');
      
      // Change back to project root
      process.chdir(path.join(__dirname, '..'));
    } catch (error) {
      console.error('❌ CocoaPods installation failed:', error.message);
      console.error('Stack trace:', error.stack);
      process.exit(1);
    }
  }
} else {
  console.log('💻 Local environment detected, keeping existing .xcode.env.local');
}

console.log('✅ Prebuild fixes completed successfully');