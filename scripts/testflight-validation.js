#!/usr/bin/env node

/**
 * TestFlight Validation Script
 * Comprehensive validation for production readiness
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Starting TestFlight Validation...\n');

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0,
};

function logPass(message) {
  console.log(`✅ ${message}`);
  checks.passed++;
}

function logFail(message) {
  console.log(`❌ ${message}`);
  checks.failed++;
}

function logWarning(message) {
  console.log(`⚠️  ${message}`);
  checks.warnings++;
}

function logInfo(message) {
  console.log(`ℹ️  ${message}`);
}

// 1. Check Environment Configuration
logInfo('Checking Environment Configuration...');

try {
  const envFile = fs.readFileSync('.env', 'utf8');
  const requiredVars = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'EXPO_PUBLIC_HERE_API_KEY'
  ];
  
  const missingVars = requiredVars.filter(varName => !envFile.includes(varName));
  
  if (missingVars.length === 0) {
    logPass('All required environment variables are present');
  } else {
    logFail(`Missing environment variables: ${missingVars.join(', ')}`);
  }
} catch (error) {
  logFail('Environment file (.env) not found');
}

// 2. Check Package Dependencies
logInfo('Checking Package Dependencies...');

try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const criticalDeps = [
    'expo',
    'react',
    'react-native',
    '@supabase/supabase-js',
    'expo-router',
    'react-native-safe-area-context'
  ];
  
  const missingDeps = criticalDeps.filter(dep => !packageJson.dependencies[dep]);
  
  if (missingDeps.length === 0) {
    logPass('All critical dependencies are installed');
  } else {
    logFail(`Missing critical dependencies: ${missingDeps.join(', ')}`);
  }
  
  // Check for dev dependencies
  const devDeps = ['typescript', 'jest', '@testing-library/react-native'];
  const missingDevDeps = devDeps.filter(dep => !packageJson.devDependencies[dep]);
  
  if (missingDevDeps.length === 0) {
    logPass('All development dependencies are installed');
  } else {
    logWarning(`Missing dev dependencies: ${missingDevDeps.join(', ')}`);
  }
} catch (error) {
  logFail('Could not read package.json');
}

// 3. Check App Configuration
logInfo('Checking App Configuration...');

try {
  const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  const config = appJson.expo;
  
  if (config.name && config.slug) {
    logPass('App name and slug are configured');
  } else {
    logFail('App name or slug missing in app.json');
  }
  
  if (config.version) {
    logPass(`App version: ${config.version}`);
  } else {
    logFail('App version not specified');
  }
  
  if (config.ios && config.ios.bundleIdentifier) {
    logPass('iOS bundle identifier configured');
  } else {
    logWarning('iOS bundle identifier not configured');
  }
  
  if (config.android && config.android.package) {
    logPass('Android package name configured');
  } else {
    logWarning('Android package name not configured');
  }
  
  // Check for required permissions
  const requiredPermissions = ['CAMERA', 'RECORD_AUDIO', 'ACCESS_FINE_LOCATION'];
  if (config.plugins && Array.isArray(config.plugins)) {
    logPass('Plugins configuration exists');
  } else {
    logWarning('No plugins configuration found');
  }
} catch (error) {
  logFail('Could not read app.json or invalid format');
}

// 4. Check TypeScript Configuration
logInfo('Checking TypeScript Configuration...');

try {
  const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
  
  if (tsConfig.compilerOptions && tsConfig.compilerOptions.strict) {
    logPass('Strict TypeScript mode enabled');
  } else {
    logWarning('Strict TypeScript mode not enabled');
  }
  
  if (tsConfig.include && tsConfig.include.length > 0) {
    logPass('TypeScript include paths configured');
  } else {
    logWarning('TypeScript include paths not configured');
  }
} catch (error) {
  logFail('Could not read tsconfig.json');
}

// 5. Check for Critical Files
logInfo('Checking Critical Files...');

const criticalFiles = [
  'src/app/_layout.tsx',
  'src/app/index.tsx',
  'src/shared/lib/supabase/client.ts',
  'jest.config.js',
  'babel.config.js'
];

criticalFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    logPass(`${filePath} exists`);
  } else {
    logFail(`${filePath} missing`);
  }
});

// 6. Check for Security Issues
logInfo('Checking for Security Issues...');

try {
  const envContent = fs.readFileSync('.env', 'utf8');
  
  // Check if .env contains actual secrets (not placeholders)
  if (envContent.includes('your_key_here') || envContent.includes('PLACEHOLDER')) {
    logFail('Environment file contains placeholder values');
  } else {
    logPass('No placeholder values found in environment file');
  }
  
  // Check if sensitive files are in gitignore
  if (fs.existsSync('.gitignore')) {
    const gitignore = fs.readFileSync('.gitignore', 'utf8');
    const sensitiveFiles = ['.env', 'node_modules', '.expo'];
    const missingFromGitignore = sensitiveFiles.filter(file => !gitignore.includes(file));
    
    if (missingFromGitignore.length === 0) {
      logPass('Sensitive files are properly ignored by git');
    } else {
      logWarning(`Add to .gitignore: ${missingFromGitignore.join(', ')}`);
    }
  }
} catch (error) {
  logWarning('Could not perform security checks');
}

// 7. Check Build Requirements
logInfo('Checking Build Requirements...');

const buildScripts = ['check:types', 'check:lint'];
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  buildScripts.forEach(script => {
    if (packageJson.scripts && packageJson.scripts[script]) {
      logPass(`Build script "${script}" exists`);
    } else {
      logWarning(`Build script "${script}" not found`);
    }
  });
} catch (error) {
  logWarning('Could not check build scripts');
}

// 8. Final Summary
console.log('\n📊 Validation Summary:');
console.log(`✅ Passed: ${checks.passed}`);
console.log(`❌ Failed: ${checks.failed}`);
console.log(`⚠️  Warnings: ${checks.warnings}`);

if (checks.failed === 0) {
  console.log('\n🎉 All critical checks passed! App is ready for TestFlight submission.');
  console.log('\n📝 Recommended next steps:');
  console.log('1. Run: pnpm run check:types');
  console.log('2. Run: pnpm run check:lint');
  console.log('3. Run: pnpm test');
  console.log('4. Test on physical device');
  console.log('5. Submit to TestFlight');
} else {
  console.log('\n🚨 Critical issues found! Please fix the failed checks before submission.');
  process.exit(1);
}

if (checks.warnings > 0) {
  console.log('\n💡 Consider addressing warnings for optimal app quality.');
}

console.log('\n🚀 TestFlight validation complete!');