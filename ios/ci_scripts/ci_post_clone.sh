#!/bin/sh

# Xcode Cloud CI Post-Clone Script
# This script runs after Xcode Cloud clones the repository
# Location: ios/ci_scripts/ci_post_clone.sh

echo "=== Xcode Cloud Post-Clone Script Starting ==="
echo "Current directory: $(pwd)"
echo "CI Workspace: $CI_WORKSPACE"
echo "Contents of current directory:"
ls -la

# Change to workspace root (repository root)
if [ -n "$CI_WORKSPACE" ]; then
    echo "Changing to CI_WORKSPACE: $CI_WORKSPACE"
    cd "$CI_WORKSPACE" || exit 1
    echo "Now in: $(pwd)"
    echo "Contents:"
    ls -la
else
    echo "CI_WORKSPACE not set, trying to navigate up"
    cd ../.. || exit 1
    echo "Now in: $(pwd)"
fi

# Check if we're in the right place
if [ ! -f "package.json" ]; then
    echo "ERROR: package.json not found in $(pwd)"
    echo "Looking for package.json..."
    find . -name "package.json" -maxdepth 3
    exit 1
fi

# Install Node.js if not present
echo "Checking for Node.js..."
if ! command -v node > /dev/null 2>&1; then
    echo "Node.js not found, installing..."
    export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
    brew install node@18
    export PATH="/usr/local/opt/node@18/bin:$PATH"
else
    echo "Node.js found: $(node --version)"
fi

# Install Yarn if not present
echo "Checking for Yarn..."
if ! command -v yarn > /dev/null 2>&1; then
    echo "Yarn not found, installing..."
    npm install -g yarn
else
    echo "Yarn found: $(yarn --version)"
fi

# Install JavaScript dependencies
echo "Installing JavaScript dependencies..."
yarn install || npm install

# Navigate to iOS directory
echo "Navigating to iOS directory..."
cd ios || exit 1
echo "Now in iOS directory: $(pwd)"

# Install CocoaPods if not present
echo "Checking for CocoaPods..."
if ! command -v pod > /dev/null 2>&1; then
    echo "CocoaPods not found, installing..."
    sudo gem install cocoapods
else
    echo "CocoaPods found: $(pod --version)"
fi

# Install CocoaPods dependencies
echo "Running pod install..."
pod install

# Verify Pod installation
if [ -d "Pods" ]; then
    echo "✅ Pods directory created successfully"
    
    # Check for the specific xcconfig file that was missing
    if [ -f "Pods/Target Support Files/Pods-friends/Pods-friends.release.xcconfig" ]; then
        echo "✅ Required xcconfig file exists"
    else
        echo "⚠️ Warning: Expected xcconfig file not found"
        echo "Listing available xcconfig files:"
        find Pods -name "*.xcconfig" -type f 2>/dev/null | head -20
    fi
else
    echo "❌ ERROR: Pods directory not created"
    exit 1
fi

echo "=== Post-Clone Script Completed Successfully ==="