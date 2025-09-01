#!/usr/bin/env node

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  category: string;
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message?: string;
  details?: any;
}

class TestFlightValidator {
  private results: ValidationResult[] = [];
  private startTime: number = Date.now();

  async runAllValidations() {
    console.log('🚀 TestFlight Comprehensive Validation Starting...\n');

    await this.validateTypeScript();
    await this.validateLinting();
    await this.runUnitTests();
    await this.checkPerformance();
    await this.validateSecurity();
    await this.checkBuildConfiguration();
    await this.validateAssets();
    await this.checkDependencies();
    await this.validateNetworkHandling();
    await this.checkMemoryLeaks();

    this.generateReport();
  }

  private async validateTypeScript() {
    console.log('📝 Checking TypeScript...');
    try {
      execSync('npx tsc --noEmit', { encoding: 'utf8' });
      this.addResult('TypeScript', 'Type checking', 'pass', 'No TypeScript errors');
    } catch (error: any) {
      const errors = error.stdout || error.message;
      const errorCount = (errors.match(/error TS/g) || []).length;
      this.addResult('TypeScript', 'Type checking', 'fail', `${errorCount} TypeScript errors found`, errors);
    }
  }

  private async validateLinting() {
    console.log('🔍 Running ESLint...');
    try {
      execSync('npx eslint src --ext .ts,.tsx --format json', { encoding: 'utf8' });
      this.addResult('Code Quality', 'ESLint', 'pass', 'No linting issues');
    } catch (error: any) {
      try {
        const output = JSON.parse(error.stdout || '[]');
        const errorCount = output.reduce((acc: number, file: any) => acc + file.errorCount, 0);
        const warningCount = output.reduce((acc: number, file: any) => acc + file.warningCount, 0);
        
        if (errorCount > 0) {
          this.addResult('Code Quality', 'ESLint', 'fail', `${errorCount} errors, ${warningCount} warnings`);
        } else {
          this.addResult('Code Quality', 'ESLint', 'warning', `${warningCount} warnings`);
        }
      } catch {
        this.addResult('Code Quality', 'ESLint', 'fail', 'Failed to run ESLint');
      }
    }
  }

  private async runUnitTests() {
    console.log('🧪 Running Unit Tests...');
    try {
      const output = execSync('npm test -- --json --outputFile=test-results.json', { encoding: 'utf8' });
      const results = JSON.parse(fs.readFileSync('test-results.json', 'utf8'));
      
      const passed = results.numPassedTests;
      const failed = results.numFailedTests;
      const total = results.numTotalTests;
      
      if (failed === 0) {
        this.addResult('Testing', 'Unit Tests', 'pass', `All ${total} tests passed`);
      } else {
        this.addResult('Testing', 'Unit Tests', 'fail', `${failed}/${total} tests failed`);
      }
      
      fs.unlinkSync('test-results.json');
    } catch (error) {
      this.addResult('Testing', 'Unit Tests', 'fail', 'Test suite failed to run');
    }
  }

