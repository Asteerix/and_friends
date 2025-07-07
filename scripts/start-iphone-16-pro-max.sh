#!/bin/bash

# UUID spécifique de l'iPhone 16 Pro Max
SIMULATOR_UUID="7B0FF581-0C22-497C-B237-20810A8059F3"
SIMULATOR_NAME="iPhone 16 Pro Max"

echo "Lancement sur iPhone 16 Pro Max (UUID: $SIMULATOR_UUID)"

# Vérifier que le simulateur existe
if ! xcrun simctl list devices | grep -q "$SIMULATOR_UUID"; then
    echo "Erreur: Simulateur avec UUID $SIMULATOR_UUID non trouvé"
    exit 1
fi

# Fermer tous les autres simulateurs iOS
echo "Fermeture des autres simulateurs..."
xcrun simctl list devices | grep "Booted" | grep -v "$SIMULATOR_UUID" | grep -E -o '[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}' | while read uuid; do
    xcrun simctl shutdown "$uuid" 2>/dev/null
done

# Démarrer le simulateur cible
xcrun simctl boot "$SIMULATOR_UUID" 2>/dev/null || echo "Simulateur déjà démarré"

# Définir comme simulateur par défaut
defaults write com.apple.iphonesimulator CurrentDeviceUDID "$SIMULATOR_UUID"

# Ouvrir l'app Simulator et focus sur le bon device
open -a Simulator --args -CurrentDeviceUDID "$SIMULATOR_UUID"

# Attendre que le simulateur soit prêt
sleep 3

# Lancer Expo avec toutes les variables possibles
export EXPO_IOS_SIMULATOR_DEVICE="$SIMULATOR_UUID"
export EXPO_SIMULATOR_DEVICE="$SIMULATOR_NAME"
export REACT_NATIVE_PACKAGER_HOSTNAME=$(ipconfig getifaddr en0 || echo "localhost")

pnpm expo start -c --reset-cache