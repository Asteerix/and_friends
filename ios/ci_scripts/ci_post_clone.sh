#!/bin/sh

# Script executed by Xcode Cloud after cloning the repository

echo "=== Starting ci_post_clone.sh ==="

# Navigate to ios directory
cd ios

# Install CocoaPods if not already installed
if ! command -v pod &> /dev/null; then
    echo "Installing CocoaPods..."
    sudo gem install cocoapods
fi

# Install Pods
echo "Installing CocoaPods dependencies..."
pod install --repo-update

echo "=== ci_post_clone.sh completed ==="