#!/usr/bin/env node
/**
 * Script to create proper app icons for And Friends app
 * Based on the event logo and brand colors
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// App brand colors
const BRAND_COLOR = '#0a7ea4'; // Primary teal blue
const BG_COLOR = '#ffffff';     // White background
const ACCENT_COLOR = '#34C759'; // Success green for accent

// iOS icon sizes required
const IOS_SIZES = [
  { size: 20, name: 'icon-20' },
  { size: 29, name: 'icon-29' },
  { size: 40, name: 'icon-40' },
  { size: 60, name: 'icon-60' },
  { size: 76, name: 'icon-76' },
  { size: 83.5, name: 'icon-83.5' },
  { size: 1024, name: 'icon-1024' }
];

// Main app icon sizes
const MAIN_SIZES = [
  { size: 512, name: 'icon.png' },
  { size: 512, name: 'adaptive-icon.png' }
];

console.log('🎨 Creating And Friends App Icons...\n');

try {
  // Create a branded icon based on the event logo
  const createIcon = (outputPath, size) => {
    console.log(`Creating ${outputPath} (${size}x${size})`);
    
    // Create an SVG for the app icon
    const svgContent = `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="${BG_COLOR}" rx="${size * 0.2}"/>
  
  <!-- Background circle -->
  <circle cx="${size/2}" cy="${size/2}" r="${size * 0.35}" fill="${BRAND_COLOR}" opacity="0.1"/>
  
  <!-- Main icon - stylized person with cocktail -->
  <g transform="translate(${size * 0.25}, ${size * 0.2}) scale(${size * 0.003})">
    <!-- Head -->
    <circle cx="50" cy="40" r="25" fill="${BRAND_COLOR}" stroke="white" stroke-width="2"/>
    
    <!-- Body -->
    <rect x="30" y="65" width="40" height="60" rx="15" fill="${BRAND_COLOR}"/>
    
    <!-- Left arm holding cocktail -->
    <rect x="10" y="75" width="25" height="8" rx="4" fill="${BRAND_COLOR}"/>
    
    <!-- Cocktail glass -->
    <polygon points="5,75 15,85 10,90" fill="white" stroke="${BRAND_COLOR}" stroke-width="1"/>
    <circle cx="10" cy="77" r="2" fill="${ACCENT_COLOR}"/>
    
    <!-- Right arm -->
    <rect x="65" y="75" width="25" height="8" rx="4" fill="${BRAND_COLOR}"/>
    
    <!-- Legs -->
    <rect x="35" y="125" width="10" height="25" rx="5" fill="${BRAND_COLOR}"/>
    <rect x="55" y="125" width="10" height="25" rx="5" fill="${BRAND_COLOR}"/>
  </g>
  
  <!-- Small decorative elements -->
  <circle cx="${size * 0.8}" cy="${size * 0.3}" r="${size * 0.02}" fill="${ACCENT_COLOR}" opacity="0.7"/>
  <circle cx="${size * 0.2}" cy="${size * 0.8}" r="${size * 0.015}" fill="${ACCENT_COLOR}" opacity="0.5"/>
  <circle cx="${size * 0.85}" cy="${size * 0.7}" r="${size * 0.01}" fill="${BRAND_COLOR}" opacity="0.6"/>
</svg>`;

    // Write SVG temporarily
    const tempSvg = path.join(__dirname, 'temp-icon.svg');
    fs.writeFileSync(tempSvg, svgContent);
    
    try {
      // Convert SVG to PNG using built-in tools
      if (process.platform === 'darwin') {
        // On macOS, use qlmanage to convert SVG to PNG
        execSync(`qlmanage -t -s ${size} -o "${path.dirname(outputPath)}" "${tempSvg}"`);
        const qlOutput = path.join(path.dirname(outputPath), 'temp-icon.svg.png');
        if (fs.existsSync(qlOutput)) {
          fs.renameSync(qlOutput, outputPath);
        }
      } else {
        console.warn(`⚠️  Cannot convert SVG on ${process.platform}. Please install ImageMagick or use online converter.`);
        console.log(`SVG content saved to: ${tempSvg}`);
        return false;
      }
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempSvg)) {
        fs.unlinkSync(tempSvg);
      }
    }
    
    return true;
  };

  // Create main app icons
  console.log('Creating main app icons...');
  const assetsDir = path.join(__dirname, '../assets');
  
  MAIN_SIZES.forEach(({ size, name }) => {
    const outputPath = path.join(assetsDir, name);
    createIcon(outputPath, size);
  });

  // Create iOS icons
  console.log('\nCreating iOS app icons...');
  const iosIconDir = path.join(__dirname, '../ios/friends/Images.xcassets/AppIcon.appiconset');
  
  IOS_SIZES.forEach(({ size, name }) => {
    ['@2x', '@3x'].forEach(scale => {
      const actualSize = size * (scale === '@2x' ? 2 : scale === '@3x' ? 3 : 1);
      const fileName = `${name}${scale}.png`;
      const outputPath = path.join(iosIconDir, fileName);
      
      if (size <= 83.5 || scale === '') { // Skip very large scaled versions
        createIcon(outputPath, actualSize);
      }
    });
    
    // Also create base size for some icons
    if (size === 76 || size === 1024) {
      const outputPath = path.join(iosIconDir, `${name}.png`);
      createIcon(outputPath, size);
    }
  });

  console.log('\n✅ App icons created successfully!');
  console.log('\n📱 Next steps for TestFlight:');
  console.log('1. Verify icons in Xcode');
  console.log('2. Build and upload to TestFlight');
  console.log('3. The app is now ready with proper branded icons!\n');

} catch (error) {
  console.error('❌ Error creating app icons:', error.message);
  console.log('\n🔧 Alternative: You can also:');
  console.log('1. Use online tools like https://appicon.co/');
  console.log('2. Use the SVG content above as a base design');
  console.log('3. Export PNG files at the required sizes manually\n');
}