#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Large images that need immediate compression
const LARGE_IMAGES_TO_COMPRESS = [
  'src/assets/images/event-covers/casual/weekend-brunch.jpg',
  'src/assets/images/event-covers/dining/food-festival.jpg', 
  'src/assets/images/event-covers/outdoor/bbq-party.jpg',
  'src/assets/images/event-covers/nightlife/latin-night.jpg',
  'src/assets/images/event-covers/nightlife/ladies-night.jpg',
  'src/assets/images/event-covers/nightlife/bottle-service.jpg',
  'src/assets/default_avatar.png',
  'src/assets/images/event-covers/wedding/garden-wedding.jpg',
  'src/assets/images/event-covers/casual/after-work.jpg',
  'src/assets/images/event-covers/dining/cheese-wine.jpg'
];

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
  if (bytes === 0) return '0 B';
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

function compressImageWithSips(inputPath, outputPath, quality = 70, maxWidth = 1200) {
  try {
    // macOS sips command for image compression
    execSync(`sips -Z ${maxWidth} -s format jpeg -s formatOptions ${quality} "${inputPath}" --out "${outputPath}"`, 
      { stdio: 'pipe' });
    return true;
  } catch (error) {
    log(`Error compressing ${inputPath}: ${error.message}`, 'red');
    return false;
  }
}

function createWebPVersion(inputPath) {
  const webpPath = inputPath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  try {
    // Try using cwebp if available
    execSync(`which cwebp`, { stdio: 'ignore' });
    execSync(`cwebp -q 80 "${inputPath}" -o "${webpPath}"`, { stdio: 'pipe' });
    log(`  ✅ Created WebP version: ${path.basename(webpPath)}`, 'green');
    return webpPath;
  } catch {
    return null;
  }
}

function optimizeImage(imagePath) {
  if (!fs.existsSync(imagePath)) {
    log(`❌ File not found: ${imagePath}`, 'red');
    return { success: false };
  }

  const originalSize = getFileSize(imagePath);
  const tempPath = imagePath + '.temp';
  
  log(`🔧 Optimizing: ${path.basename(imagePath)} (${formatBytes(originalSize)})`, 'blue');
  
  let success = false;
  let finalSize = originalSize;
  
  // Try different compression methods
  if (imagePath.endsWith('.png') && originalSize > 200 * 1024) {
    // For large PNGs, convert to JPEG
    const jpegPath = imagePath.replace('.png', '.jpg');
    success = compressImageWithSips(imagePath, jpegPath, 85, 1200);
    if (success) {
      finalSize = getFileSize(jpegPath);
      log(`  📝 Converted PNG to JPEG: ${formatBytes(finalSize)}`, 'yellow');
    }
  } else {
    // Compress in place
    success = compressImageWithSips(imagePath, tempPath, 80, 1200);
    if (success) {
      finalSize = getFileSize(tempPath);
      if (finalSize < originalSize) {
        fs.renameSync(tempPath, imagePath);
      } else {
        fs.unlinkSync(tempPath);
        success = false;
      }
    }
  }
  
  // Try creating WebP version
  const webpPath = createWebPVersion(imagePath);
  
  const savings = originalSize - finalSize;
  const savingsPercent = Math.round((savings / originalSize) * 100);
  
  if (success && savings > 0) {
    log(`  ✅ Saved ${formatBytes(savings)} (${savingsPercent}%)`, 'green');
  }
  
  return {
    success,
    originalSize,
    finalSize,
    savings,
    savingsPercent,
    webpCreated: !!webpPath
  };
}

async function main() {
  log('🚀 Emergency Image Compression for TestFlight', 'bold');
  log('============================================', 'blue');
  
  const results = [];
  let totalSavings = 0;
  let totalOriginal = 0;
  
  for (const imagePath of LARGE_IMAGES_TO_COMPRESS) {
    const fullPath = path.join(process.cwd(), imagePath);
    const result = optimizeImage(fullPath);
    
    if (result.success) {
      results.push({ path: imagePath, ...result });
      totalSavings += result.savings;
      totalOriginal += result.originalSize;
    }
  }
  
  log('\n📊 Compression Summary:', 'bold');
  log(`   Original total: ${formatBytes(totalOriginal)}`, 'blue');
  log(`   Total savings: ${formatBytes(totalSavings)}`, 'green');
  log(`   New total: ${formatBytes(totalOriginal - totalSavings)}`, 'blue');
  log(`   Overall reduction: ${Math.round((totalSavings / totalOriginal) * 100)}%`, 'green');
  
  // Additional cleanup suggestions
  log('\n🧹 Additional Cleanup Suggestions:', 'bold');
  
  // Find event covers directory
  const eventCoversPath = path.join(process.cwd(), 'src/assets/images/event-covers');
  if (fs.existsSync(eventCoversPath)) {
    const categories = fs.readdirSync(eventCoversPath, { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => item.name);
    
    log(`   📁 Found ${categories.length} event cover categories:`, 'blue');
    categories.forEach(cat => {
      const categoryPath = path.join(eventCoversPath, cat);
      const images = fs.readdirSync(categoryPath).filter(f => /\.(jpg|png|jpeg)$/i.test(f));
      log(`     - ${cat}: ${images.length} images`, 'yellow');
    });
    
    log(`   💡 Consider keeping only 2-3 covers per category`, 'green');
  }
  
  // Create maintenance script
  const maintenanceScript = `#!/bin/bash
# Image Maintenance Script
# Auto-generated on ${new Date().toISOString()}

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
`;

  fs.writeFileSync('image-maintenance.sh', maintenanceScript);
  fs.chmodSync('image-maintenance.sh', '755');
  
  log('\n📝 Created image-maintenance.sh for ongoing cleanup', 'green');
  
  if (totalSavings > 5 * 1024 * 1024) { // 5MB saved
    log('\n🎉 Great! Significant space saved. App should be much smaller now.', 'green');
  } else {
    log('\n⚠️  Consider manual compression of remaining large images', 'yellow');
    log('   Use tools like TinyPNG, Squoosh, or ImageOptim', 'blue');
  }
}

if (require.main === module) {
  main().catch(console.error);
}