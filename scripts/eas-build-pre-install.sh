#!/usr/bin/env bash

echo "=== EAS Build Pre-Install Script ==="

# Vérifier si on est sur une plateforme iOS
if [[ "$EAS_BUILD_PLATFORM" == "ios" ]]; then
    echo "Running iOS pre-install script..."
    
    # Naviguer vers le dossier iOS
    cd ios
    
    # Installer les pods
    echo "Installing CocoaPods dependencies..."
    
    # Sur EAS, utiliser l'option --deployment pour une installation plus stable
    pod install --repo-update --deployment
    
    # Vérifier que l'installation s'est bien passée
    if [ $? -eq 0 ]; then
        echo "CocoaPods installation successful"
        
        # Afficher le contenu du dossier Pods pour vérification
        echo "Pods directory content:"
        ls -la Pods/ | head -20
    else
        echo "CocoaPods installation failed"
        exit 1
    fi
    
    cd ..
else
    echo "Skipping iOS pre-install for platform: $EAS_BUILD_PLATFORM"
fi

echo "=== Pre-Install Script Complete ==="