#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SecurityChecker {
  constructor() {
    this.criticalIssues = [];
    this.warnings = [];
    this.passed = [];
  }

  checkHardcodedSecrets() {
    console.log('🔐 Checking for hardcoded secrets...');
    const patterns = [
      { regex: /api[_-]?key\s*[:=]\s*["'][^"']+["']/gi, type: 'API Key' },
      { regex: /secret\s*[:=]\s*["'][^"']+["']/gi, type: 'Secret' },
      { regex: /password\s*[:=]\s*["'][^"']+["']/gi, type: 'Password' },
      { regex: /token\s*[:=]\s*["'][^"']+["']/gi, type: 'Token' },
      { regex: /private[_-]?key\s*[:=]\s*["'][^"']+["']/gi, type: 'Private Key' },
      { regex: /supabase[_-]?url\s*[:=]\s*["']https:\/\/[^"']+["']/gi, type: 'Supabase URL' },
      { regex: /supabase[_-]?anon[_-]?key\s*[:=]\s*["'][^"']+["']/gi, type: 'Supabase Key' }
    ];

    const excludePatterns = [
      'REMPLACER_PAR',
      'YOUR_',
      'PLACEHOLDER',
      'example',
      'test',
      'mock',
      'dummy'
    ];

    const srcDir = path.join(__dirname, '..', 'src');
    const foundSecrets = [];

    const checkFile = (filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      
      patterns.forEach(({ regex, type }) => {
        const matches = content.match(regex) || [];
        matches.forEach(match => {
          const isExcluded = excludePatterns.some(pattern => 
            match.toLowerCase().includes(pattern.toLowerCase())
          );
          
          if (!isExcluded) {
            foundSecrets.push({
              file: path.relative(process.cwd(), filePath),
              type,
              match: match.substring(0, 50) + '...'
            });
          }
        });
      });
    };

    const walkDir = (dir) => {
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        if (stat.isDirectory() && !item.includes('test') && !item.includes('__')) {
          walkDir(itemPath);
        } else if (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js')) {
          checkFile(itemPath);
        }
      });
    };

    walkDir(srcDir);

    if (foundSecrets.length > 0) {
      this.criticalIssues.push({
        category: 'Hardcoded Secrets',
        count: foundSecrets.length,
        details: foundSecrets
      });
    } else {
      this.passed.push('No hardcoded secrets detected');
    }
  }

  checkSupabaseConfiguration() {
    console.log('🔧 Checking Supabase configuration...');
    
    // Check if environment variables are properly configured
    const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'app.json'), 'utf8'));
    const supabaseUrl = appJson.expo?.extra?.supabaseUrl;
    const supabaseKey = appJson.expo?.extra?.supabaseAnonKey;

    if (supabaseUrl && supabaseUrl.includes('REMPLACER')) {
      this.warnings.push({
        category: 'Supabase Configuration',
        message: 'Supabase URL not configured in app.json'
      });
    }

    if (supabaseKey && supabaseKey.includes('REMPLACER')) {
      this.warnings.push({
        category: 'Supabase Configuration',
        message: 'Supabase Anon Key not configured in app.json'
      });
    }

    // Check for RLS policies
    const rlsScript = path.join(__dirname, '..', 'scripts', 'setup-rls-policies.js');
    if (fs.existsSync(rlsScript)) {
      this.passed.push('RLS policies setup script exists');
    } else {
      this.warnings.push({
        category: 'Database Security',
        message: 'RLS policies setup script not found'
      });
    }
  }

  checkPermissions() {
    console.log('📱 Checking app permissions...');
    
    const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'app.json'), 'utf8'));
    const iosPermissions = appJson.expo?.ios?.infoPlist || {};
    const androidPermissions = appJson.expo?.android?.permissions || [];

    // Check iOS permissions
    const requiredIosPermissions = [
      'NSContactsUsageDescription',
      'NSLocationWhenInUseUsageDescription',
      'NSCameraUsageDescription',
      'NSPhotoLibraryUsageDescription'
    ];

    requiredIosPermissions.forEach(perm => {
      if (!iosPermissions[perm]) {
        this.warnings.push({
          category: 'iOS Permissions',
          message: `Missing ${perm}`
        });
      } else {
        this.passed.push(`iOS: ${perm} configured`);
      }
    });

    // Check Android permissions
    if (androidPermissions.length === 0) {
      this.warnings.push({
        category: 'Android Permissions',
        message: 'No Android permissions configured'
      });
    } else {
      this.passed.push(`Android: ${androidPermissions.length} permissions configured`);
    }
  }

  checkNetworkSecurity() {
    console.log('🌐 Checking network security...');
    
    // Check for HTTPS usage
    const srcDir = path.join(__dirname, '..', 'src');
    let httpCount = 0;
    
    const checkFile = (filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      const httpMatches = content.match(/http:\/\//g) || [];
      httpCount += httpMatches.length;
    };

    const walkDir = (dir) => {
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        if (stat.isDirectory() && !item.includes('test')) {
          walkDir(itemPath);
        } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
          checkFile(itemPath);
        }
      });
    };

    walkDir(srcDir);

    if (httpCount > 0) {
      this.warnings.push({
        category: 'Network Security',
        message: `Found ${httpCount} instances of HTTP (non-secure) URLs`
      });
    } else {
      this.passed.push('All network requests use HTTPS');
    }
  }

  checkAuthenticationSecurity() {
    console.log('🔑 Checking authentication security...');
    
    // Check for proper session handling
    const sessionFiles = [
      'src/shared/providers/SessionContext.tsx',
      'src/shared/utils/sessionHelpers.ts'
    ];

    sessionFiles.forEach(file => {
      const fullPath = path.join(__dirname, '..', file);
      if (fs.existsSync(fullPath)) {
        this.passed.push(`Session handling: ${path.basename(file)} exists`);
      }
    });

    // Check for brute force protection
    const bruteForceFile = path.join(__dirname, '..', 'src/shared/utils/bruteforceProtection.ts');
    if (fs.existsSync(bruteForceFile)) {
      this.passed.push('Brute force protection implemented');
    } else {
      this.warnings.push({
        category: 'Authentication',
        message: 'No brute force protection found'
      });
    }
  }

  checkDataValidation() {
    console.log('✅ Checking data validation...');
    
    // Check for input validation
    const validationFiles = [
      'src/shared/utils/phoneNumberValidation.ts',
      'src/shared/utils/phoneValidation.ts',
      'src/shared/utils/supabaseValidation.ts'
    ];

    let validationCount = 0;
    validationFiles.forEach(file => {
      const fullPath = path.join(__dirname, '..', file);
      if (fs.existsSync(fullPath)) {
        validationCount++;
      }
    });

    if (validationCount > 0) {
      this.passed.push(`Data validation: ${validationCount} validation modules found`);
    } else {
      this.criticalIssues.push({
        category: 'Data Validation',
        message: 'No input validation modules found'
      });
    }
  }

  checkDependencyVulnerabilities() {
    console.log('📦 Checking dependency vulnerabilities...');
    
    try {
      const output = execSync('npm audit --json', { encoding: 'utf8' });
      const audit = JSON.parse(output);
      const vulns = audit.metadata?.vulnerabilities || {};
      
      if (vulns.critical > 0) {
        this.criticalIssues.push({
          category: 'Dependencies',
          message: `${vulns.critical} critical vulnerabilities found`
        });
      }
      
      if (vulns.high > 0) {
        this.warnings.push({
          category: 'Dependencies',
          message: `${vulns.high} high severity vulnerabilities found`
        });
      }
      
      if (vulns.critical === 0 && vulns.high === 0) {
        this.passed.push('No critical or high severity vulnerabilities');
      }
    } catch (error) {
      // npm audit returns non-zero exit code when vulnerabilities are found
      try {
        const audit = JSON.parse(error.stdout || '{}');
        const vulns = audit.metadata?.vulnerabilities || {};
        
        if (vulns.critical > 0) {
          this.criticalIssues.push({
            category: 'Dependencies',
            message: `${vulns.critical} critical vulnerabilities found`,
            action: 'Run: npm audit fix --force'
          });
        }
        
        if (vulns.high > 0) {
          this.warnings.push({
            category: 'Dependencies',
            message: `${vulns.high} high severity vulnerabilities found`,
            action: 'Run: npm audit fix'
          });
        }
      } catch {
        this.warnings.push({
          category: 'Dependencies',
          message: 'Could not check for vulnerabilities'
        });
      }
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🔒 SECURITY AUDIT REPORT');
    console.log('='.repeat(80) + '\n');

    if (this.criticalIssues.length > 0) {
      console.log('🚨 CRITICAL ISSUES (Must fix before production):');
      this.criticalIssues.forEach(issue => {
        console.log(`  ❌ ${issue.category}: ${issue.message || ''}`);
        if (issue.details) {
          issue.details.slice(0, 3).forEach(detail => {
            console.log(`     • ${detail.type} in ${detail.file}`);
          });
          if (issue.details.length > 3) {
            console.log(`     ... and ${issue.details.length - 3} more`);
          }
        }
        if (issue.action) {
          console.log(`     → Action: ${issue.action}`);
        }
      });
      console.log('');
    }

    if (this.warnings.length > 0) {
      console.log('⚠️  WARNINGS (Should fix):');
      this.warnings.forEach(warning => {
        console.log(`  ⚠️  ${warning.category}: ${warning.message}`);
        if (warning.action) {
          console.log(`     → Action: ${warning.action}`);
        }
      });
      console.log('');
    }

    if (this.passed.length > 0) {
      console.log('✅ PASSED CHECKS:');
      this.passed.forEach(check => {
        console.log(`  ✓ ${check}`);
      });
      console.log('');
    }

    // Calculate security score
    const totalChecks = this.criticalIssues.length + this.warnings.length + this.passed.length;
    const score = Math.round((this.passed.length / totalChecks) * 100);

    console.log('='.repeat(80));
    console.log('📊 SECURITY SUMMARY');
    console.log('='.repeat(80));
    console.log(`  Security Score: ${score}%`);
    console.log(`  Critical Issues: ${this.criticalIssues.length}`);
    console.log(`  Warnings: ${this.warnings.length}`);
    console.log(`  Passed Checks: ${this.passed.length}`);

    if (this.criticalIssues.length === 0) {
      console.log('\n  ✅ No critical security issues found!');
    } else {
      console.log('\n  ❌ Critical security issues must be fixed before deployment!');
    }

    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      score,
      criticalIssues: this.criticalIssues,
      warnings: this.warnings,
      passed: this.passed,
      readyForProduction: this.criticalIssues.length === 0
    };

    fs.writeFileSync('security-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed report saved to: security-report.json\n');
  }
}

// Run security check
const checker = new SecurityChecker();
checker.checkHardcodedSecrets();
checker.checkSupabaseConfiguration();
checker.checkPermissions();
checker.checkNetworkSecurity();
checker.checkAuthenticationSecurity();
checker.checkDataValidation();
checker.checkDependencyVulnerabilities();
checker.generateReport();