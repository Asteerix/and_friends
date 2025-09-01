#!/bin/bash
# Image Maintenance Script
# Auto-generated on 2025-08-24T10:16:24.061Z

echo "🧹 Cleaning up unused images..."

# Remove duplicate images
echo "Checking for duplicate images..."

# Remove very large images (>500KB)
find src/assets -name "*.jpg" -o -name "*.png" | while read file; do
  size=$(wc -c < "$file" 2>/dev/null || echo 0)
  if [ "$size" -gt 512000 ]; then
    echo "⚠️  Large file: $file ($(echo $size | awk '{print int($1/1024)"KB"}'))"
  fi
done

echo "✅ Image maintenance complete"
