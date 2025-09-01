#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# 1) Garantir un Node exécutable pour la phase Xcode
if command -v node >/dev/null 2>&1; then
  NODE="node"
elif [ -x "$HOME/.volta/bin/node" ]; then
  NODE="$HOME/.volta/bin/node"
elif [ -f ".nvmrc" ] && [ -x "$HOME/.nvm/versions/node/$(cat .nvmrc)/bin/node" ]; then
  NODE="$HOME/.nvm/versions/node/$(cat .nvmrc)/bin/node"
else
  echo "❌ Node introuvable pour la phase Xcode"; exit 1
fi
export NODE_BINARY="$NODE"
export RCT_NO_LAUNCH_PACKAGER=true

# 2) Réutiliser un bundle pré-généré par EAS s'il existe
PREBUNDLE_IOS="$ROOT_DIR/.expo/bundle-ios"
if [ -f "$PREBUNDLE_IOS/main.jsbundle" ]; then
  DEST="$CONFIGURATION_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH"
  mkdir -p "$DEST"
  cp -f "$PREBUNDLE_IOS/main.jsbundle" "$DEST/"
  rsync -a "$PREBUNDLE_IOS/assets/" "$DEST/" 2>/dev/null || true
  echo "✅ Bundle iOS pré-généré utilisé (.expo/bundle-ios)"
  exit 0
fi

# 3) Fallback: script officiel RN
bash "$ROOT_DIR/node_modules/react-native/scripts/react-native-xcode.sh"