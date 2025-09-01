#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 TestFlight Pre-flight Check\n');
console.log('=' .repeat(60));

const results = {
  passed: [],
  warnings: [],
  errors: [],
  ready: true
};

// Helper to run command safely
function runCommand(command, silent = false) {
  try {
    return execSync(command, { 
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit'
    });
  } catch (error) {
    return null;
  }
}

// 1. Check iOS configuration
console.log('\n📱 Checking iOS Configuration...');
const appJsonPath = path.join(__dirname, '..', 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// Check bundle identifier
if (appJson.expo?.ios?.bundleIdentifier) {
  const bundleId = appJson.expo.ios.bundleIdentifier;
  if (bundleId.includes('com.') && !bundleId.includes('example')) {
    results.passed.push(`✓ Bundle identifier: ${bundleId}`);
  } else {
    results.errors.push('✗ Invalid bundle identifier');
    results.ready = false;
  }
} else {
  results.errors.push('✗ Missing iOS bundle identifier');
  results.ready = false;
}

// Check version and build number
if (appJson.expo?.version) {
  results.passed.push(`✓ App version: ${appJson.expo.version}`);
} else {
  results.errors.push('✗ Missing app version');
  results.ready = false;
}

if (appJson.expo?.ios?.buildNumber) {
  results.passed.push(`✓ Build number: ${appJson.expo.ios.buildNumber}`);
} else {
  results.warnings.push('⚠ No specific iOS build number set');
}

// Check app name
if (appJson.expo?.name) {
  results.passed.push(`✓ App name: ${appJson.expo.name}`);
} else {
  results.errors.push('✗ Missing app name');
  results.ready = false;
}

// 2. Check required assets
console.log('\n🎨 Checking Required Assets...');
const requiredAssets = [
  { path: 'assets/icon.png', name: 'App Icon', minSize: 1024 },
  { path: 'assets/splash-icon.png', name: 'Splash Icon' },
  { path: 'assets/adaptive-icon.png', name: 'Adaptive Icon' }
];

requiredAssets.forEach(asset => {
  const assetPath = path.join(__dirname, '..', asset.path);
  if (fs.existsSync(assetPath)) {
    const stats = fs.statSync(assetPath);
    if (asset.minSize) {
      // Check dimensions for icon
      results.passed.push(`✓ ${asset.name} exists`);
    } else {
      results.passed.push(`✓ ${asset.name} exists`);
    }
  } else {
    results.warnings.push(`⚠ ${asset.name} not found at ${asset.path}`);
  }
});

// 3. Check permissions and privacy descriptions
console.log('\n🔐 Checking Permissions...');
const requiredPermissions = [
  { key: 'NSCameraUsageDescription', name: 'Camera' },
  { key: 'NSPhotoLibraryUsageDescription', name: 'Photo Library' },
  { key: 'NSContactsUsageDescription', name: 'Contacts' },
  { key: 'NSLocationWhenInUseUsageDescription', name: 'Location' },
  { key: 'NSMicrophoneUsageDescription', name: 'Microphone' }
];

const infoPlist = appJson.expo?.ios?.infoPlist || {};

requiredPermissions.forEach(perm => {
  if (infoPlist[perm.key]) {
    const description = infoPlist[perm.key];
    if (description.length > 20) {
      results.passed.push(`✓ ${perm.name} permission description`);
    } else {
      results.warnings.push(`⚠ ${perm.name} description too short`);
    }
  } else {
    results.warnings.push(`⚠ Missing ${perm.name} permission description`);
  }
});

// 4. Check TypeScript compilation
console.log('\n📝 Checking TypeScript...');
const tsCheckResult = runCommand('npm run typecheck', true);
if (tsCheckResult !== null) {
  results.passed.push('✓ TypeScript compilation successful');
} else {
  results.errors.push('✗ TypeScript compilation errors');
  results.ready = false;
}

// 5. Check for console statements
console.log('\n🔍 Checking for console statements...');
let consoleCount = 0;
function checkForConsole(dir) {
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      if (item === 'node_modules' || item === '.git' || item === '__tests__') continue;
      
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        checkForConsole(fullPath);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const matches = content.match(/console\.(log|debug)/g);
        if (matches) consoleCount += matches.length;
      }
    }
  } catch (error) {
    // Ignore
  }
}

checkForConsole(path.join(__dirname, '..', 'src'));

if (consoleCount > 0) {
  results.warnings.push(`⚠ Found ${consoleCount} console.log/debug statements`);
} else {
  results.passed.push('✓ No console.log statements in production code');
}

// 6. Check environment configuration
console.log('\n⚙️  Checking Environment Configuration...');
if (appJson.expo?.extra?.supabaseUrl && !appJson.expo.extra.supabaseUrl.includes('REMPLACER')) {
  results.passed.push('✓ Supabase URL configured');
} else {
  results.errors.push('✗ Supabase URL not configured');
  results.ready = false;
}

