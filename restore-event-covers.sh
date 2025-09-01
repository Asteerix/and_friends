#!/bin/bash
# Restore Event Cover Images
# Generated on 2025-08-24T10:17:15.833Z

echo "🔄 Restoring event cover images from backup..."

find src/assets/images/event-covers -name "_backup" -type d | while read backup_dir; do
  category_dir=$(dirname "$backup_dir")
  category_name=$(basename "$category_dir")
  
  echo "Restoring $category_name..."
  mv "$backup_dir"/* "$category_dir"/ 2>/dev/null
  rmdir "$backup_dir" 2>/dev/null
done

echo "✅ All images restored"
