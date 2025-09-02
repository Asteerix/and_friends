#!/bin/sh

# Script executed by Xcode Cloud after cloning the repository

echo "=== Starting ci_post_clone.sh ==="
echo "Current directory: $(pwd)"

# First, install Node dependencies (required for Expo/React Native Podfile)
echo "Installing Node dependencies..."
npm ci || npm install

# Now navigate to ios directory for Pod installation
cd ios
echo "Changed to directory: $(pwd)"

# Install CocoaPods if needed
echo "Installing CocoaPods..."
sudo gem install cocoapods

# Run pod install
echo "Running pod install..."
pod install

echo "=== ci_post_clone.sh completed ==="