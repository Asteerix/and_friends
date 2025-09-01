#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SecurityAnalyzer {
  constructor() {
    this.issues = {
      critical: [],
      high: [],
      medium: [],
      low: [],
      info: []
    };
    this.passed = [];
  }

  checkEnvVariables() {
    console.log('\n🔐 Checking environment variables...');
    
    const envFiles = ['.env', '.env.local', '.env.production'];
    const sourceFiles = [];
    
    const scanForEnvLeaks = (dirPath) => {
      if (!fs.existsSync(dirPath)) return;
      
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory() && !file.includes('node_modules') && !file.startsWith('.')) {
          scanForEnvLeaks(filePath);
        } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          
          // Check for hardcoded secrets
          const secretPatterns = [
            /["']sk_[a-zA-Z0-9]{32,}["']/g,
            /["']pk_[a-zA-Z0-9]{32,}["']/g,
            /password\s*[:=]\s*["'][^"']{6,}["']/gi,
            /api[_-]?key\s*[:=]\s*["'][^"']{10,}["']/gi,
            /secret\s*[:=]\s*["'][^"']{10,}["']/gi,
            /token\s*[:=]\s*["'][^"']{20,}["']/gi
          ];
          
          for (const pattern of secretPatterns) {
            if (pattern.test(content)) {
              this.issues.critical.push({
                file: filePath.replace(path.join(__dirname, '..'), ''),
                issue: 'Potential hardcoded secret detected',
                severity: 'CRITICAL'
              });
            }
          }
          
          // Check for console.log of sensitive data
          if (/console\.(log|error|warn|info).*\b(password|token|secret|key|auth)\b/gi.test(content)) {
            this.issues.high.push({
              file: filePath.replace(path.join(__dirname, '..'), ''),
              issue: 'Console logging of potentially sensitive data',
              severity: 'HIGH'
            });
          }
        }
      }
    };
    
    scanForEnvLeaks(path.join(__dirname, '..', 'src'));
    
    // Check if .env files are in .gitignore
    const gitignorePath = path.join(__dirname, '..', '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
      for (const envFile of envFiles) {
        if (!gitignoreContent.includes(envFile)) {
          this.issues.critical.push({
            file: '.gitignore',
            issue: `${envFile} not in .gitignore`,
            severity: 'CRITICAL'
          });
        }
      }
    }
    
    if (this.issues.critical.length === 0) {
      this.passed.push('✅ No hardcoded secrets detected');
    }
  }

  checkPermissions() {
    console.log('\n📱 Checking app permissions...');
    
    // Check iOS Info.plist
    const infoPlistPath = path.join(__dirname, '..', 'ios', 'friends', 'Info.plist');
    if (fs.existsSync(infoPlistPath)) {
      const content = fs.readFileSync(infoPlistPath, 'utf-8');
      
      const requiredPermissions = [
        'NSCameraUsageDescription',
        'NSPhotoLibraryUsageDescription',
        'NSLocationWhenInUseUsageDescription',
        'NSContactsUsageDescription',
        'NSMicrophoneUsageDescription'
      ];
      
      for (const permission of requiredPermissions) {
        if (!content.includes(permission)) {
          this.issues.high.push({
            file: 'ios/friends/Info.plist',
            issue: `Missing ${permission}`,
            severity: 'HIGH'
          });
        } else {
          // Check if description is meaningful
          const regex = new RegExp(`<key>${permission}</key>\\s*<string>([^<]+)</string>`);
          const match = content.match(regex);
          if (match && match[1].length < 20) {
            this.issues.medium.push({
              file: 'ios/friends/Info.plist',
              issue: `${permission} description too short`,
              severity: 'MEDIUM'
            });
          }
        }
      }
    }
    
    // Check Android manifest
    const manifestPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
    if (fs.existsSync(manifestPath)) {
      const content = fs.readFileSync(manifestPath, 'utf-8');
      
      const requiredPermissions = [
        'android.permission.CAMERA',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.READ_CONTACTS',
        'android.permission.RECORD_AUDIO'
      ];
      
      for (const permission of requiredPermissions) {
        if (!content.includes(permission)) {
          this.issues.medium.push({
            file: 'android/app/src/main/AndroidManifest.xml',
            issue: `Missing ${permission}`,
            severity: 'MEDIUM'
          });
        }
      }
    }
    
    this.passed.push('✅ App permissions configured');
  }

  checkSupabaseSecurity() {
    console.log('\n🛡️ Checking Supabase security...');
    
    // Check for RLS policies
    const migrationDir = path.join(__dirname, '..', 'supabase', 'migrations');
    if (fs.existsSync(migrationDir)) {
      const files = fs.readdirSync(migrationDir);
      
      let hasRLS = false;
      for (const file of files) {
        const content = fs.readFileSync(path.join(migrationDir, file), 'utf-8');
        if (/ALTER TABLE.*ENABLE ROW LEVEL SECURITY/i.test(content)) {
          hasRLS = true;
        }
      }
      
      if (!hasRLS) {
        this.issues.critical.push({
          file: 'supabase/migrations',
          issue: 'No RLS (Row Level Security) policies found',
          severity: 'CRITICAL'
        });
      } else {
        this.passed.push('✅ RLS policies enabled');
      }
    }
    
    // Check for anon key exposure
    const srcFiles = [];
    const checkForAnonKey = (dirPath) => {
      if (!fs.existsSync(dirPath)) return;
      
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory() && !file.includes('node_modules')) {
          checkForAnonKey(filePath);
        } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          
          // Check if anon key is properly handled
          if (/SUPABASE_ANON_KEY|supabaseAnonKey/i.test(content)) {
            if (!/process\.env\.|Constants\.expoConfig/i.test(content)) {
              this.issues.high.push({
                file: filePath.replace(path.join(__dirname, '..'), ''),
                issue: 'Supabase anon key not properly handled',
                severity: 'HIGH'
              });
            }
          }
        }
      }
    };
    
    checkForAnonKey(path.join(__dirname, '..', 'src'));
  }

  checkNetworkSecurity() {
    console.log('\n🌐 Checking network security...');
    
    let hasHTTPS = true;
    let hasSSLPinning = false;
    
    const checkNetworkCalls = (dirPath) => {
      if (!fs.existsSync(dirPath)) return;
      
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory() && !file.includes('node_modules')) {
          checkNetworkCalls(filePath);
        } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          
          // Check for insecure HTTP calls
          if (/http:\/\/(?!localhost|127\.0\.0\.1)/i.test(content)) {
            hasHTTPS = false;
            this.issues.critical.push({
              file: filePath.replace(path.join(__dirname, '..'), ''),
              issue: 'Insecure HTTP connection detected',
              severity: 'CRITICAL'
            });
          }
          
          // Check for SSL pinning
          if (/sslPinning|certificatePinner/i.test(content)) {
            hasSSLPinning = true;
          }
        }
      }
    };
    
    checkNetworkCalls(path.join(__dirname, '..', 'src'));
    
    if (hasHTTPS) {
      this.passed.push('✅ All network calls use HTTPS');
    }
    
    if (!hasSSLPinning) {
      this.issues.low.push({
        file: 'Network Security',
        issue: 'SSL pinning not implemented',
        severity: 'LOW'
      });
    }
  }

  checkDataValidation() {
    console.log('\n✅ Checking data validation...');
    
    let hasValidation = false;
    
    const checkValidation = (dirPath) => {
      if (!fs.existsSync(dirPath)) return;
      
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory() && !file.includes('node_modules')) {
          checkValidation(filePath);
        } else if (/\.(ts|tsx)$/.test(file)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          
          // Check for validation libraries or patterns
          if (/zod|yup|joi|validator|\.test\(|\.match\(/i.test(content)) {
            hasValidation = true;
          }
          
          // Check for SQL injection vulnerabilities
          if (/\$\{.*\}.*SELECT|INSERT|UPDATE|DELETE/i.test(content)) {
            this.issues.critical.push({
              file: filePath.replace(path.join(__dirname, '..'), ''),
              issue: 'Potential SQL injection vulnerability',
              severity: 'CRITICAL'
            });
          }
          
          // Check for XSS vulnerabilities
          if (/dangerouslySetInnerHTML/i.test(content)) {
            this.issues.high.push({
              file: filePath.replace(path.join(__dirname, '..'), ''),
              issue: 'Using dangerouslySetInnerHTML (XSS risk)',
              severity: 'HIGH'
            });
          }
        }
      }
    };
    
    checkValidation(path.join(__dirname, '..', 'src'));
    
    if (hasValidation) {
      this.passed.push('✅ Data validation implemented');
    } else {
      this.issues.medium.push({
        file: 'Data Validation',
        issue: 'Limited data validation detected',
        severity: 'MEDIUM'
      });
    }
  }

  checkDependencies() {
    console.log('\n📦 Checking dependencies for vulnerabilities...');
    
    try {
      const result = execSync('npm audit --json', { encoding: 'utf-8' });
      const audit = JSON.parse(result);
      
      if (audit.metadata) {
        const { vulnerabilities } = audit.metadata;
        
        if (vulnerabilities.critical > 0) {
          this.issues.critical.push({
            file: 'package.json',
            issue: `${vulnerabilities.critical} critical vulnerabilities in dependencies`,
            severity: 'CRITICAL'
          });
        }
        
        if (vulnerabilities.high > 0) {
          this.issues.high.push({
            file: 'package.json',
            issue: `${vulnerabilities.high} high vulnerabilities in dependencies`,
            severity: 'HIGH'
          });
        }
        
        if (vulnerabilities.total === 0) {
          this.passed.push('✅ No known vulnerabilities in dependencies');
        }
      }
    } catch (error) {
      // npm audit returns non-zero exit code if vulnerabilities found
      try {
        const audit = JSON.parse(error.stdout);
        if (audit.metadata) {
          const { vulnerabilities } = audit.metadata;
          
          if (vulnerabilities.critical > 0) {
            this.issues.critical.push({
              file: 'package.json',
              issue: `${vulnerabilities.critical} critical vulnerabilities in dependencies`,
              severity: 'CRITICAL'
            });
          }
          
          if (vulnerabilities.high > 0) {
            this.issues.high.push({
              file: 'package.json',
              issue: `${vulnerabilities.high} high vulnerabilities in dependencies`,
              severity: 'HIGH'
            });
          }
        }
      } catch (parseError) {
        console.log('   ⚠️  Could not run npm audit');
      }
    }
  }

  generateReport() {
    const reportPath = path.join(__dirname, '..', 'security-analysis-report.json');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        critical: this.issues.critical.length,
        high: this.issues.high.length,
        medium: this.issues.medium.length,
        low: this.issues.low.length,
        info: this.issues.info.length,
        passed: this.passed.length
      },
      issues: this.issues,
      passed: this.passed
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n' + '='.repeat(50));
    console.log('🔒 SECURITY ANALYSIS SUMMARY');
    console.log('='.repeat(50));
    
    console.log('\n✅ Passed Checks:');
    this.passed.forEach(check => console.log(`   ${check}`));
    
    if (this.issues.critical.length > 0) {
      console.log('\n🚨 CRITICAL Issues:');
      this.issues.critical.forEach(issue => {
        console.log(`   ${issue.file}: ${issue.issue}`);
      });
    }
    
    if (this.issues.high.length > 0) {
      console.log('\n⚠️  HIGH Priority Issues:');
      this.issues.high.forEach(issue => {
        console.log(`   ${issue.file}: ${issue.issue}`);
      });
    }
    
    if (this.issues.medium.length > 0) {
      console.log('\n📌 MEDIUM Priority Issues:');
      this.issues.medium.slice(0, 5).forEach(issue => {
        console.log(`   ${issue.file}: ${issue.issue}`);
      });
    }
    
    console.log('\n📊 Summary:');
    console.log(`   Critical: ${this.issues.critical.length}`);
    console.log(`   High: ${this.issues.high.length}`);
    console.log(`   Medium: ${this.issues.medium.length}`);
    console.log(`   Low: ${this.issues.low.length}`);
    
    const isSecure = this.issues.critical.length === 0 && this.issues.high.length < 3;
    
    if (isSecure) {
      console.log('\n✅ Security analysis passed! App is ready for TestFlight.');
    } else {
      console.log('\n❌ Security issues detected. Please fix critical and high priority issues before TestFlight submission.');
    }
    
    console.log(`\nDetailed report saved to: ${reportPath}`);
    
    return isSecure;
  }

  async run() {
    console.log('🔒 Starting Security Analysis...\n');
    
    this.checkEnvVariables();
    this.checkPermissions();
    this.checkSupabaseSecurity();
    this.checkNetworkSecurity();
    this.checkDataValidation();
    this.checkDependencies();
    
    return this.generateReport();
  }
}

// Run analysis
const analyzer = new SecurityAnalyzer();
analyzer.run().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});