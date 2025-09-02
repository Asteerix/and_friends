#!/bin/sh

# Script executed by Xcode Cloud after cloning the repository

echo "=== Starting ci_post_clone.sh ==="
echo "Current directory: $(pwd)"
echo "Repository structure:"
ls -la

# First, install Node dependencies (required for Expo/React Native Podfile)
echo "Installing Node dependencies..."
npm ci || npm install

# Now navigate to ios directory for Pod installation
cd ios
echo "Changed to directory: $(pwd)"
echo "iOS directory contents:"
ls -la

# Check if Podfile.lock exists
if [ -f "Podfile.lock" ]; then
    echo "Podfile.lock found"
else
    echo "WARNING: Podfile.lock not found"
fi

# Install CocoaPods if needed
echo "Checking for CocoaPods..."
if ! command -v pod &> /dev/null; then
    echo "CocoaPods not found, installing..."
    sudo gem install cocoapods
else
    echo "CocoaPods already installed: $(pod --version)"
fi

# Run pod install with the existing Podfile.lock
echo "Running pod install..."
pod install --deployment --verbose

# Verify the installation
echo "Verifying Pods installation..."
if [ -d "Pods" ]; then
    echo "✅ Pods directory exists"
    echo "Pods directory structure:"
    ls -la Pods/
    
    if [ -d "Pods/Target Support Files/Pods-friends" ]; then
        echo "✅ Pods-friends directory exists"
        ls -la "Pods/Target Support Files/Pods-friends/"
    else
        echo "❌ ERROR: Pods-friends directory not found!"
    fi
else
    echo "❌ ERROR: Pods directory was not created!"
fi

echo "=== ci_post_clone.sh completed ==="