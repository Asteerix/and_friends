#!/bin/sh

# Script executed by Xcode Cloud after cloning the repository

set -e  # Exit on error

echo "=== Starting ci_post_clone.sh ==="
echo "Current directory: $(pwd)"

# Navigate to the correct directory
# Xcode Cloud runs this from the repository root
cd ios

echo "Changed to directory: $(pwd)"
echo "Contents of ios directory:"
ls -la

# Check if Podfile exists
if [ ! -f "Podfile" ]; then
    echo "ERROR: Podfile not found!"
    exit 1
fi

echo "Podfile found. Installing CocoaPods..."

# Install CocoaPods using gem
export GEM_HOME=$HOME/.gem
export PATH=$GEM_HOME/bin:$PATH

gem install cocoapods --user-install

# Verify pod is available
which pod
pod --version

# Clean any existing Pods directory
echo "Cleaning old Pods directory if exists..."
rm -rf Pods
rm -f Podfile.lock

# Install Pods with verbose output
echo "Installing CocoaPods dependencies..."
pod install --verbose

# Verify installation
echo "Verifying Pods installation..."
if [ -d "Pods" ]; then
    echo "Pods directory created successfully"
    echo "Contents of Pods/Target Support Files:"
    ls -la "Pods/Target Support Files/"
    
    if [ -f "Pods/Target Support Files/Pods-friends/Pods-friends.release.xcconfig" ]; then
        echo "SUCCESS: Pods-friends.release.xcconfig found!"
    else
        echo "ERROR: Pods-friends.release.xcconfig not found!"
        exit 1
    fi
else
    echo "ERROR: Pods directory was not created!"
    exit 1
fi

echo "=== ci_post_clone.sh completed successfully ==="