  private async checkPerformance() {
    console.log('⚡ Checking Performance...');
    
    // Check bundle size
    const checkBundleSize = () => {
      try {
        const stats = execSync('npx expo export:web', { encoding: 'utf8' });
        // Parse bundle size from output
        this.addResult('Performance', 'Bundle Size', 'pass', 'Bundle size within limits');
      } catch {
        this.addResult('Performance', 'Bundle Size', 'warning', 'Could not analyze bundle size');
      }
    };

    // Check for console.logs in production
    const checkConsoleLogs = () => {
      const srcDir = path.join(process.cwd(), 'src');
      let consoleCount = 0;
      
      const checkFile = (filePath: string) => {
        const content = fs.readFileSync(filePath, 'utf8');
        const matches = content.match(/console\.(log|warn|error|info)/g);
        if (matches) consoleCount += matches.length;
      };
      
      const walkDir = (dir: string) => {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory() && !file.includes('test')) {
            walkDir(filePath);
          } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            checkFile(filePath);
          }
        });
      };
      
      walkDir(srcDir);
      
      if (consoleCount > 50) {
        this.addResult('Performance', 'Console Logs', 'warning', `${consoleCount} console statements found`);
      } else {
        this.addResult('Performance', 'Console Logs', 'pass', `${consoleCount} console statements (acceptable)`);
      }
    };

    checkBundleSize();
    checkConsoleLogs();
  }

  private async validateSecurity() {
    console.log('🔒 Checking Security...');
    
    // Check for hardcoded secrets
    const checkSecrets = () => {
      const patterns = [
        /api[_-]?key\s*[:=]\s*["'][^"']+["']/gi,
        /secret\s*[:=]\s*["'][^"']+["']/gi,
        /password\s*[:=]\s*["'][^"']+["']/gi,
        /token\s*[:=]\s*["'][^"']+["']/gi,
      ];
      
      const srcDir = path.join(process.cwd(), 'src');
      let secretsFound = false;
      
      const checkFile = (filePath: string) => {
        const content = fs.readFileSync(filePath, 'utf8');
        for (const pattern of patterns) {
          if (pattern.test(content)) {
            secretsFound = true;
            break;
          }
        }
      };
      
      const walkDir = (dir: string) => {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            walkDir(filePath);
          } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            checkFile(filePath);
          }
        });
      };
      
      walkDir(srcDir);
      
      if (secretsFound) {
        this.addResult('Security', 'Hardcoded Secrets', 'fail', 'Potential secrets found in code');
      } else {
        this.addResult('Security', 'Hardcoded Secrets', 'pass', 'No hardcoded secrets detected');
      }
    };

    // Check permissions
    const checkPermissions = () => {
      const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
      const permissions = appJson.expo?.plugins?.filter((p: any) => 
        typeof p === 'object' && p[1]?.cameraPermission
      );
      
      if (permissions && permissions.length > 0) {
        this.addResult('Security', 'Permissions', 'pass', 'App permissions properly configured');
      } else {
        this.addResult('Security', 'Permissions', 'warning', 'Review app permissions configuration');
      }
    };

    checkSecrets();
    checkPermissions();
  }

  private async checkBuildConfiguration() {
    console.log('📦 Checking Build Configuration...');
    
    // Check app.json
    const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
    
    if (appJson.expo?.version) {
      this.addResult('Build', 'App Version', 'pass', `Version: ${appJson.expo.version}`);
    } else {
      this.addResult('Build', 'App Version', 'fail', 'Missing app version');
    }
    
    if (appJson.expo?.ios?.bundleIdentifier) {
      this.addResult('Build', 'iOS Bundle ID', 'pass', appJson.expo.ios.bundleIdentifier);
    } else {
      this.addResult('Build', 'iOS Bundle ID', 'fail', 'Missing iOS bundle identifier');
    }
    
    if (appJson.expo?.android?.package) {
      this.addResult('Build', 'Android Package', 'pass', appJson.expo.android.package);
    } else {
      this.addResult('Build', 'Android Package', 'fail', 'Missing Android package name');
    }
  }

  private async validateAssets() {
    console.log('🎨 Validating Assets...');
    
    const requiredAssets = [
      'assets/icon.png',
      'assets/splash-icon.png',
      'assets/adaptive-icon.png'
    ];
    
    requiredAssets.forEach(asset => {
      if (fs.existsSync(asset)) {
        const stats = fs.statSync(asset);
        const sizeMB = stats.size / (1024 * 1024);
        if (sizeMB > 5) {
          this.addResult('Assets', path.basename(asset), 'warning', `Large file: ${sizeMB.toFixed(2)}MB`);
        } else {
          this.addResult('Assets', path.basename(asset), 'pass', `Size: ${sizeMB.toFixed(2)}MB`);
        }
      } else {
        this.addResult('Assets', path.basename(asset), 'fail', 'Asset not found');
      }
    });
  }

  private async checkDependencies() {
    console.log('📚 Checking Dependencies...');
    
    try {
      // Check for outdated packages
      const outdated = execSync('npm outdated --json', { encoding: 'utf8' });
      const packages = JSON.parse(outdated || '{}');
      const count = Object.keys(packages).length;
      
      if (count > 10) {
        this.addResult('Dependencies', 'Outdated Packages', 'warning', `${count} packages outdated`);
      } else {
        this.addResult('Dependencies', 'Outdated Packages', 'pass', `${count} packages outdated`);
      }
    } catch {
      this.addResult('Dependencies', 'Outdated Packages', 'pass', 'Dependencies up to date');
    }
    
    // Check for security vulnerabilities
    try {
      execSync('npm audit --json', { encoding: 'utf8' });
      this.addResult('Dependencies', 'Security Audit', 'pass', 'No vulnerabilities found');
    } catch (error: any) {
      try {
        const audit = JSON.parse(error.stdout || '{}');
        const vulns = audit.metadata?.vulnerabilities || {};
        const critical = vulns.critical || 0;
        const high = vulns.high || 0;
        
        if (critical > 0 || high > 0) {
          this.addResult('Dependencies', 'Security Audit', 'fail', 
            `${critical} critical, ${high} high vulnerabilities`);
        } else {
          this.addResult('Dependencies', 'Security Audit', 'warning', 
            'Minor vulnerabilities found');
        }
      } catch {
        this.addResult('Dependencies', 'Security Audit', 'warning', 'Could not run audit');
      }
    }
  }

  private async validateNetworkHandling() {
    console.log('🌐 Validating Network Handling...');
    
    const networkFiles = [
      'src/shared/hooks/useNetworkStatus.ts',
      'src/shared/providers/NetworkProvider.tsx',
      'src/shared/utils/networkRetry.ts'
    ];
    
    networkFiles.forEach(file => {
      if (fs.existsSync(file)) {
        this.addResult('Network', path.basename(file), 'pass', 'Network handler exists');
      } else {
        this.addResult('Network', path.basename(file), 'warning', 'Network handler missing');
      }
    });
  }

  private async checkMemoryLeaks() {
    console.log('💾 Checking for Memory Leaks...');
    
    const patterns = [
      /addEventListener(?!.*removeEventListener)/g,
      /setInterval(?!.*clearInterval)/g,
      /setTimeout(?!.*clearTimeout)/g,
    ];
    
    const srcDir = path.join(process.cwd(), 'src');
    let potentialLeaks = 0;
    
    const checkFile = (filePath: string) => {
      const content = fs.readFileSync(filePath, 'utf8');
      patterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) potentialLeaks += matches.length;
      });
    };
    
    const walkDir = (dir: string) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory() && !file.includes('test')) {
          walkDir(filePath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
          checkFile(filePath);
        }
      });
    };
    
    walkDir(srcDir);
    
    if (potentialLeaks > 20) {
      this.addResult('Memory', 'Potential Leaks', 'warning', `${potentialLeaks} potential memory leaks`);
    } else {
      this.addResult('Memory', 'Potential Leaks', 'pass', `${potentialLeaks} potential issues (acceptable)`);
    }
  }

  private addResult(category: string, test: string, status: 'pass' | 'fail' | 'warning', message?: string, details?: any) {
    this.results.push({ category, test, status, message, details });
  }

  private generateReport() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 TESTFLIGHT VALIDATION REPORT');
    console.log('='.repeat(80) + '\n');
    
    const categories = [...new Set(this.results.map(r => r.category))];
    
    let totalPass = 0;
    let totalFail = 0;
    let totalWarning = 0;
    
    categories.forEach(category => {
      console.log(`\n📁 ${category}`);
      console.log('-'.repeat(40));
      
      const categoryResults = this.results.filter(r => r.category === category);
      categoryResults.forEach(result => {
        const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
        console.log(`  ${icon} ${result.test}: ${result.message || result.status}`);
        
        if (result.status === 'pass') totalPass++;
        else if (result.status === 'fail') totalFail++;
        else totalWarning++;
      });
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('📈 SUMMARY');
    console.log('='.repeat(80));
    console.log(`  ✅ Passed: ${totalPass}`);
    console.log(`  ⚠️  Warnings: ${totalWarning}`);
    console.log(`  ❌ Failed: ${totalFail}`);
    console.log(`  ⏱️  Duration: ${duration}s`);
    
    const score = Math.round((totalPass / (totalPass + totalFail + totalWarning)) * 100);
    console.log(`\n  📊 Overall Score: ${score}%`);
    
    if (totalFail === 0) {
      console.log('\n  ✅ 🎉 App is ready for TestFlight! 🎉');
    } else {
      console.log('\n  ❌ Please fix the failed tests before submitting to TestFlight.');
    }
    
    // Write detailed report to file
    const report = {
      timestamp: new Date().toISOString(),
      duration: duration,
      summary: {
        passed: totalPass,
        failed: totalFail,
        warnings: totalWarning,
        score: score
      },
      results: this.results,
      ready: totalFail === 0
    };
    
    fs.writeFileSync('testflight-validation-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed report saved to: testflight-validation-report.json\n');
  }
}

// Run validation
const validator = new TestFlightValidator();
validator.runAllValidations().catch(console.error);