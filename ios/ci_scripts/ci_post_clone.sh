#!/bin/sh
set -e

cd ../..

# Node est déjà installé par Xcode Cloud
npm install

cd ios

# CocoaPods est déjà installé par Xcode Cloud
pod install

echo "✅ post-clone OK"