#!/bin/sh

# Xcode Cloud CI Post-Clone Script
# This script runs after Xcode Cloud clones the repository
# Location: ios/ci_scripts/ci_post_clone.sh

set -e

echo "=== Xcode Cloud Post-Clone Script Starting ==="
echo "Current directory: $(pwd)"
echo "CI Workspace: $CI_WORKSPACE"

# Change to workspace root (repository root)
cd "$CI_WORKSPACE"
echo "Changed to workspace root: $(pwd)"

# Install Homebrew dependencies
echo "Installing dependencies via Homebrew..."
export HOMEBREW_NO_INSTALL_CLEANUP=TRUE

# Install CocoaPods
echo "Installing CocoaPods..."
brew install cocoapods || echo "CocoaPods may already be installed"

# Install Node.js (version 18 for compatibility)
echo "Installing Node.js..."
brew install node@18 || echo "Node.js may already be installed"

# Link Node.js
brew link --overwrite node@18 || echo "Node.js already linked"

# Add Node to PATH
export PATH="/usr/local/opt/node@18/bin:$PATH"

# Install Yarn
echo "Installing Yarn..."
brew install yarn || echo "Yarn may already be installed"

# Verify installations
echo "Verifying installations..."
echo "Node version: $(node --version)"
echo "Yarn version: $(yarn --version)"
echo "Pod version: $(pod --version)"

# Install JavaScript dependencies
echo "Installing JavaScript dependencies..."
yarn install

# Navigate to iOS directory
cd ios
echo "Changed to iOS directory: $(pwd)"

# Clean any previous pod installations
echo "Cleaning previous Pod installations..."
rm -rf Pods
rm -f Podfile.lock

# Install CocoaPods dependencies
echo "Installing CocoaPods dependencies..."
pod install --repo-update

# Verify Pod installation
if [ -d "Pods" ]; then
    echo "✅ Pods directory created successfully"
    
    # Check for the specific xcconfig file that was missing
    if [ -f "Pods/Target Support Files/Pods-friends/Pods-friends.release.xcconfig" ]; then
        echo "✅ Required xcconfig file exists"
    else
        echo "⚠️ Warning: Expected xcconfig file not found"
        echo "Listing available xcconfig files:"
        find Pods -name "*.xcconfig" -type f | head -20
    fi
else
    echo "❌ Pods directory not created - installation may have failed"
    exit 1
fi

echo "=== Post-Clone Script Complete ==="