#!/bin/sh

# Script de pre-xcodebuild pour Xcode Cloud
# Ce script est exécuté juste avant xcodebuild

set -e

echo "=== Xcode Cloud Pre-XcodeBuild Script Starting ==="
echo "Current directory: $(pwd)"
echo "Repository root: $CI_WORKSPACE"

# S'assurer qu'on est dans le bon répertoire
if [ -n "$CI_WORKSPACE" ]; then
    cd "$CI_WORKSPACE"
fi

# Vérifier et installer les Pods si nécessaire
if [ -d "ios" ]; then
    cd ios
    echo "In iOS directory: $(pwd)"
    
    # Vérifier si les Pods sont déjà installés
    if [ ! -d "Pods" ] || [ ! -f "Pods/Target Support Files/Pods-friends/Pods-friends.release.xcconfig" ]; then
        echo "Pods not found or incomplete, installing..."
        
        # Installer CocoaPods si nécessaire
        if ! command -v pod &> /dev/null; then
            echo "Installing CocoaPods..."
            sudo gem install cocoapods
        fi
        
        # Installer les dépendances
        pod install --repo-update
        
        if [ $? -eq 0 ]; then
            echo "✅ Pod installation successful"
        else
            echo "❌ Pod installation failed"
            exit 1
        fi
    else
        echo "✅ Pods already installed"
    fi
    
    # Vérifier que les fichiers xcconfig existent
    if [ -f "Pods/Target Support Files/Pods-friends/Pods-friends.release.xcconfig" ]; then
        echo "✅ Required xcconfig file found"
    else
        echo "❌ Required xcconfig file not found after installation"
        echo "Contents of Pods directory:"
        find Pods -name "*.xcconfig" -type f 2>/dev/null | head -20
        exit 1
    fi
else
    echo "⚠️ iOS directory not found, skipping Pod installation"
fi

echo "=== Pre-XcodeBuild Script Complete ==="