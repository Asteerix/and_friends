#!/bin/sh

# Script de post-clone pour Xcode Cloud
# Ce script est exécuté après que Xcode Cloud ait cloné le repository

echo "=== Xcode Cloud Post-Clone Script ==="
echo "Current directory: $(pwd)"

# Naviguer vers le dossier iOS
cd ios

# Installer CocoaPods si nécessaire
echo "Installing CocoaPods dependencies..."
pod install --repo-update

# Vérifier que l'installation s'est bien passée
if [ $? -eq 0 ]; then
    echo "✅ CocoaPods installation successful"
    echo "Contents of Pods directory:"
    ls -la Pods/ | head -20
else
    echo "❌ CocoaPods installation failed"
    exit 1
fi

echo "=== Post-Clone Script Complete ==="