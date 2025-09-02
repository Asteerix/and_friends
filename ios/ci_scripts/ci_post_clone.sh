#!/bin/sh

# Script executed by Xcode Cloud after cloning the repository
set -e

echo "=== Xcode Cloud post-clone script starting ==="
echo "Current directory: $(pwd)"
echo "Ruby version: $(ruby -v)"

# Go to repository root
cd ../..
echo "Changed to repository root: $(pwd)"

# Install Node.js using Homebrew (Xcode Cloud has brew pre-installed)
echo "Installing Node.js..."
brew install node || true

echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Install Node dependencies (required for React Native/Expo)
echo "Installing Node dependencies..."
if [ -f "package-lock.json" ]; then
    echo "Found package-lock.json, running npm ci..."
    npm ci
elif [ -f "yarn.lock" ]; then
    echo "Found yarn.lock, installing yarn first..."
    npm install -g yarn
    yarn install --frozen-lockfile
else
    echo "No lock file found, running npm install..."
    npm install
fi

# Navigate to ios directory
cd ios
echo "Changed to ios directory: $(pwd)"

# Install CocoaPods if not already installed
if ! command -v pod >/dev/null 2>&1; then
    echo "CocoaPods not found, installing..."
    sudo gem install cocoapods
else
    echo "CocoaPods already installed: $(pod --version)"
fi

# Clean Pods directory but keep Podfile.lock
echo "Cleaning Pods directory..."
rm -rf Pods

# Run pod install
echo "Running pod install..."
pod install --repo-update

# Verify the critical files were created
echo "Verifying Pod installation..."
if [ -d "Pods/Target Support Files/Pods-friends" ]; then
    echo "✅ Pods-friends directory exists"
    
    if [ -f "Pods/Target Support Files/Pods-friends/Pods-friends.release.xcconfig" ]; then
        echo "✅ SUCCESS: Pods-friends.release.xcconfig found!"
    else
        echo "❌ ERROR: Pods-friends.release.xcconfig not found!"
        echo "Attempting pod deintegrate and reinstall..."
        pod deintegrate
        pod install --repo-update
        
        # Final check
        if [ -f "Pods/Target Support Files/Pods-friends/Pods-friends.release.xcconfig" ]; then
            echo "✅ SUCCESS: xcconfig created after retry!"
        else
            echo "❌ FATAL: Could not create required Pod configuration files"
            exit 1
        fi
    fi
else
    echo "❌ ERROR: Pods-friends directory not found!"
    echo "Contents of Pods/Target Support Files/:"
    ls -la "Pods/Target Support Files/" || true
    exit 1
fi

echo "=== post-clone script completed successfully ==="