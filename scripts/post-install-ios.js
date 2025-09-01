#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Running post-install script for iOS...');

// Check if we're on EAS Build
const isEAS = process.env.EAS_BUILD === 'true';
const platform = process.env.EAS_BUILD_PLATFORM;

if (isEAS && platform === 'ios') {
  console.log('📱 Installing CocoaPods for iOS on EAS Build...');
  
  const iosDir = path.join(__dirname, '..', 'ios');
  console.log('iOS directory:', iosDir);
  
  // Check if ios directory exists
  if (!fs.existsSync(iosDir)) {
    console.error('❌ iOS directory not found at:', iosDir);
    console.log('Contents of parent directory:');
    const parentDir = path.join(__dirname, '..');
    console.log(fs.readdirSync(parentDir));
    process.exit(1);
  }
  
  // Check if Podfile exists
  const podfilePath = path.join(iosDir, 'Podfile');
  if (!fs.existsSync(podfilePath)) {
    console.error('❌ Podfile not found at:', podfilePath);
    console.log('Contents of iOS directory:');
    console.log(fs.readdirSync(iosDir));
    process.exit(1);
  }
  
  try {
    // Change to ios directory
    const originalDir = process.cwd();
    process.chdir(iosDir);
    console.log('Changed to iOS directory:', process.cwd());
    
    // Check if pod command is available
    try {
      const podPath = execSync('which pod', { encoding: 'utf8' }).trim();
      console.log('✅ CocoaPods found at:', podPath);
    } catch (e) {
      console.log('⚠️ CocoaPods not found in PATH, trying to install...');
      try {
        execSync('gem install cocoapods', { stdio: 'inherit' });
        console.log('✅ CocoaPods installed successfully');
      } catch (gemError) {
        console.error('❌ Failed to install CocoaPods via gem');
        // Continue anyway, as CocoaPods might be available differently on EAS
      }
    }
    
    // Run pod install
    console.log('Running pod install...');
    try {
      execSync('pod install --repo-update', { 
        stdio: 'inherit',
        env: { ...process.env }
      });
      console.log('✅ Pod install completed successfully');
    } catch (podError) {
      console.error('❌ Pod install failed with error:', podError.message);
      
      // Try without repo-update
      console.log('Retrying pod install without repo-update...');
      execSync('pod install', { 
        stdio: 'inherit',
        env: { ...process.env }
      });
      console.log('✅ Pod install completed successfully (without repo-update)');
    }
    
    // Verify Pods directory was created
    const podsDir = path.join(iosDir, 'Pods');
    if (fs.existsSync(podsDir)) {
      console.log('✅ Pods directory created successfully');
      const podCount = fs.readdirSync(podsDir).length;
      console.log(`📦 Installed ${podCount} pod dependencies`);
    } else {
      console.error('⚠️ Warning: Pods directory not found after installation');
    }
    
    // Change back to original directory
    process.chdir(originalDir);
    
  } catch (error) {
    console.error('❌ Post-install script failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
} else {
  if (!isEAS) {
    console.log('💻 Local environment detected, skipping post-install');
  } else {
    console.log(`📦 Platform ${platform} detected, skipping iOS post-install`);
  }
}

console.log('✅ Post-install script completed successfully');