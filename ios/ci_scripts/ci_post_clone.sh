#!/usr/bin/env bash
set -euxo pipefail

echo "=== Xcode Cloud post-clone ==="
echo "PWD: $(pwd)"
echo "Xcode: $(xcodebuild -version || true)"
echo "Ruby: $(ruby -v || true)"
echo "Node: $(node -v || true)"
echo "NPM:  $(npm -v  || true)"

# Dépendances JS (au besoin adapte au lockfile présent)
if [ -f package-lock.json ]; then
  npm ci
elif [ -f yarn.lock ]; then
  yarn install --frozen-lockfile
elif [ -f pnpm-lock.yaml ]; then
  pnpm install --frozen-lockfile
fi

# Bundler local (sans sudo) + installation des gems du Gemfile racine
gem install --user-install bundler -N
export GEM_HOME="$HOME/.gem"
export PATH="$GEM_HOME/bin:$PATH"
bundle config set path 'vendor/bundle'
bundle install --jobs 4 --retry 3

# CocoaPods dans ios/
pushd ios

# Nettoyage minimal sans toucher au Podfile.lock (source de vérité)
rm -rf Pods

# Résolution + génération des xcconfig
BUNDLE_GEMFILE="../Gemfile" bundle exec pod install --repo-update --verbose

# Sanity check: les fichiers Pods-*.xcconfig doivent exister
ls -la "Pods/Target Support Files" || true
test -f Pods/Target\ Support\ Files/Pods-*/Pods-*.release.xcconfig

popd
echo "=== post-clone OK ==="