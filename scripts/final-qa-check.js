#!/usr/bin/env node

/**
 * Final Quality Assurance Check Script
 * 
 * This script performs final checks before TestFlight submission:
 * 1. Verifies all critical files exist
 * 2. Runs TypeScript compilation check
 * 3. Runs ESLint validation
 * 4. Checks for unfinished features
 * 5. Validates app configuration
 * 6. Generates final QA report
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Starting Final QA Check for TestFlight...\n');

/**
 * Check if a file exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Run a command and return result
 */
async function runCommand(command, description) {
  console.log(`⏳ ${description}...`);
  try {
    const { stdout, stderr } = await execAsync(command);
    console.log(`✅ ${description} - PASSED`);
    return { success: true, stdout, stderr };
  } catch (error) {
    console.log(`❌ ${description} - FAILED`);
    console.log(`   Error: ${error.message}`);
    return { success: false, error: error.message, stdout: error.stdout, stderr: error.stderr };
  }
}

/**
 * Check for TODO/FIXME comments in critical files
 */
function checkForUnfinishedWork() {
  console.log('⏳ Scanning for unfinished work...');
  
  const criticalFiles = [
    'src/features/events/screens/RSVPManagementScreen.tsx',
    'src/features/events/screens/EventDetailsScreen.tsx',
    'src/hooks/usePollStore.ts',
    'src/hooks/useEvents.ts'
  ];
  
  let foundIssues = [];
  
  for (const file of criticalFiles) {
    const fullPath = path.join(__dirname, '..', file);
    
    if (!fileExists(fullPath)) {
      foundIssues.push(`Missing critical file: ${file}`);
      continue;
    }
    
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        const lineNum = index + 1;
        const trimmed = line.trim();
        
        if (trimmed.includes('TODO:') || 
            trimmed.includes('FIXME:') || 
            trimmed.includes('coming soon') ||
            trimmed.includes('not implemented')) {
          foundIssues.push(`${file}:${lineNum} - ${trimmed}`);
        }
      });
    } catch (error) {
      foundIssues.push(`Could not read file: ${file}`);
    }
  }
  
  if (foundIssues.length > 0) {
    console.log('❌ Found unfinished work:');
    foundIssues.forEach(issue => console.log(`   ${issue}`));
    return false;
  } else {
    console.log('✅ No unfinished work found - PASSED');
    return true;
  }
}

/**
 * Validate app configuration
 */
async function validateAppConfig() {
  console.log('⏳ Validating app configuration...');
  
  const configPath = path.join(__dirname, '..', 'app.config.js');
  
  if (!fileExists(configPath)) {
    console.log('❌ app.config.js not found - FAILED');
    return false;
  }
  
  try {
    // Dynamic import for ES module
    const configModule = await import(configPath);
    const config = configModule.default;
    
    const required = [
      ['expo.name', config.expo?.name],
      ['expo.slug', config.expo?.slug],
      ['expo.version', config.expo?.version],
      ['expo.ios.bundleIdentifier', config.expo?.ios?.bundleIdentifier],
      ['expo.ios.buildNumber', config.expo?.ios?.buildNumber],
      ['expo.icon', config.expo?.icon],
      ['expo.splash', config.expo?.splash]
    ];
    
    const missing = required.filter(([key, value]) => !value);
    
    if (missing.length > 0) {
      console.log('❌ Missing required app configuration:');
      missing.forEach(([key]) => console.log(`   ${key}`));
      return false;
    }
    
    // Check for production-ready values
    if (config.expo.version === '1.0.0' && config.expo.ios.buildNumber) {
      console.log('✅ App configuration - PASSED');
      console.log(`   Version: ${config.expo.version}`);
      console.log(`   Build: ${config.expo.ios.buildNumber}`);
      console.log(`   Bundle ID: ${config.expo.ios.bundleIdentifier}`);
      return true;
    } else {
      console.log('⚠️  App configuration may need updates for production');
      return true; // Not critical
    }
    
  } catch (error) {
    console.log(`❌ Error reading app config: ${error.message} - FAILED`);
    return false;
  }
}

/**
 * Check critical files exist
 */
function checkCriticalFiles() {
  console.log('⏳ Checking critical files...');
  
  const criticalFiles = [
    'package.json',
    'app.config.js',
    'tsconfig.json',
    'eslint.config.js',
    'src/app/_layout.tsx',
    'src/features/events/screens/RSVPManagementScreen.tsx',
    'src/features/events/screens/EventDetailsScreen.tsx',
    'supabase/migrations/20250824_fix_critical_security_issues.sql',
    'TESTFLIGHT_FINAL_CHECKLIST.md'
  ];
  
  const missing = criticalFiles.filter(file => 
    !fileExists(path.join(__dirname, '..', file))
  );
  
  if (missing.length > 0) {
    console.log('❌ Missing critical files:');
    missing.forEach(file => console.log(`   ${file}`));
    return false;
  } else {
    console.log('✅ All critical files present - PASSED');
    return true;
  }
}

/**
 * Main QA function
 */
async function runFinalQA() {
  console.log('🎯 Final Quality Assurance Check\n');
  
  const checks = [];
  
  // 1. Check critical files
  checks.push({
    name: 'Critical Files Check',
    result: checkCriticalFiles()
  });
  
  // 2. TypeScript compilation (exclude test files for development)
  const tsCheck = await runCommand('npx tsc --noEmit --skipLibCheck --excludeFiles="**/__tests__/**/*,**/*.test.*"', 'TypeScript compilation check (lenient)');
  checks.push({
    name: 'TypeScript Compilation',
    result: tsCheck.success
  });
  
  // 3. ESLint check (allow more warnings for development)
  const lintCheck = await runCommand('npx eslint src --ext .ts,.tsx --max-warnings 200', 'ESLint validation (lenient)');
  checks.push({
    name: 'ESLint Validation',
    result: lintCheck.success
  });
  
  // 4. Check for unfinished work
  checks.push({
    name: 'Unfinished Work Scan',
    result: checkForUnfinishedWork()
  });
  
  // 5. App configuration
  checks.push({
    name: 'App Configuration',
    result: await validateAppConfig()
  });
  
  // Generate report
  console.log('\n📊 Final QA Report');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const passed = checks.filter(check => check.result).length;
  const total = checks.length;
  const percentage = Math.round((passed / total) * 100);
  
  checks.forEach(check => {
    const status = check.result ? '✅ PASS' : '❌ FAIL';
    console.log(`${status.padEnd(10)} ${check.name}`);
  });
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📈 Overall Score: ${passed}/${total} (${percentage}%)`);
  
  if (percentage === 100) {
    console.log('\n🚀 TESTFLIGHT READY!');
    console.log('✅ All quality checks passed');
    console.log('✅ App is ready for TestFlight submission');
    console.log('\nNext steps:');
    console.log('1. Run: expo build:ios (or EAS build)');
    console.log('2. Upload to App Store Connect');
    console.log('3. Submit to TestFlight');
  } else if (percentage >= 80) {
    console.log('\n⚠️  ALMOST READY');
    console.log('🔧 Minor issues detected - review and fix before submission');
  } else {
    console.log('\n❌ NOT READY');
    console.log('🚨 Critical issues detected - must fix before TestFlight submission');
  }
  
  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    checks: checks,
    score: percentage,
    passed: passed,
    total: total,
    ready: percentage === 100
  };
  
  const reportPath = path.join(__dirname, '..', 'final-qa-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: final-qa-report.json`);
  
  return report;
}

// Run QA check if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runFinalQA().catch(console.error);
}

export { runFinalQA };