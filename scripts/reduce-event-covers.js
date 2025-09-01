#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function log(message, color = 'reset') {
  const colors = {
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
  };
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatBytes(bytes) {
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileSize(filepath) {
  try {
    return fs.statSync(filepath).size;
  } catch {
    return 0;
  }
}

async function main() {
  log('🎨 Event Cover Optimization for TestFlight', 'bold');
  log('==========================================', 'blue');
  
  const eventCoversPath = path.join(process.cwd(), 'src/assets/images/event-covers');
  
  if (!fs.existsSync(eventCoversPath)) {
    log('❌ Event covers directory not found!', 'red');
    return;
  }
  
  const categories = fs.readdirSync(eventCoversPath, { withFileTypes: true })
    .filter(item => item.isDirectory());
  
  log(`📁 Found ${categories.length} categories`, 'blue');
  
  let totalRemoved = 0;
  let totalSaved = 0;
  
  // Keep only best 3 images per category (smallest files)
  const KEEP_PER_CATEGORY = 3;
  
  for (const category of categories) {
    const categoryPath = path.join(eventCoversPath, category.name);
    const imageFiles = fs.readdirSync(categoryPath)
      .filter(file => /\.(jpg|jpeg|png)$/i.test(file))
      .map(file => ({
        name: file,
        path: path.join(categoryPath, file),
        size: getFileSize(path.join(categoryPath, file))
      }))
      .sort((a, b) => a.size - b.size); // Sort by size, smallest first
    
    if (imageFiles.length <= KEEP_PER_CATEGORY) {
      log(`  ✅ ${category.name}: keeping all ${imageFiles.length} images`, 'green');
      continue;
    }
    
    // Keep the 3 smallest images, remove the rest
    const toKeep = imageFiles.slice(0, KEEP_PER_CATEGORY);
    const toRemove = imageFiles.slice(KEEP_PER_CATEGORY);
    
    let categorySpaceSaved = 0;
    
    log(`  🗂️  ${category.name}: ${imageFiles.length} images`, 'blue');
    log(`    📌 Keeping:`, 'green');
    toKeep.forEach(img => {
      log(`       - ${img.name} (${formatBytes(img.size)})`, 'green');
    });
    
    log(`    🗑️  Removing:`, 'red');
    toRemove.forEach(img => {
      log(`       - ${img.name} (${formatBytes(img.size)})`, 'red');
      
      // Create backup directory
      const backupDir = path.join(categoryPath, '_backup');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
      }
      
      // Move to backup instead of deleting
      const backupPath = path.join(backupDir, img.name);
      fs.renameSync(img.path, backupPath);
      
      categorySpaceSaved += img.size;
      totalRemoved++;
    });
    
    log(`    💾 Space saved: ${formatBytes(categorySpaceSaved)}`, 'yellow');
    totalSaved += categorySpaceSaved;
  }
  
  log('\n📊 Optimization Results:', 'bold');
  log(`   Images moved to backup: ${totalRemoved}`, 'blue');
  log(`   Space saved: ${formatBytes(totalSaved)}`, 'green');
  log(`   Images backed up to _backup folders`, 'yellow');
  
  // Create restore script
  const restoreScript = `#!/bin/bash
# Restore Event Cover Images
# Generated on ${new Date().toISOString()}

echo "🔄 Restoring event cover images from backup..."

find src/assets/images/event-covers -name "_backup" -type d | while read backup_dir; do
  category_dir=$(dirname "$backup_dir")
  category_name=$(basename "$category_dir")
  
  echo "Restoring $category_name..."
  mv "$backup_dir"/* "$category_dir"/ 2>/dev/null
  rmdir "$backup_dir" 2>/dev/null
done

echo "✅ All images restored"
`;
  
  fs.writeFileSync('restore-event-covers.sh', restoreScript);
  fs.chmodSync('restore-event-covers.sh', '755');
  
  log('\n📝 Created restore-event-covers.sh to undo changes', 'green');
  
  // Update component to use fewer images
  const componentUpdateNote = `
// Update your event cover components to work with 3 images per category
// Example: Instead of random selection from many images, cycle through the 3 optimized ones

// Before:
// const covers = [...manyImages] 
// const randomCover = covers[Math.floor(Math.random() * covers.length)]

// After: 
// const covers = [image1, image2, image3] // Only 3 per category
// const cover = covers[eventId % covers.length] // Cycle through them
`;
  
  fs.writeFileSync('event-cover-optimization-notes.txt', componentUpdateNote);
  
  if (totalSaved > 2 * 1024 * 1024) { // 2MB
    log('\n🎉 Excellent! Major space savings achieved!', 'green');
  } else if (totalSaved > 500 * 1024) { // 500KB
    log('\n👍 Good progress on reducing image size', 'green');
  }
  
  log('\n⚠️  IMPORTANT:', 'yellow');
  log('   - Images are backed up in _backup folders', 'blue');
  log('   - Run ./restore-event-covers.sh to undo changes', 'blue');
  log('   - Update your components to work with fewer images per category', 'blue');
  
  // Final size check
  const finalCheck = `
echo "📊 Final size check..."
find src/assets -name "*.jpg" -o -name "*.png" -o -name "*.jpeg" | xargs du -ch | tail -1
`;
  
  log('\n🔍 Run this to check final size:', 'blue');
  log('find src/assets -name "*.jpg" -o -name "*.png" -o -name "*.jpeg" | xargs du -ch | tail -1', 'yellow');
}

if (require.main === module) {
  main().catch(console.error);
}