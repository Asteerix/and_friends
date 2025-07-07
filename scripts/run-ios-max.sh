#!/bin/bash

# UUID spécifique de l'iPhone 16 Pro Max
SIMULATOR_UUID="7B0FF581-0C22-497C-B237-20810A8059F3"
SIMULATOR_NAME="iPhone 16 Pro Max"

echo "Build et lancement sur iPhone 16 Pro Max"

# Utiliser expo run:ios avec le simulateur spécifique
pnpm expo run:ios --simulator "$SIMULATOR_NAME" --clear