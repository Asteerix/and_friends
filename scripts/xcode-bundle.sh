#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# Source les fichiers d'environnement Xcode
if [[ -f "$ROOT_DIR/ios/.xcode.env" ]]; then
  source "$ROOT_DIR/ios/.xcode.env"
fi
if [[ -f "$ROOT_DIR/ios/.xcode.env.local" ]]; then
  source "$ROOT_DIR/ios/.xcode.env.local"
fi

# 1) Garantir un Node exécutable pour la phase Xcode
if [ -n "${NODE_BINARY:-}" ] && [ -x "$NODE_BINARY" ]; then
  NODE="$NODE_BINARY"
elif command -v node >/dev/null 2>&1; then
  NODE="node"
elif [ -x "/usr/local/bin/node" ]; then
  NODE="/usr/local/bin/node"
elif [ -x "/opt/homebrew/bin/node" ]; then
  NODE="/opt/homebrew/bin/node"
elif [ -x "$HOME/.volta/bin/node" ]; then
  NODE="$HOME/.volta/bin/node"
elif [ -f ".nvmrc" ] && [ -x "$HOME/.nvm/versions/node/$(cat .nvmrc)/bin/node" ]; then
  NODE="$HOME/.nvm/versions/node/$(cat .nvmrc)/bin/node"
else
  echo "❌ Node introuvable pour la phase Xcode"; exit 1
fi
export NODE_BINARY="$NODE"
export RCT_NO_LAUNCH_PACKAGER=true

# Définir les variables d'environnement nécessaires pour Expo
export PROJECT_ROOT="$ROOT_DIR"
if [[ -z "${ENTRY_FILE:-}" ]]; then
  export ENTRY_FILE="$($NODE -e "require('expo/scripts/resolveAppEntry')" "$PROJECT_ROOT" ios absolute | tail -n 1)"
fi
if [[ -z "${CLI_PATH:-}" ]]; then
  export CLI_PATH="$($NODE --print "require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] })")"
fi
if [[ -z "${BUNDLE_COMMAND:-}" ]]; then
  export BUNDLE_COMMAND="export:embed"
fi

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