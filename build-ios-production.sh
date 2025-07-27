#!/bin/bash

echo "🧹 Nettoyage du projet..."
cd ios
rm -rf build/
rm -rf ~/Library/Developer/Xcode/DerivedData/friends-*

echo "📦 Installation des pods..."
pod install

echo "🏗️ Build pour production..."
cd ..

echo "✅ Prêt pour Archive dans Xcode!"
echo ""
echo "Maintenant :"
echo "1. Ouvrez Xcode"
echo "2. Product → Clean Build Folder (⇧⌘K)"
echo "3. Product → Archive"
echo "4. Distribute App"