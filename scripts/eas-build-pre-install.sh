#!/usr/bin/env bash

echo "=== EAS Build Pre-Install Script ==="

# Naviguer vers le dossier iOS
cd ios

# Installer les pods
echo "Installing CocoaPods dependencies..."
pod install --repo-update

# Vérifier que l'installation s'est bien passée
if [ $? -eq 0 ]; then
    echo "CocoaPods installation successful"
else
    echo "CocoaPods installation failed"
    exit 1
fi

# Afficher le contenu du dossier Pods pour vérification
echo "Pods directory content:"
ls -la Pods/

echo "=== Pre-Install Script Complete ==="