#!/bin/bash

# Script optimisé pour forcer l'utilisation de l'iPhone 16 Pro Max

DEVICE_NAME="iPhone 16 Pro Max"
DEVICE_UUID="7B0FF581-0C22-497C-B237-20810A8059F3"

# Méthode 1 : Utiliser expo run:ios (compile et lance)
echo "Méthode 1: Compilation native (plus lent mais plus fiable)"
echo "Commande: pnpm expo run:ios --device \"$DEVICE_NAME\""
echo ""

# Méthode 2 : Avec les variables d'environnement
echo "Méthode 2: Expo Start avec variables (plus rapide)"
echo "Lancement..."

# S'assurer que le simulateur est ouvert
xcrun simctl boot "$DEVICE_UUID" 2>/dev/null || true

# Ouvrir directement sur le bon simulateur
open -a Simulator --args -CurrentDeviceUDID "$DEVICE_UUID"

# Attendre un peu
sleep 2

# Lancer Expo avec toutes les variables possibles
EXPO_APPLE_DEVICE_NAME="$DEVICE_NAME" \
EXPO_APPLE_DEVICE_ID="$DEVICE_UUID" \
EXPO_IOS_SIMULATOR_DEVICE="$DEVICE_UUID" \
pnpm expo start --ios --clear