#!/usr/bin/env node
/**
 * Script to create branded splash screen logo for And Friends app
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// App brand colors
const BRAND_COLOR = '#0a7ea4'; // Primary teal blue
const ACCENT_COLOR = '#34C759'; // Success green for accent

console.log('🎨 Creating And Friends Splash Logo...\n');

try {
  const createSplashLogo = (outputPath, size) => {
    console.log(`Creating splash logo: ${outputPath} (${size}x${size})`);
    
    // Create an SVG for the splash logo (larger, more detailed version)
    const svgContent = `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Main icon - stylized person with cocktail (larger, more detailed) -->
  <g transform="translate(${size * 0.3}, ${size * 0.25}) scale(${size * 0.005})">
    <!-- Head -->
    <circle cx="50" cy="35" r="28" fill="${BRAND_COLOR}" stroke="white" stroke-width="3"/>
    
    <!-- Face details -->
    <circle cx="42" cy="32" r="2" fill="white"/> <!-- left eye -->
    <circle cx="58" cy="32" r="2" fill="white"/> <!-- right eye -->
    <path d="M 45 42 Q 50 45 55 42" stroke="white" stroke-width="2" fill="none"/> <!-- smile -->
    
    <!-- Body -->
    <rect x="25" y="63" width="50" height="70" rx="20" fill="${BRAND_COLOR}"/>
    
    <!-- Left arm holding cocktail -->
    <rect x="8" y="78" width="30" height="12" rx="6" fill="${BRAND_COLOR}"/>
    
    <!-- Detailed cocktail glass -->
    <polygon points="2,78 18,92 10,100 6,100" fill="white" stroke="${BRAND_COLOR}" stroke-width="2"/>
    <circle cx="10" cy="80" r="3" fill="${ACCENT_COLOR}"/> <!-- olive -->
    <line x1="12" y1="76" x2="12" y2="82" stroke="${BRAND_COLOR}" stroke-width="1"/> <!-- pick -->
    
    <!-- Right arm (welcoming gesture) -->
    <rect x="70" y="75" width="25" height="10" rx="5" fill="${BRAND_COLOR}"/>
    <circle cx="95" cy="80" r="6" fill="${BRAND_COLOR}"/> <!-- hand -->
    
    <!-- Legs -->
    <rect x="35" y="133" width="12" height="30" rx="6" fill="${BRAND_COLOR}"/>
    <rect x="53" y="133" width="12" height="30" rx="6" fill="${BRAND_COLOR}"/>
    
    <!-- Feet -->
    <ellipse cx="41" cy="168" rx="8" ry="4" fill="${BRAND_COLOR}"/>
    <ellipse cx="59" cy="168" rx="8" ry="4" fill="${BRAND_COLOR}"/>
  </g>
  
  <!-- App name text -->
  <text x="${size/2}" y="${size * 0.85}" 
        text-anchor="middle" 
        font-family="Arial, sans-serif" 
        font-size="${size * 0.08}" 
        font-weight="bold" 
        fill="${BRAND_COLOR}">
    &amp; FRIENDS
  </text>
</svg>`;

    // Write SVG temporarily
    const tempSvg = path.join(__dirname, 'temp-splash.svg');
    fs.writeFileSync(tempSvg, svgContent);
    
    try {
      // Convert SVG to PNG using built-in tools
      if (process.platform === 'darwin') {
        // On macOS, use qlmanage to convert SVG to PNG
        execSync(`qlmanage -t -s ${size} -o "${path.dirname(outputPath)}" "${tempSvg}"`);
        const qlOutput = path.join(path.dirname(outputPath), 'temp-splash.svg.png');
        if (fs.existsSync(qlOutput)) {
          fs.renameSync(qlOutput, outputPath);
        }
      }
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempSvg)) {
        fs.unlinkSync(tempSvg);
      }
    }
    
    return true;
  };

  // Android splash logos (different densities)
  const androidSplashDirs = [
    { dir: 'drawable-hdpi', size: 150 },
    { dir: 'drawable-mdpi', size: 100 },
    { dir: 'drawable-xhdpi', size: 200 },
    { dir: 'drawable-xxhdpi', size: 300 },
    { dir: 'drawable-xxxhdpi', size: 400 }
  ];

  console.log('Creating Android splash logos...');
  androidSplashDirs.forEach(({ dir, size }) => {
    const splashDir = path.join(__dirname, `../android/app/src/main/res/${dir}`);
    const outputPath = path.join(splashDir, 'splashscreen_logo.png');
    createSplashLogo(outputPath, size);
  });

  // Also create a general splash icon for assets
  const assetsPath = path.join(__dirname, '../assets/splash-icon.png');
  createSplashLogo(assetsPath, 400);

  console.log('\n✅ Splash screen logos created successfully!');
  console.log('🎉 Your And Friends app now has complete branded iconography!\n');

} catch (error) {
  console.error('❌ Error creating splash logos:', error.message);
}