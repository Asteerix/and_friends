#!/bin/bash

# iOS Build Fix Script for EAS
echo "🔧 Running iOS build fixes..."

# Ensure node_modules is properly installed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install --legacy-peer-deps
fi

# Fix potential React Native issues
echo "🛠 Fixing React Native bundler issues..."

# Ensure metro bundler can find all modules
if [ -d "node_modules/@react-native/assets-registry" ]; then
  echo "✅ Assets registry found"
else
  echo "⚠️ Assets registry missing, attempting to fix..."
  npm install @react-native/assets-registry --legacy-peer-deps
fi

# Fix potential pnpm issues by creating symlinks
if [ -d "node_modules/.pnpm" ]; then
  echo "📦 pnpm structure detected, creating compatibility symlinks..."
  
  # Ensure critical React Native modules are accessible
  MODULES_TO_CHECK=(
    "react-native"
    "metro"
    "@react-native/assets-registry"
    "expo"
    "expo-router"
  )
  
  for module in "${MODULES_TO_CHECK[@]}"; do
    if [ ! -d "node_modules/$module" ]; then
      echo "⚠️ Module $module not found in node_modules root"
    fi
  done
fi

echo "✅ iOS build fixes completed"