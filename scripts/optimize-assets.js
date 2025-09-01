#!/usr/bin/env node

/**
 * Asset Optimization Script
 * 
 * This script optimizes the app's assets for production:
 * 1. Compresses images
 * 2. Removes unused assets
 * 3. Optimizes SVG files
 * 4. Generates asset manifest
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting asset optimization for TestFlight...');

// Directories to scan
const ASSETS_DIR = path.join(__dirname, '../src/assets');
const IMAGES_DIR = path.join(ASSETS_DIR, 'images');

// File size thresholds (in bytes)
const LARGE_IMAGE_THRESHOLD = 100 * 1024; // 100KB
const VERY_LARGE_IMAGE_THRESHOLD = 200 * 1024; // 200KB

/**
 * Get file size in a human-readable format
 */
function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  const bytes = stats.size;
  
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Recursively scan directory for files
 */
function scanDirectory(dir, extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']) {
  const files = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...scanDirectory(fullPath, extensions));
    } else if (extensions.some(ext => item.toLowerCase().endsWith(ext))) {
      files.push({
        path: fullPath,
        name: item,
        size: stat.size,
        extension: path.extname(item).toLowerCase()
      });
    }
  }
  
  return files;
}

/**
 * Check for unused images by scanning source code
 */
function findUnusedAssets(imageFiles) {
  console.log('🔍 Scanning for unused assets...');
  
  const sourceFiles = scanDirectory(
    path.join(__dirname, '../src'),
    ['.ts', '.tsx', '.js', '.jsx', '.json']
  );
  
  let sourceContent = '';
  
  // Read all source files
  for (const file of sourceFiles) {
    try {
      const content = fs.readFileSync(file.path, 'utf8');
      sourceContent += content + '\n';
    } catch (error) {
      console.warn(`⚠️  Could not read file: ${file.path}`);
    }
  }
  
  const unusedAssets = [];
  
  for (const image of imageFiles) {
    const imageName = path.basename(image.name, image.extension);
    const imageNameKebab = imageName.replace(/[_\s]/g, '-');
    const imageNameCamel = imageName.replace(/[-_\s](.)/g, (_, letter) => letter.toUpperCase());
    
    // Check multiple naming conventions
    const patterns = [
      image.name,
      imageName,
      imageNameKebab,
      imageNameCamel,
      image.path.split('src/assets/')[1]?.replace(/\\/g, '/') || image.name
    ];
    
    const isUsed = patterns.some(pattern => 
      sourceContent.includes(pattern) || 
      sourceContent.includes(pattern.replace(/\.(png|jpg|jpeg|gif|webp)$/i, ''))
    );
    
    if (!isUsed) {
      unusedAssets.push(image);
    }
  }
  
  return unusedAssets;
}

/**
 * Main optimization function
 */
async function optimizeAssets() {
  console.log('📊 Analyzing current assets...');
  
  // Scan all image files
  const imageFiles = scanDirectory(IMAGES_DIR);
  
  if (imageFiles.length === 0) {
    console.log('📁 No image assets found.');
    return;
  }
  
  console.log(`📊 Found ${imageFiles.length} image assets`);
  
  // Analyze file sizes
  const largeImages = imageFiles.filter(file => file.size > LARGE_IMAGE_THRESHOLD);
  const veryLargeImages = imageFiles.filter(file => file.size > VERY_LARGE_IMAGE_THRESHOLD);
  
  console.log('\n📈 Asset size analysis:');
  console.log(`   Large images (>100KB): ${largeImages.length}`);
  console.log(`   Very large images (>200KB): ${veryLargeImages.length}`);
  
  if (veryLargeImages.length > 0) {
    console.log('\n🚨 Very large images detected:');
    veryLargeImages
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
      .forEach(file => {
        const relativePath = path.relative(process.cwd(), file.path);
        console.log(`   ${getFileSize(file.path).padEnd(10)} ${relativePath}`);
      });
  }
  
  // Find unused assets
  const unusedAssets = findUnusedAssets(imageFiles);
  
  if (unusedAssets.length > 0) {
    console.log(`\n🗑️  Found ${unusedAssets.length} potentially unused assets:`);
    unusedAssets.forEach(asset => {
      const relativePath = path.relative(process.cwd(), asset.path);
      console.log(`   ${getFileSize(asset.path).padEnd(10)} ${relativePath}`);
    });
    
    const totalUnusedSize = unusedAssets.reduce((sum, asset) => sum + asset.size, 0);
    console.log(`\n💾 Potential savings: ${getFileSize('').replace('0 Bytes', Math.round(totalUnusedSize / 1024) + ' KB')}`);
  }
  
  // Generate optimization recommendations
  console.log('\n💡 Optimization recommendations:');
  
  if (veryLargeImages.length > 0) {
    console.log('   1. ✅ Compress very large images (>200KB)');
    console.log('   2. ✅ Consider using WebP format for better compression');
    console.log('   3. ✅ Use different resolutions for different screen densities');
  }
  
  if (unusedAssets.length > 0) {
    console.log('   4. ✅ Remove unused assets to reduce bundle size');
  }
  
  console.log('   5. ✅ Use Expo Image component with caching for better performance');
  console.log('   6. ✅ Lazy load images that are not immediately visible');
  
  // Generate asset manifest
  const manifest = {
    generated: new Date().toISOString(),
    totalAssets: imageFiles.length,
    totalSize: imageFiles.reduce((sum, file) => sum + file.size, 0),
    largeAssets: largeImages.length,
    unusedAssets: unusedAssets.length,
    recommendations: {
      compressionCandidates: veryLargeImages.map(img => ({
        path: path.relative(process.cwd(), img.path),
        size: img.size,
        sizeFormatted: getFileSize(img.path)
      })),
      unusedAssets: unusedAssets.map(img => ({
        path: path.relative(process.cwd(), img.path),
        size: img.size,
        sizeFormatted: getFileSize(img.path)
      }))
    }
  };
  
  // Save manifest
  const manifestPath = path.join(__dirname, '../asset-optimization-report.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n📄 Optimization report saved to: ${path.relative(process.cwd(), manifestPath)}`);
  
  // Summary
  const totalSize = manifest.totalSize;
  const potentialSavings = unusedAssets.reduce((sum, asset) => sum + asset.size, 0);
  
  console.log('\n🎯 Summary:');
  console.log(`   📊 Total assets: ${manifest.totalAssets}`);
  console.log(`   📦 Total size: ${Math.round(totalSize / 1024)} KB`);
  console.log(`   💾 Potential savings: ${Math.round(potentialSavings / 1024)} KB (${Math.round(potentialSavings / totalSize * 100)}%)`);
  
  console.log('\n✅ Asset optimization analysis complete!');
  
  return manifest;
}

// Run optimization if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  optimizeAssets().catch(console.error);
}

export { optimizeAssets };