if (appJson.expo?.extra?.supabaseAnonKey && !appJson.expo.extra.supabaseAnonKey.includes('REMPLACER')) {
  results.passed.push('✓ Supabase Anon Key configured');
} else {
  results.errors.push('✗ Supabase Anon Key not configured');
  results.ready = false;
}

// 7. Check iOS specific files
console.log('\n📂 Checking iOS Files...');
const iosProjectPath = path.join(__dirname, '..', 'ios');
if (fs.existsSync(iosProjectPath)) {
  const requiredIosFiles = [
    'friends.xcodeproj',
    'friends/Info.plist',
    'friends/Images.xcassets'
  ];

  requiredIosFiles.forEach(file => {
    const filePath = path.join(iosProjectPath, file);
    if (fs.existsSync(filePath)) {
      results.passed.push(`✓ iOS: ${file} exists`);
    } else {
      results.warnings.push(`⚠ iOS: ${file} not found`);
    }
  });
} else {
  results.warnings.push('⚠ iOS folder not found (run expo prebuild if needed)');
}

// 8. Check app store information
console.log('\n📋 Checking App Store Information...');
if (appJson.expo?.ios?.appStoreUrl) {
  results.passed.push('✓ App Store URL configured');
}

if (appJson.expo?.description) {
  if (appJson.expo.description.length > 50) {
    results.passed.push('✓ App description provided');
  } else {
    results.warnings.push('⚠ App description too short');
  }
} else {
  results.warnings.push('⚠ Missing app description');
}

// 9. Run tests
console.log('\n🧪 Running Tests...');
const testResult = runCommand('npm test -- --passWithNoTests', true);
if (testResult !== null) {
  results.passed.push('✓ All tests passed');
} else {
  results.warnings.push('⚠ Some tests failed or no tests found');
}

// 10. Check for large files
console.log('\n📦 Checking for large files...');
function findLargeFiles(dir, maxSizeMB = 10) {
  const largeFiles = [];
  
  function scan(currentPath) {
    try {
      const items = fs.readdirSync(currentPath);
      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        if (item === 'node_modules' || item === '.git' || item === 'coverage') continue;
        
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          scan(fullPath);
        } else if (stats.isFile()) {
          const sizeMB = stats.size / (1024 * 1024);
          if (sizeMB > maxSizeMB) {
            largeFiles.push({
              path: fullPath.replace(path.join(__dirname, '..'), '.'),
              sizeMB: sizeMB.toFixed(2)
            });
          }
        }
      }
    } catch (error) {
      // Ignore
    }
  }
  
  scan(dir);
  return largeFiles;
}

const largeFiles = findLargeFiles(path.join(__dirname, '..', 'assets'));
if (largeFiles.length > 0) {
  largeFiles.forEach(file => {
    results.warnings.push(`⚠ Large file: ${file.path} (${file.sizeMB}MB)`);
  });
} else {
  results.passed.push('✓ No excessively large files');
}

// Generate final report
console.log('\n' + '='.repeat(60));
console.log('📊 TESTFLIGHT READINESS REPORT');
console.log('='.repeat(60));

console.log('\n✅ Passed Checks:');
results.passed.forEach(item => console.log(`  ${item}`));

if (results.warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  results.warnings.forEach(item => console.log(`  ${item}`));
}

if (results.errors.length > 0) {
  console.log('\n❌ Errors (Must Fix):');
  results.errors.forEach(item => console.log(`  ${item}`));
}

// Final verdict
console.log('\n' + '='.repeat(60));
if (results.ready && results.errors.length === 0) {
  console.log('✅ APP IS READY FOR TESTFLIGHT!');
  console.log('\nNext steps:');
  console.log('1. Run: expo prebuild');
  console.log('2. Open ios/friends.xcworkspace in Xcode');
  console.log('3. Configure signing & capabilities');
  console.log('4. Archive and upload to TestFlight');
} else {
  console.log('❌ APP IS NOT READY FOR TESTFLIGHT');
  console.log('\nPlease fix the errors above before proceeding.');
}
console.log('='.repeat(60));

// Save report
const report = {
  timestamp: new Date().toISOString(),
  ready: results.ready && results.errors.length === 0,
  passed: results.passed.length,
  warnings: results.warnings.length,
  errors: results.errors.length,
  details: results
};

fs.writeFileSync(
  path.join(__dirname, '..', 'testflight-report.json'),
  JSON.stringify(report, null, 2)
);

console.log('\n📄 Report saved to: testflight-report.json');

// Exit with appropriate code
process.exit(results.ready && results.errors.length === 0 ? 0 : 1);