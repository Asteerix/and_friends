#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Metro: pas de packager, pas de cache qui fuit en CI
export RCT_NO_LAUNCH_PACKAGER=1
export EXPO_NO_CACHE=1
export NODE_OPTIONS=--max_old_space_size=4096

# Vérification Pods
test -f "Pods/Target Support Files/Pods-friends/Pods-friends.release.xcconfig" || {
  echo "xcconfig Release introuvable"; exit 1;
}

echo "=== pre-xcodebuild OK ==="