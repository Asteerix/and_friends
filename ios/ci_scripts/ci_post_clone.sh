#!/bin/sh

# Script executed by Xcode Cloud after cloning the repository

echo "=== Starting ci_post_clone.sh ==="
echo "Current directory: $(pwd)"

# Install Node dependencies first (required for Expo/React Native Podfile)
echo "Installing Node dependencies..."
npm ci || npm install

# Ensure expo is available
echo "Installing expo-cli globally..."
npm install -g expo-cli

# Navigate to ios directory
cd ios
echo "Changed to directory: $(pwd)"

# Clean any existing Pods to ensure fresh installation
echo "Cleaning existing Pods..."
rm -rf Pods
rm -f Podfile.lock

# Install CocoaPods
echo "Installing CocoaPods..."
sudo gem install cocoapods

# Run pod install without deployment flag
echo "Running pod install..."
pod install

# Double check the critical file exists
if [ -f "Pods/Target Support Files/Pods-friends/Pods-friends.release.xcconfig" ]; then
    echo "✅ SUCCESS: Pods-friends.release.xcconfig exists!"
else
    echo "❌ ERROR: Pods-friends.release.xcconfig not found after pod install"
    echo "Attempting to regenerate pods..."
    pod deintegrate
    pod install
    
    # Final check
    if [ -f "Pods/Target Support Files/Pods-friends/Pods-friends.release.xcconfig" ]; then
        echo "✅ SUCCESS: Pods-friends.release.xcconfig created after retry!"
    else
        echo "❌ FATAL: Could not create required pod configuration files"
        exit 1
    fi
fi

echo "=== ci_post_clone.sh completed successfully ==="