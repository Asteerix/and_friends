#!/usr/bin/env bash
set -Eeuo pipefail

echo "=== Xcode Cloud post-clone (deterministic setup) ==="

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

# 1) Node 20 LTS via Homebrew (écrase Node 24 installé plus haut)
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
# Optionnel: forcer si nécessaire la version exacte
corepack prepare pnpm@9.12.1 --activate
pnpm -v

# 3) Install Node deps de manière figée
if [ ! -f "pnpm-lock.yaml" ]; then
  echo "ERREUR: pnpm-lock.yaml manquant. Générez-le et committez-le."; exit 1
fi
pnpm install --frozen-lockfile

# 4) CocoaPods via Bundler (version figée)
gem install bundler --no-document || true
bundle config set path 'vendor/bundle'
bundle install --jobs 4 --retry 3
cd ios
bundle exec pod repo update
bundle exec pod install

# 5) Sanity checks
test -f "Pods/Target Support Files/Pods-friends/Pods-friends.release.xcconfig"

echo "=== post-clone OK ==="