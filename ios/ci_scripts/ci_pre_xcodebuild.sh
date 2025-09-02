#!/usr/bin/env bash
set -euxo pipefail

# Script is run from ios/ci_scripts, we need to check in parent directory
cd ..
test -f "Pods/Target Support Files/Pods-friends/Pods-friends.release.xcconfig"