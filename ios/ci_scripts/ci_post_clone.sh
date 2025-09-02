#!/usr/bin/env bash
set -Eeuo pipefail

echo "=== Xcode Cloud post-clone (deterministic setup) ==="

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

# 1) Node 20 LTS via Homebrew
if brew list node@20 >/dev/null 2>&1; then
  echo "node@20 déjà présent"
else
  brew install node@20
fi
brew unlink node || true
brew link --overwrite --force node@20
export PATH="/usr/local/opt/node@20/bin:$PATH"
node -v
npm -v || true

# 2) Corepack + pnpm (version figée par packageManager)
corepack enable
corepack prepare pnpm@9.12.1 --activate
pnpm -v

# 3) Install Node deps de manière figée
if [ ! -f "pnpm-lock.yaml" ]; then
  echo "ERREUR: pnpm-lock.yaml manquant. Générez-le et committez-le."; exit 1
fi
pnpm install --frozen-lockfile

# 4) CocoaPods directement (sans Bundler pour éviter les conflits Ruby 2.6)
cd ios
echo "Installing CocoaPods..."
sudo gem install cocoapods -v 1.16.2

# Clean and install pods
echo "Cleaning Pods directory..."
rm -rf Pods
echo "Running pod install..."
pod install --repo-update

# 5) Sanity checks
test -f "Pods/Target Support Files/Pods-friends/Pods-friends.release.xcconfig"

echo "=== post-clone OK ==="