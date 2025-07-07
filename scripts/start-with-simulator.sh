#!/bin/bash

# Nom du simulateur à utiliser
SIMULATOR_NAME="iPhone 16 Pro"

# Obtenir l'UUID du simulateur
SIMULATOR_UUID=$(xcrun simctl list devices available | grep "$SIMULATOR_NAME" | grep -o '[0-9A-F-]\{36\}' | head -1)

if [ -z "$SIMULATOR_UUID" ]; then
    echo "Simulateur '$SIMULATOR_NAME' non trouvé"
    exit 1
fi

# Démarrer le simulateur s'il n'est pas déjà en cours d'exécution
xcrun simctl boot "$SIMULATOR_UUID" 2>/dev/null || true

# Ouvrir le simulateur
open -a Simulator --args -CurrentDeviceUDID "$SIMULATOR_UUID"

# Attendre que le simulateur soit prêt
sleep 3

# Lancer Expo avec les options spécifiées
pnpm expo start -c --reset-cache --ios