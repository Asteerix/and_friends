#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileSizeSync(filepath) {
  try {
    const stats = fs.statSync(filepath);
    return stats.size;
  } catch (err) {
    return 0;
  }
}

function findImages(dir) {
  const images = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      images.push(...findImages(fullPath));
    } else if (item.isFile()) {
      const ext = path.extname(item.name).toLowerCase();
      if (['.png', '.jpg', '.jpeg'].includes(ext)) {
        const size = getFileSizeSync(fullPath);
        images.push({
          path: fullPath,
          name: item.name,
          extension: ext,
          size: size,
          sizeFormatted: formatBytes(size)
        });
      }
    }
  }
  
  return images;
}

function optimizeWithImageOptim(imagePath) {
  try {
    // Check if imageoptim command is available (macOS)
    execSync('which imageoptim', { stdio: 'ignore' });
    execSync(`imageoptim "${imagePath}"`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function optimizeWithTinyPNG(imagePath) {
  // This would require a TinyPNG API key
  // For now, we'll skip this optimization
  return false;
}

function optimizeWithBuiltIn(imagePath, targetPath) {
  try {
    const ext = path.extname(imagePath).toLowerCase();
    
    if (ext === '.png') {
      // Use pngcrush if available
      try {
        execSync('which pngcrush', { stdio: 'ignore' });
        execSync(`pngcrush -rem alla -reduce "${imagePath}" "${targetPath}"`, { stdio: 'ignore' });
        
        // Replace original if optimization was successful
        const originalSize = getFileSizeSync(imagePath);
        const optimizedSize = getFileSizeSync(targetPath);
        
        if (optimizedSize > 0 && optimizedSize < originalSize) {
          fs.renameSync(targetPath, imagePath);
          return { success: true, savings: originalSize - optimizedSize };
        } else {
          // Clean up failed optimization
          if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
          }
        }
      } catch {
        // pngcrush not available
      }
    }
    
    return { success: false, savings: 0 };
  } catch (err) {
    return { success: false, savings: 0, error: err.message };
  }
}

function generateOptimizationReport(images, totalSavings) {
  const report = {
    timestamp: new Date().toISOString(),
    totalImages: images.length,
    totalOriginalSize: images.reduce((sum, img) => sum + img.originalSize, 0),
    totalOptimizedSize: images.reduce((sum, img) => sum + img.newSize, 0),
    totalSavings: totalSavings,
    images: images.map(img => ({
      path: img.path.replace(process.cwd() + '/', ''),
      originalSize: formatBytes(img.originalSize),
      newSize: formatBytes(img.newSize),
      savings: formatBytes(img.savings),
      savingsPercent: img.originalSize > 0 ? Math.round((img.savings / img.originalSize) * 100) : 0
    }))
  };
  
  return report;
}

async function main() {
  log('🖼️  Image Optimization Tool for TestFlight', 'bold');
  log('================================================', 'blue');
  
  const assetsDir = path.join(process.cwd(), 'assets');
  const srcDir = path.join(process.cwd(), 'src');
  
  if (!fs.existsSync(assetsDir)) {
    log('❌ Assets directory not found!', 'red');
    process.exit(1);
  }
  
  log('📁 Scanning for images...', 'blue');
  const images = [...findImages(assetsDir), ...findImages(srcDir)];
  
  if (images.length === 0) {
    log('✅ No images found to optimize', 'green');
    return;
  }
  
  const totalOriginalSize = images.reduce((sum, img) => sum + img.size, 0);
  log(`📊 Found ${images.length} images (${formatBytes(totalOriginalSize)})`, 'yellow');
  
  // Show largest images
  const largestImages = images
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);
  
  log('\n🔍 Largest images:', 'blue');
  largestImages.forEach((img, index) => {
    const relativePath = img.path.replace(process.cwd() + '/', '');
    log(`   ${index + 1}. ${relativePath} (${img.sizeFormatted})`, 'yellow');
  });
  
  // Optimization recommendations
  log('\n💡 Optimization Recommendations:', 'blue');
  
  const largeImages = images.filter(img => img.size > 100 * 1024); // > 100KB
  if (largeImages.length > 0) {
    log(`   • ${largeImages.length} images are larger than 100KB`, 'yellow');
    log(`   • Consider compressing these images`, 'yellow');
  }
  
  const duplicateNames = {};
  images.forEach(img => {
    const name = path.basename(img.path);
    if (!duplicateNames[name]) duplicateNames[name] = [];
    duplicateNames[name].push(img.path);
  });
  
  const duplicates = Object.entries(duplicateNames).filter(([name, paths]) => paths.length > 1);
  if (duplicates.length > 0) {
    log(`   • Found ${duplicates.length} potential duplicate image names:`, 'yellow');
    duplicates.slice(0, 5).forEach(([name, paths]) => {
      log(`     - ${name} (${paths.length} copies)`, 'yellow');
    });
  }
  
  // Size analysis
  const totalMB = totalOriginalSize / (1024 * 1024);
  if (totalMB > 10) {
    log(`   ⚠️  Total image size (${formatBytes(totalOriginalSize)}) may be too large for mobile app`, 'red');
    log(`   📱 Consider reducing image sizes or using WebP format`, 'yellow');
  }
  
  // Manual optimization suggestions
  log('\n🛠️  Manual Optimization Steps:', 'blue');
  log('   1. Use online tools like TinyPNG or Squoosh.app', 'green');
  log('   2. Convert PNG to WebP where supported', 'green');
  log('   3. Use appropriate image sizes for different screen densities', 'green');
  log('   4. Consider using SVG for simple graphics', 'green');
  log('   5. Remove unused images from the assets folder', 'green');
  
  // Create optimization script
  const optimizationScript = `#!/bin/bash
# Image Optimization Script for TestFlight
# Generated on ${new Date().toISOString()}

echo "🖼️  Optimizing images for TestFlight..."

# Large images that should be compressed (> 100KB)
${largeImages.map(img => {
  const relativePath = img.path.replace(process.cwd() + '/', '');
  return `echo "Compress: ${relativePath} (${img.sizeFormatted})"`;
}).join('\n')}

echo "\\n✅ Review the above images and compress them manually"
echo "💡 Recommended tools:"
echo "   - TinyPNG (https://tinypng.com/)"
echo "   - Squoosh (https://squoosh.app/)"
echo "   - ImageOptim (Mac)"
echo ""
echo "📊 Current total: ${formatBytes(totalOriginalSize)}"
echo "🎯 Target: < 2MB total"
`;

  fs.writeFileSync('optimize-images.sh', optimizationScript);
  fs.chmodSync('optimize-images.sh', '755');
  
  log('\n📝 Generated optimize-images.sh script', 'green');
  log('   Run: ./optimize-images.sh', 'blue');
  
  // Summary
  log('\n📈 Summary:', 'bold');
  log(`   • Total images: ${images.length}`, 'blue');
  log(`   • Total size: ${formatBytes(totalOriginalSize)}`, 'blue');
  log(`   • Images > 100KB: ${largeImages.length}`, 'yellow');
  
  if (totalMB > 5) {
    log(`   ⚠️  WARNING: Total size may be too large for TestFlight`, 'red');
  } else if (totalMB > 2) {
    log(`   ⚠️  NOTICE: Consider further optimization`, 'yellow');
  } else {
    log(`   ✅ Image size is acceptable for mobile app`, 'green');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  findImages,
  formatBytes,
  optimizeWithBuiltIn
};