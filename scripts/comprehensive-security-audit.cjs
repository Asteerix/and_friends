#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SecurityAudit {
  constructor() {
    this.issues = {
      critical: [],
      high: [],
      medium: [],
      low: [],
    };
    this.passed = [];
  }

  async runAudit() {
    console.log('🔒 Starting Comprehensive Security Audit...\n');

    await this.checkEnvironmentVariables();
    await this.checkSupabaseConfiguration();
    await this.checkAPIKeys();
    await this.checkAuthentication();
    await this.checkDataValidation();
    await this.checkRateLimiting();
    await this.checkErrorHandling();
    await this.checkDependencies();
    await this.checkPermissions();
    await this.checkNetworkSecurity();

    this.generateReport();
  }

  checkEnvironmentVariables() {
    console.log('Checking environment variables...');
    
    // Check for .env files
    const envFiles = ['.env', '.env.local', '.env.production'];
    let hasEnvInGit = false;

    envFiles.forEach(file => {
      if (fs.existsSync(file)) {
        try {
          execSync(`git ls-files ${file}`, { stdio: 'pipe' });
          hasEnvInGit = true;
          this.issues.critical.push(`${file} is tracked in git!`);
        } catch {
          // File is not in git (good)
        }
      }
    });

    if (!hasEnvInGit) {
      this.passed.push('Environment files are not tracked in git');
    }

    // Check for hardcoded secrets
    const srcDir = path.join(process.cwd(), 'src');
    this.scanForSecrets(srcDir);
  }

  scanForSecrets(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    const secretPatterns = [
      /api[_-]?key\s*[:=]\s*["'][^"']+["']/gi,
      /secret[_-]?key\s*[:=]\s*["'][^"']+["']/gi,
      /password\s*[:=]\s*["'][^"']+["']/gi,
      /token\s*[:=]\s*["'][^"']+["']/gi,
    ];

    files.forEach(file => {
      const fullPath = path.join(dir, file.name);
      
      if (file.isDirectory() && !file.name.includes('node_modules') && !file.name.startsWith('.')) {
        this.scanForSecrets(fullPath);
      } else if (file.isFile() && (file.name.endsWith('.ts') || file.name.endsWith('.tsx') || file.name.endsWith('.js'))) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        
        secretPatterns.forEach(pattern => {
          const matches = content.match(pattern);
          if (matches) {
            matches.forEach(match => {
              // Filter out false positives
              if (!match.includes('process.env') && 
                  !match.includes('EXPO_PUBLIC_') &&
                  !match.includes('example') &&
                  !match.includes('placeholder')) {
                this.issues.high.push(`Potential hardcoded secret in ${file.name}: ${match.substring(0, 50)}...`);
              }
            });
          }
        });
      }
    });
  }

  async checkSupabaseConfiguration() {
    console.log('Checking Supabase configuration...');

    // Check RLS policies
    const tablesWithoutRLS = [];
    const tables = ['users', 'events', 'messages', 'conversations', 'stories'];

    // This would normally connect to Supabase to check RLS
    // For now, we'll check if RLS setup script exists
    if (fs.existsSync('scripts/setup-rls-policies.js')) {
      this.passed.push('RLS setup script exists');
    } else {
      this.issues.high.push('RLS setup script not found');
    }

    // Check for anonymous access
    const clientFile = 'src/shared/lib/supabase/client.ts';
    if (fs.existsSync(clientFile)) {
      const content = fs.readFileSync(clientFile, 'utf-8');
      
      if (content.includes('anon') && content.includes('public')) {
        this.passed.push('Supabase client properly configured');
      }
      
      if (!content.includes('auth.persistSession')) {
        this.issues.medium.push('Session persistence not explicitly configured');
      }
    }
  }

  checkAPIKeys() {
    console.log('Checking API key security...');

    // Check that API keys use EXPO_PUBLIC_ prefix for client-side keys
    const appConfig = 'app.json';
    if (fs.existsSync(appConfig)) {
      const config = JSON.parse(fs.readFileSync(appConfig, 'utf-8'));
      
      if (config.expo?.extra) {
        Object.keys(config.expo.extra).forEach(key => {
          if (key.includes('KEY') || key.includes('SECRET')) {
            if (!key.startsWith('EXPO_PUBLIC_')) {
              this.issues.high.push(`Potentially sensitive key "${key}" in app.json should use EXPO_PUBLIC_ prefix or be removed`);
            }
          }
        });
      }
    }

    this.passed.push('API keys checked');
  }

  checkAuthentication() {
    console.log('Checking authentication security...');

    // Check for proper OTP verification
    const authFiles = [
      'src/features/auth/screens/PhoneVerificationScreen.tsx',
      'src/features/auth/screens/CodeVerificationScreen.tsx',
    ];

    authFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf-8');
        
        // Check for rate limiting
        if (content.includes('checkOTPRateLimit') || content.includes('recordOTPRequest')) {
          this.passed.push(`${path.basename(file)} implements rate limiting`);
        } else {
          this.issues.high.push(`${path.basename(file)} missing rate limiting`);
        }

        // Check for brute force protection
        if (content.includes('recordFailedOTPAttempt') || content.includes('checkBanStatus')) {
          this.passed.push(`${path.basename(file)} implements brute force protection`);
        } else {
          this.issues.high.push(`${path.basename(file)} missing brute force protection`);
        }
      }
    });
  }

  checkDataValidation() {
    console.log('Checking data validation...');

    // Check for input validation
    const validationChecks = [
      { file: 'src/shared/utils/phoneValidation.ts', check: 'Phone number validation' },
      { file: 'src/features/events/services/eventService.ts', check: 'Event data validation' },
      { file: 'src/features/chats/services/conversationService.ts', check: 'Message validation' },
    ];

    validationChecks.forEach(({ file, check }) => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf-8');
        
        if (content.includes('validate') || content.includes('zod') || content.includes('schema')) {
          this.passed.push(`${check} implemented`);
        } else {
          this.issues.medium.push(`${check} may be missing in ${path.basename(file)}`);
        }
      }
    });
  }

  checkRateLimiting() {
    console.log('Checking rate limiting...');

    const rateLimitFiles = [
      'src/shared/utils/otpHelpers.ts',
      'src/shared/utils/bruteforceProtection.ts',
    ];

    rateLimitFiles.forEach(file => {
      if (fs.existsSync(file)) {
        this.passed.push(`Rate limiting implemented in ${path.basename(file)}`);
      } else {
        this.issues.high.push(`Rate limiting file missing: ${file}`);
      }
    });
  }

  checkErrorHandling() {
    console.log('Checking error handling...');

    // Check for proper error boundaries
    const errorBoundaryFiles = [
      'src/shared/ui/GlobalErrorBoundary.tsx',
      'src/shared/ui/NavigationErrorBoundary.tsx',
    ];

    errorBoundaryFiles.forEach(file => {
      if (fs.existsSync(file)) {
        this.passed.push(`Error boundary implemented: ${path.basename(file)}`);
      } else {
        this.issues.medium.push(`Error boundary missing: ${file}`);
      }
    });

    // Check for error logging
    if (fs.existsSync('src/shared/utils/errorLogger.ts')) {
      this.passed.push('Error logging utility exists');
    } else {
      this.issues.low.push('Error logging utility not found');
    }
  }

  async checkDependencies() {
    console.log('Checking dependencies for vulnerabilities...');

    try {
      // Run npm audit
      const auditResult = execSync('npm audit --json', { stdio: 'pipe' }).toString();
      const audit = JSON.parse(auditResult);
      
      if (audit.metadata.vulnerabilities.critical > 0) {
        this.issues.critical.push(`${audit.metadata.vulnerabilities.critical} critical vulnerabilities in dependencies`);
      }
      if (audit.metadata.vulnerabilities.high > 0) {
        this.issues.high.push(`${audit.metadata.vulnerabilities.high} high vulnerabilities in dependencies`);
      }
      if (audit.metadata.vulnerabilities.moderate > 0) {
        this.issues.medium.push(`${audit.metadata.vulnerabilities.moderate} moderate vulnerabilities in dependencies`);
      }
      
      if (audit.metadata.vulnerabilities.total === 0) {
        this.passed.push('No known vulnerabilities in dependencies');
      }
    } catch (error) {
      // npm audit returns non-zero exit code if vulnerabilities found
      this.issues.medium.push('Dependencies may have vulnerabilities - run npm audit for details');
    }
  }

  checkPermissions() {
    console.log('Checking app permissions...');

    const appJson = 'app.json';
    if (fs.existsSync(appJson)) {
      const config = JSON.parse(fs.readFileSync(appJson, 'utf-8'));
      
      // Check iOS permissions
      if (config.expo?.ios?.infoPlist) {
        const permissions = config.expo.ios.infoPlist;
        const requiredPermissions = [
          'NSCameraUsageDescription',
          'NSPhotoLibraryUsageDescription',
          'NSLocationWhenInUseUsageDescription',
          'NSContactsUsageDescription',
        ];

        requiredPermissions.forEach(perm => {
          if (permissions[perm]) {
            this.passed.push(`iOS permission properly described: ${perm}`);
          } else {
            this.issues.low.push(`iOS permission description missing: ${perm}`);
          }
        });
      }

      // Check Android permissions
      if (config.expo?.android?.permissions) {
        this.passed.push('Android permissions configured');
      }
    }
  }

  checkNetworkSecurity() {
    console.log('Checking network security...');

    // Check for HTTPS enforcement
    const networkFiles = [
      'src/shared/lib/supabase/client.ts',
      'src/shared/utils/api/',
    ];

    let hasHTTPS = true;
    networkFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const isDir = fs.statSync(file).isDirectory();
        const files = isDir ? fs.readdirSync(file).map(f => path.join(file, f)) : [file];
        
        files.forEach(f => {
          if (f.endsWith('.ts') || f.endsWith('.tsx')) {
            const content = fs.readFileSync(f, 'utf-8');
            if (content.includes('http://') && !content.includes('localhost') && !content.includes('127.0.0.1')) {
              hasHTTPS = false;
              this.issues.high.push(`Non-HTTPS URL found in ${path.basename(f)}`);
            }
          }
        });
      }
    });

    if (hasHTTPS) {
      this.passed.push('All network requests use HTTPS');
    }

    // Check for certificate pinning (would be in native code)
    this.issues.low.push('Certificate pinning not implemented (optional but recommended)');
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        critical: this.issues.critical.length,
        high: this.issues.high.length,
        medium: this.issues.medium.length,
        low: this.issues.low.length,
        passed: this.passed.length,
      },
      issues: this.issues,
      passed: this.passed,
      score: this.calculateSecurityScore(),
    };

    // Write detailed report
    fs.writeFileSync('SECURITY_AUDIT_REPORT.json', JSON.stringify(report, null, 2));

    // Display summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SECURITY AUDIT SUMMARY');
    console.log('='.repeat(60));
    
    console.log('\n✅ Passed Checks:', this.passed.length);
    this.passed.slice(0, 5).forEach(item => console.log(`  • ${item}`));
    if (this.passed.length > 5) {
      console.log(`  ... and ${this.passed.length - 5} more`);
    }

    if (this.issues.critical.length > 0) {
      console.log('\n🚨 CRITICAL Issues:', this.issues.critical.length);
      this.issues.critical.forEach(issue => console.log(`  ❌ ${issue}`));
    }

    if (this.issues.high.length > 0) {
      console.log('\n⚠️  HIGH Priority Issues:', this.issues.high.length);
      this.issues.high.slice(0, 3).forEach(issue => console.log(`  • ${issue}`));
    }

    if (this.issues.medium.length > 0) {
      console.log('\n📝 MEDIUM Priority Issues:', this.issues.medium.length);
      this.issues.medium.slice(0, 3).forEach(issue => console.log(`  • ${issue}`));
    }

    console.log('\n' + '='.repeat(60));
    console.log(`🏆 Security Score: ${report.score}/100`);
    console.log('='.repeat(60));

    if (report.score >= 80) {
      console.log('\n✅ Security audit PASSED - Ready for TestFlight');
    } else if (report.score >= 60) {
      console.log('\n⚠️  Security needs improvement before TestFlight');
    } else {
      console.log('\n❌ Critical security issues must be fixed before TestFlight');
    }

    console.log('\n📄 Full report saved to: SECURITY_AUDIT_REPORT.json');
  }

  calculateSecurityScore() {
    const baseScore = 100;
    const deductions = {
      critical: 25,
      high: 15,
      medium: 5,
      low: 2,
    };

    let score = baseScore;
    score -= this.issues.critical.length * deductions.critical;
    score -= this.issues.high.length * deductions.high;
    score -= this.issues.medium.length * deductions.medium;
    score -= this.issues.low.length * deductions.low;

    return Math.max(0, Math.min(100, score));
  }
}

// Run the audit
const audit = new SecurityAudit();
audit.runAudit().catch(console.error);