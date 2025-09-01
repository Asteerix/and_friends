#!/bin/sh

# Script de post-clone pour Xcode Cloud
# Ce script est exécuté après que Xcode Cloud ait cloné le repository

set -e

echo "=== Xcode Cloud Post-Clone Script Starting ==="
echo "Current directory: $(pwd)"
echo "Repository root: $CI_WORKSPACE"
echo "iOS directory check:"
ls -la

# S'assurer qu'on est dans le bon répertoire
if [ -n "$CI_WORKSPACE" ]; then
    cd "$CI_WORKSPACE"
fi

# Vérifier la présence du dossier iOS
if [ ! -d "ios" ]; then
    echo "❌ iOS directory not found!"
    echo "Current location: $(pwd)"
    echo "Directory contents:"
    ls -la
    exit 1
fi

# Naviguer vers le dossier iOS
cd ios
echo "Changed to iOS directory: $(pwd)"

# Vérifier la présence du Podfile
if [ ! -f "Podfile" ]; then
    echo "❌ Podfile not found in iOS directory!"
    echo "iOS directory contents:"
    ls -la
    exit 1
fi

# Installer CocoaPods si nécessaire
echo "Checking for CocoaPods..."
if ! command -v pod &> /dev/null; then
    echo "CocoaPods not found, installing..."
    sudo gem install cocoapods
fi

echo "Installing CocoaPods dependencies..."
pod install --repo-update

# Vérifier que l'installation s'est bien passée
if [ $? -eq 0 ]; then
    echo "✅ CocoaPods installation successful"
    echo "Contents of Pods directory:"
    ls -la Pods/ 2>/dev/null | head -20 || echo "Pods directory not yet created"
    
    # Vérifier les fichiers xcconfig
    echo "Checking for xcconfig files:"
    find . -name "*.xcconfig" -type f | head -10
else
    echo "❌ CocoaPods installation failed"
    exit 1
fi

echo "=== Post-Clone Script Complete ==="