#!/bin/bash

# Nom du simulateur souhaité (modifiez selon vos besoins)
SIMULATOR_NAME="iPhone 16 Pro Max"

# Trouver l'UUID du simulateur
SIMULATOR_UUID=$(xcrun simctl list devices | grep "$SIMULATOR_NAME" | grep -E -o '[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}' | head -1)

if [ -z "$SIMULATOR_UUID" ]; then
    echo "Simulateur '$SIMULATOR_NAME' non trouvé"
    echo "Simulateurs disponibles:"
    xcrun simctl list devices | grep -E "iPhone|iPad"
    exit 1
fi

echo "Utilisation du simulateur: $SIMULATOR_NAME ($SIMULATOR_UUID)"

# Démarrer le simulateur s'il n'est pas déjà ouvert
xcrun simctl boot "$SIMULATOR_UUID" 2>/dev/null || echo "Simulateur déjà démarré"

# Ouvrir l'app Simulator
open -a Simulator

# Attendre que le simulateur soit prêt
sleep 2

# Lancer Expo avec les options
EXPO_IOS_SIMULATOR_DEVICE="$SIMULATOR_UUID" pnpm expo start -c --reset-cache --ios