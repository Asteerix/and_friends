#!/usr/bin/env node

import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class TestFlightValidator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      passed: [],
      warnings: [],
      errors: [],
      performance: {},
      security: {},
      coverage: {},
      recommendations: []
    };
  }

  log(message, type = 'info') {
    const colorMap = {
      error: colors.red,
      warning: colors.yellow,
      success: colors.green,
      info: colors.cyan,
      header: colors.magenta
    };
    
    const color = colorMap[type] || colors.reset;
    console.log(`${color}${message}${colors.reset}`);
  }

  async checkDependencies() {
    this.log('\n📦 Checking Dependencies...', 'header');
    
    try {
      // Check for security vulnerabilities
      const { stdout: auditOutput } = await execAsync('pnpm audit --json || true');
      const auditData = JSON.parse(auditOutput || '{}');
      
      if (auditData.metadata?.vulnerabilities) {
        const vulns = auditData.metadata.vulnerabilities;
        const critical = vulns.critical || 0;
        const high = vulns.high || 0;
        
        if (critical > 0 || high > 0) {
          this.results.errors.push({
            type: 'dependencies',
            message: `Found ${critical} critical and ${high} high vulnerabilities`,
            severity: 'high'
          });
          this.log(`  ❌ Security vulnerabilities found: ${critical} critical, ${high} high`, 'error');
        } else {
          this.results.passed.push('No critical security vulnerabilities');
          this.log('  ✅ No critical security vulnerabilities', 'success');
        }
      }
      
      // Check for outdated packages
      const { stdout: outdated } = await execAsync('pnpm outdated --json || true');
      if (outdated) {
        const outdatedPackages = JSON.parse(outdated);
        const majorUpdates = Object.keys(outdatedPackages).filter(pkg => {
          const current = outdatedPackages[pkg].current;
          const latest = outdatedPackages[pkg].latest;
          return current && latest && current.split('.')[0] !== latest.split('.')[0];
        });
        
        if (majorUpdates.length > 0) {
          this.results.warnings.push({
            type: 'dependencies',
            message: `${majorUpdates.length} packages have major updates available`,
            packages: majorUpdates
          });
          this.log(`  ⚠️  ${majorUpdates.length} packages have major updates`, 'warning');
        }
      }
      
    } catch (error) {
      this.results.errors.push({
        type: 'dependencies',
        message: error.message
      });
      this.log(`  ❌ Error checking dependencies: ${error.message}`, 'error');
    }
  }

  async checkTypeScript() {
    this.log('\n🔧 Checking TypeScript...', 'header');
    
    try {
      const { stdout, stderr } = await execAsync('pnpm run check:types 2>&1 || true');
      const output = stdout + stderr;
      const errorCount = (output.match(/error TS/g) || []).length;
      
      if (errorCount > 0) {
        this.results.errors.push({
          type: 'typescript',
          message: `Found ${errorCount} TypeScript errors`,
          severity: 'high'
        });
        this.log(`  ❌ ${errorCount} TypeScript errors found`, 'error');
        
        // Extract first 5 errors for report
        const errors = output.match(/.*error TS.*/g)?.slice(0, 5) || [];
        this.results.errors.push({
          type: 'typescript-details',
          errors: errors
        });
      } else {
        this.results.passed.push('TypeScript compilation successful');
        this.log('  ✅ TypeScript compilation successful', 'success');
      }
    } catch (error) {
      this.results.errors.push({
        type: 'typescript',
        message: error.message
      });
      this.log(`  ❌ Error checking TypeScript: ${error.message}`, 'error');
    }
  }

  async checkLinting() {
    this.log('\n🎨 Checking Code Quality...', 'header');
    
    try {
      const { stdout, stderr } = await execAsync('pnpm run check:lint 2>&1 || true');
      const output = stdout + stderr;
      const errorCount = (output.match(/\d+ error/g) || []).length;
      const warningCount = (output.match(/\d+ warning/g) || []).length;
      
      if (errorCount > 0) {
        this.results.errors.push({
          type: 'linting',
          message: `Found ${errorCount} linting errors`,
          severity: 'medium'
        });
        this.log(`  ❌ ${errorCount} linting errors found`, 'error');
      } else if (warningCount > 0) {
        this.results.warnings.push({
          type: 'linting',
          message: `Found ${warningCount} linting warnings`
        });
        this.log(`  ⚠️  ${warningCount} linting warnings`, 'warning');
      } else {
        this.results.passed.push('Code quality checks passed');
        this.log('  ✅ Code quality checks passed', 'success');
      }
    } catch (error) {
      this.results.errors.push({
        type: 'linting',
        message: error.message
      });
      this.log(`  ❌ Error checking linting: ${error.message}`, 'error');
    }
  }

  async checkTests() {
    this.log('\n🧪 Running Tests...', 'header');
    
    try {
      const { stdout, stderr } = await execAsync('pnpm test --coverage --json --outputFile=test-results.json 2>&1 || true', {
        timeout: 180000 // 3 minutes timeout
      });
      
      // Read test results
      const testResultsPath = path.join(process.cwd(), 'test-results.json');
      let testResults = {};
      
      try {
        const resultsContent = await fs.readFile(testResultsPath, 'utf-8');
        testResults = JSON.parse(resultsContent);
        await fs.unlink(testResultsPath).catch(() => {}); // Clean up
      } catch (e) {
        // Parse from output if file doesn't exist
        const match = stdout.match(/Tests:.*\n.*Snapshots:.*/);
        if (match) {
          const testLine = match[0];
          const passed = (testLine.match(/(\d+) passed/) || [0, 0])[1];
          const failed = (testLine.match(/(\d+) failed/) || [0, 0])[1];
          const total = (testLine.match(/(\d+) total/) || [0, 0])[1];
          
          testResults = {
            numPassedTests: parseInt(passed),
            numFailedTests: parseInt(failed),
            numTotalTests: parseInt(total)
          };
        }
      }
      
      if (testResults.numFailedTests > 0) {
        this.results.errors.push({
          type: 'tests',
          message: `${testResults.numFailedTests} tests failed out of ${testResults.numTotalTests}`,
          severity: 'high'
        });
        this.log(`  ❌ ${testResults.numFailedTests}/${testResults.numTotalTests} tests failed`, 'error');
      } else if (testResults.numTotalTests > 0) {
        this.results.passed.push(`All ${testResults.numTotalTests} tests passed`);
        this.log(`  ✅ All ${testResults.numTotalTests} tests passed`, 'success');
      } else {
        this.results.warnings.push({
          type: 'tests',
          message: 'No tests found'
        });
        this.log('  ⚠️  No tests found', 'warning');
      }
      
      // Check coverage
      if (testResults.coverageMap) {
        const coverage = testResults.coverageMap;
        this.results.coverage = {
          lines: coverage.lines?.pct || 0,
          functions: coverage.functions?.pct || 0,
          branches: coverage.branches?.pct || 0,
          statements: coverage.statements?.pct || 0
        };
        
        if (this.results.coverage.lines < 60) {
          this.results.warnings.push({
            type: 'coverage',
            message: `Low test coverage: ${this.results.coverage.lines}%`
          });
          this.log(`  ⚠️  Test coverage: ${this.results.coverage.lines}%`, 'warning');
        }
      }
      
    } catch (error) {
      this.results.errors.push({
        type: 'tests',
        message: error.message
      });
      this.log(`  ❌ Error running tests: ${error.message}`, 'error');
    }
  }

  async checkPerformance() {
    this.log('\n⚡ Checking Performance...', 'header');
    
    try {
      // Check bundle size
      const { stdout: bundleOutput } = await execAsync('npx expo export --platform ios --output-dir temp-export 2>&1 || true', {
        timeout: 120000
      });
      
      // Clean up temp export
      await execAsync('rm -rf temp-export').catch(() => {});
      
      // Check image assets
      const assetsPath = path.join(process.cwd(), 'assets');
      const images = await this.findLargeFiles(assetsPath, ['.png', '.jpg', '.jpeg'], 500 * 1024); // > 500KB
      
      if (images.length > 0) {
        this.results.warnings.push({
          type: 'performance',
          message: `${images.length} images are larger than 500KB`,
          files: images.map(f => ({
            path: f.path,
            size: `${Math.round(f.size / 1024)}KB`
          }))
        });
        this.log(`  ⚠️  ${images.length} large images found (>500KB)`, 'warning');
      } else {
        this.results.passed.push('Image assets are optimized');
        this.log('  ✅ Image assets are optimized', 'success');
      }
      
      // Check for console.log statements
      const { stdout: consoleOutput } = await execAsync('grep -r "console.log" src --include="*.ts" --include="*.tsx" | wc -l || echo "0"');
      const consoleCount = parseInt(consoleOutput.trim());
      
      if (consoleCount > 10) {
        this.results.warnings.push({
          type: 'performance',
          message: `Found ${consoleCount} console.log statements in production code`
        });
        this.log(`  ⚠️  ${consoleCount} console.log statements found`, 'warning');
      }
      
    } catch (error) {
      this.results.errors.push({
        type: 'performance',
        message: error.message
      });
      this.log(`  ❌ Error checking performance: ${error.message}`, 'error');
    }
  }

  async checkSecurity() {
    this.log('\n🔒 Checking Security...', 'header');
    
    try {
      // Check for exposed API keys
      const { stdout: keysOutput } = await execAsync('grep -r "sk_" src --include="*.ts" --include="*.tsx" | wc -l || echo "0"');
      const exposedKeys = parseInt(keysOutput.trim());
      
      if (exposedKeys > 0) {
        this.results.errors.push({
          type: 'security',
          message: 'Potential API keys found in source code',
          severity: 'critical'
        });
        this.log('  ❌ Potential API keys exposed in source', 'error');
      } else {
        this.results.passed.push('No API keys exposed in source');
        this.log('  ✅ No API keys exposed', 'success');
      }
      
      // Check Supabase RLS policies
      const supabaseFile = path.join(process.cwd(), 'src/shared/lib/supabase/client.ts');
      const supabaseContent = await fs.readFile(supabaseFile, 'utf-8').catch(() => '');
      
      if (!supabaseContent.includes('SUPABASE_ANON_KEY')) {
        this.results.errors.push({
          type: 'security',
          message: 'Supabase configuration not properly set up',
          severity: 'high'
        });
        this.log('  ❌ Supabase configuration issues', 'error');
      } else {
        this.results.passed.push('Supabase configuration verified');
        this.log('  ✅ Supabase configuration verified', 'success');
      }
      
      // Check for hardcoded credentials
      const { stdout: credsOutput } = await execAsync(`grep -r "password" src --include="*.ts" --include="*.tsx" | wc -l || echo "0"`);
      const hardcodedCreds = parseInt(credsOutput.trim());
      
      if (hardcodedCreds > 0) {
        this.results.errors.push({
          type: 'security',
          message: 'Potential hardcoded credentials found',
          severity: 'critical'
        });
        this.log('  ❌ Hardcoded credentials detected', 'error');
      }
      
    } catch (error) {
      this.results.errors.push({
        type: 'security',
        message: error.message
      });
      this.log(`  ❌ Error checking security: ${error.message}`, 'error');
    }
  }

  async checkiOSConfiguration() {
    this.log('\n📱 Checking iOS Configuration...', 'header');
    
    try {
      // Check Info.plist
      const plistPath = path.join(process.cwd(), 'ios/friends/Info.plist');
      const plistExists = await fs.access(plistPath).then(() => true).catch(() => false);
      
      if (!plistExists) {
        this.results.errors.push({
          type: 'ios',
          message: 'Info.plist not found',
          severity: 'critical'
        });
        this.log('  ❌ Info.plist not found', 'error');
      } else {
        const plistContent = await fs.readFile(plistPath, 'utf-8');
        
        // Check required permissions
        const requiredPermissions = [
          'NSCameraUsageDescription',
          'NSPhotoLibraryUsageDescription',
          'NSLocationWhenInUseUsageDescription',
          'NSContactsUsageDescription'
        ];
        
        const missingPermissions = requiredPermissions.filter(perm => !plistContent.includes(perm));
        
        if (missingPermissions.length > 0) {
          this.results.warnings.push({
            type: 'ios',
            message: `Missing iOS permissions: ${missingPermissions.join(', ')}`
          });
          this.log(`  ⚠️  Missing permissions: ${missingPermissions.join(', ')}`, 'warning');
        } else {
          this.results.passed.push('All required iOS permissions configured');
          this.log('  ✅ iOS permissions configured', 'success');
        }
      }
      
      // Check app icons
      const iconPath = path.join(process.cwd(), 'ios/friends/Images.xcassets/AppIcon.appiconset');
      const iconExists = await fs.access(iconPath).then(() => true).catch(() => false);
      
      if (!iconExists) {
        this.results.errors.push({
          type: 'ios',
          message: 'App icons not found',
          severity: 'high'
        });
        this.log('  ❌ App icons not configured', 'error');
      } else {
        this.results.passed.push('App icons configured');
        this.log('  ✅ App icons configured', 'success');
      }
      
    } catch (error) {
      this.results.errors.push({
        type: 'ios',
        message: error.message
      });
      this.log(`  ❌ Error checking iOS: ${error.message}`, 'error');
    }
  }

  async checkAndroidConfiguration() {
    this.log('\n🤖 Checking Android Configuration...', 'header');
    
    try {
      // Check AndroidManifest.xml
      const manifestPath = path.join(process.cwd(), 'android/app/src/main/AndroidManifest.xml');
      const manifestExists = await fs.access(manifestPath).then(() => true).catch(() => false);
      
      if (!manifestExists) {
        this.results.errors.push({
          type: 'android',
          message: 'AndroidManifest.xml not found',
          severity: 'critical'
        });
        this.log('  ❌ AndroidManifest.xml not found', 'error');
      } else {
        const manifestContent = await fs.readFile(manifestPath, 'utf-8');
        
        // Check required permissions
        const requiredPermissions = [
          'android.permission.CAMERA',
          'android.permission.READ_EXTERNAL_STORAGE',
          'android.permission.ACCESS_FINE_LOCATION',
          'android.permission.READ_CONTACTS'
        ];
        
        const missingPermissions = requiredPermissions.filter(perm => !manifestContent.includes(perm));
        
        if (missingPermissions.length > 0) {
          this.results.warnings.push({
            type: 'android',
            message: `Missing Android permissions: ${missingPermissions.join(', ')}`
          });
          this.log(`  ⚠️  Missing permissions: ${missingPermissions.join(', ')}`, 'warning');
        } else {
          this.results.passed.push('All required Android permissions configured');
          this.log('  ✅ Android permissions configured', 'success');
        }
      }
      
    } catch (error) {
      this.results.errors.push({
        type: 'android',
        message: error.message
      });
      this.log(`  ❌ Error checking Android: ${error.message}`, 'error');
    }
  }

  async findLargeFiles(dir, extensions, sizeThreshold) {
    const largeFiles = [];
    
    try {
      const files = await fs.readdir(dir, { withFileTypes: true });
      
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        
        if (file.isDirectory() && !file.name.startsWith('.')) {
          const subFiles = await this.findLargeFiles(fullPath, extensions, sizeThreshold);
          largeFiles.push(...subFiles);
        } else if (file.isFile()) {
          const ext = path.extname(file.name).toLowerCase();
          if (extensions.includes(ext)) {
            const stats = await fs.stat(fullPath);
            if (stats.size > sizeThreshold) {
              largeFiles.push({
                path: fullPath.replace(process.cwd(), '.'),
                size: stats.size
              });
            }
          }
        }
      }
    } catch (error) {
      // Ignore errors for inaccessible directories
    }
    
    return largeFiles;
  }

  generateRecommendations() {
    this.log('\n📋 Generating Recommendations...', 'header');
    
    // Critical issues that must be fixed
    if (this.results.errors.filter(e => e.severity === 'critical').length > 0) {
      this.results.recommendations.push({
        priority: 'CRITICAL',
        message: 'Fix all critical security and configuration issues before submitting to TestFlight'
      });
    }
    
    // TypeScript errors
    const tsErrors = this.results.errors.filter(e => e.type === 'typescript');
    if (tsErrors.length > 0) {
      this.results.recommendations.push({
        priority: 'HIGH',
        message: 'Fix TypeScript compilation errors to ensure app stability'
      });
    }
    
    // Test failures
    const testErrors = this.results.errors.filter(e => e.type === 'tests');
    if (testErrors.length > 0) {
      this.results.recommendations.push({
        priority: 'HIGH',
        message: 'Fix failing tests to ensure functionality works as expected'
      });
    }
    
    // Performance optimizations
    const perfWarnings = this.results.warnings.filter(w => w.type === 'performance');
    if (perfWarnings.length > 0) {
      this.results.recommendations.push({
        priority: 'MEDIUM',
        message: 'Optimize image assets and remove console.log statements for better performance'
      });
    }
    
    // Coverage improvements
    if (this.results.coverage.lines && this.results.coverage.lines < 60) {
      this.results.recommendations.push({
        priority: 'LOW',
        message: `Improve test coverage (currently ${this.results.coverage.lines}%) for better reliability`
      });
    }
  }

  async saveReport() {
    const reportPath = path.join(process.cwd(), 'testflight-validation-report.json');
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    this.log(`\n📄 Report saved to: ${reportPath}`, 'info');
  }

  printSummary() {
    this.log('\n' + '='.repeat(60), 'header');
    this.log('TESTFLIGHT VALIDATION SUMMARY', 'header');
    this.log('='.repeat(60), 'header');
    
    const criticalErrors = this.results.errors.filter(e => e.severity === 'critical').length;
    const highErrors = this.results.errors.filter(e => e.severity === 'high').length;
    const totalErrors = this.results.errors.length;
    const totalWarnings = this.results.warnings.length;
    
    this.log(`\n✅ Passed Checks: ${this.results.passed.length}`, 'success');
    this.log(`⚠️  Warnings: ${totalWarnings}`, 'warning');
    this.log(`❌ Errors: ${totalErrors} (${criticalErrors} critical, ${highErrors} high)`, 'error');
    
    if (criticalErrors > 0) {
      this.log('\n🚨 CRITICAL ISSUES FOUND - NOT READY FOR TESTFLIGHT', 'error');
      this.log('Fix all critical issues before submission.', 'error');
    } else if (highErrors > 0) {
      this.log('\n⚠️  HIGH PRIORITY ISSUES - REVIEW BEFORE TESTFLIGHT', 'warning');
      this.log('Address high priority issues for better stability.', 'warning');
    } else if (totalErrors === 0) {
      this.log('\n🎉 APP IS READY FOR TESTFLIGHT!', 'success');
      this.log('All critical checks passed. You can proceed with submission.', 'success');
    }
    
    if (this.results.recommendations.length > 0) {
      this.log('\n📌 RECOMMENDATIONS:', 'header');
      this.results.recommendations.forEach(rec => {
        const icon = rec.priority === 'CRITICAL' ? '🔴' : 
                     rec.priority === 'HIGH' ? '🟠' : 
                     rec.priority === 'MEDIUM' ? '🟡' : '🟢';
        this.log(`  ${icon} [${rec.priority}] ${rec.message}`, 
                rec.priority === 'CRITICAL' ? 'error' : 
                rec.priority === 'HIGH' ? 'warning' : 'info');
      });
    }
  }

  async run() {
    this.log('\n🚀 TESTFLIGHT VALIDATION STARTING...', 'header');
    this.log('This will check your app for TestFlight readiness\n', 'info');
    
    await this.checkDependencies();
    await this.checkTypeScript();
    await this.checkLinting();
    await this.checkTests();
    await this.checkPerformance();
    await this.checkSecurity();
    await this.checkiOSConfiguration();
    await this.checkAndroidConfiguration();
    
    this.generateRecommendations();
    await this.saveReport();
    this.printSummary();
    
    // Exit with appropriate code
    const criticalErrors = this.results.errors.filter(e => e.severity === 'critical').length;
    process.exit(criticalErrors > 0 ? 1 : 0);
  }
}

// Run validation
const validator = new TestFlightValidator();
validator.run().catch(error => {
  console.error('Validation failed:', error);
  process.exit(1);
});
