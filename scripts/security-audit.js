#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔒 Starting Security Audit for And Friends App...\n');

const securityIssues = [];
const warnings = [];
const recommendations = [];

// 1. Check for hardcoded secrets
console.log('🔍 Checking for hardcoded secrets...');

function scanForSecrets(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];
    
    // Common secret patterns
    const secretPatterns = [
      { pattern: /sk_live_[a-zA-Z0-9]+/, description: 'Stripe Live Secret Key' },
      { pattern: /sk_test_[a-zA-Z0-9]+/, description: 'Stripe Test Secret Key' },
      { pattern: /pk_live_[a-zA-Z0-9]+/, description: 'Stripe Live Publishable Key' },
      { pattern: /AKIA[0-9A-Z]{16}/, description: 'AWS Access Key' },
      { pattern: /AIza[0-9A-Za-z_-]{35}/, description: 'Google API Key' },
      { pattern: /ya29\\.[0-9A-Za-z_-]+/, description: 'Google OAuth Token' },
      { pattern: /xox[bp]-[0-9]{12}-[0-9]{12}-[0-9a-zA-Z]{24}/, description: 'Slack Token' },
      { pattern: /ghp_[a-zA-Z0-9]{36}/, description: 'GitHub Personal Access Token' },
      { pattern: /eyJ[A-Za-z0-9_/+-]*\\.eyJ[A-Za-z0-9_/+-]*\\.[A-Za-z0-9_/+-]*/, description: 'JWT Token' },
      { pattern: /['"\\s]password['"\\s]*[:=]['"\\s]*[^'"\\s]{8,}/, description: 'Potential hardcoded password' },
      { pattern: /['"\\s]secret['"\\s]*[:=]['"\\s]*[^'"\\s]{8,}/, description: 'Potential hardcoded secret' }
    ];
    
    secretPatterns.forEach(({ pattern, description }) => {
      const matches = content.match(new RegExp(pattern, 'gi'));
      if (matches) {
        issues.push({
          file: filePath,
          issue: `Potential ${description} found`,
          matches: matches.length,
          severity: 'HIGH'
        });
      }
    });
    
    // Check for TODO/FIXME security comments
    const securityComments = content.match(/\/\/.*(?:TODO|FIXME|HACK|BUG).*(?:security|auth|password|token|key)/gi);
    if (securityComments) {
      warnings.push({
        file: filePath,
        issue: 'Security-related TODO/FIXME comments found',
        details: securityComments.slice(0, 3), // Show first 3
        severity: 'MEDIUM'
      });
    }
    
    return issues;
  } catch (error) {
    return [];
  }
}

// 2. Check file permissions and sensitive files
console.log('📁 Checking file permissions and sensitive files...');

const sensitiveFiles = [
  '.env',
  '.env.local', 
  '.env.production',
  'app.json',
  'app.config.js',
  'google-services.json',
  'GoogleService-Info.plist',
  'keystore.jks'
];

sensitiveFiles.forEach(fileName => {
  const filePath = path.join(process.cwd(), fileName);
  if (fs.existsSync(filePath)) {
    try {
      const stats = fs.statSync(filePath);
      const mode = stats.mode & parseInt('777', 8);
      
      if (mode & parseInt('044', 8)) { // World or group readable
        securityIssues.push({
          file: fileName,
          issue: 'Sensitive file has overly permissive permissions',
          permissions: mode.toString(8),
          severity: 'HIGH'
        });
      }
    } catch (error) {
      // Ignore permission check errors
    }
  }
});

// 3. Scan source files for secrets
console.log('🕵️  Scanning source files...');

const sourceExtensions = ['.js', '.jsx', '.ts', '.tsx', '.json'];

function walkDirectory(dir, callback) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !['node_modules', '.git', '.expo', 'dist'].includes(file)) {
      walkDirectory(filePath, callback);
    } else if (stat.isFile() && sourceExtensions.includes(path.extname(file))) {
      callback(filePath);
    }
  });
}

const srcDir = path.join(process.cwd(), 'src');
if (fs.existsSync(srcDir)) {
  walkDirectory(srcDir, (filePath) => {
    const issues = scanForSecrets(filePath);
    securityIssues.push(...issues);
  });
}

// 4. Check dependencies for vulnerabilities
console.log('📦 Checking dependencies for known vulnerabilities...');

try {
  const auditOutput = execSync('npm audit --json', { encoding: 'utf8' });
  const audit = JSON.parse(auditOutput);
  
  if (audit.vulnerabilities) {
    Object.entries(audit.vulnerabilities).forEach(([pkg, vuln]) => {
      if (vuln.severity === 'critical' || vuln.severity === 'high') {
        securityIssues.push({
          type: 'dependency',
          package: pkg,
          issue: `${vuln.severity.toUpperCase()} vulnerability in dependency`,
          details: vuln.title || 'Unknown vulnerability',
          severity: vuln.severity.toUpperCase()
        });
      } else if (vuln.severity === 'moderate') {
        warnings.push({
          type: 'dependency',
          package: pkg,
          issue: `MODERATE vulnerability in dependency`,
          details: vuln.title || 'Unknown vulnerability',
          severity: 'MEDIUM'
        });
      }
    });
  }
} catch (error) {
  warnings.push({
    issue: 'Could not run npm audit - please check manually',
    severity: 'MEDIUM'
  });
}

// 5. Check app configuration security
console.log('⚙️  Checking app configuration...');

// Check app.json/app.config.js for security settings
const configFiles = ['app.json', 'app.config.js'];
configFiles.forEach(configFile => {
  const configPath = path.join(process.cwd(), configFile);
  if (fs.existsSync(configPath)) {
    try {
      let config;
      if (configFile.endsWith('.json')) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      } else {
        // For .js config files, just read as text for basic checks
        const content = fs.readFileSync(configPath, 'utf8');
        if (content.includes('allowsBackup')) {
          warnings.push({
            file: configFile,
            issue: 'Android allowsBackup setting found - ensure it\'s set to false for production',
            severity: 'MEDIUM'
          });
        }
      }
      
      if (config && config.expo) {
        // Check for debug settings in production
        if (config.expo.developer && config.expo.developer.tool) {
          warnings.push({
            file: configFile,
            issue: 'Developer tools configuration found - should be removed for production',
            severity: 'MEDIUM'
          });
        }
        
        // Check for permissive network security
        if (config.expo.android && config.expo.android.networkSecurityConfig) {
          recommendations.push({
            file: configFile,
            issue: 'Custom network security config detected - ensure it enforces HTTPS',
            severity: 'LOW'
          });
        }
      }
    } catch (error) {
      // Ignore parsing errors
    }
  }
});

// 6. Check for proper error handling and logging
console.log('🪵 Checking error handling and logging practices...');

const errorHandlingPatterns = [
  { pattern: /console\.log\(.*(?:password|token|key|secret)/gi, issue: 'Sensitive data logged to console' },
  { pattern: /alert\(.*(?:password|token|key|secret)/gi, issue: 'Sensitive data shown in alerts' },
  { pattern: /throw new Error\([^)]*(?:password|token|key|secret)/gi, issue: 'Sensitive data in error messages' }
];

walkDirectory(srcDir, (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  
  errorHandlingPatterns.forEach(({ pattern, issue }) => {
    const matches = content.match(pattern);
    if (matches) {
      securityIssues.push({
        file: filePath,
        issue: issue,
        matches: matches.length,
        severity: 'HIGH'
      });
    }
  });
});

// 7. Check React Native specific security issues
console.log('📱 Checking React Native specific security...');

walkDirectory(srcDir, (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check for WebView security
  if (content.includes('WebView') && !content.includes('allowsInlineMediaPlayback: false')) {
    warnings.push({
      file: filePath,
      issue: 'WebView usage detected - ensure proper security settings',
      severity: 'MEDIUM'
    });
  }
  
  // Check for dangerous permissions
  const dangerousPerms = ['android.permission.WRITE_EXTERNAL_STORAGE', 'android.permission.CAMERA'];
  dangerousPerms.forEach(perm => {
    if (content.includes(perm)) {
      recommendations.push({
        file: filePath,
        issue: `Dangerous permission ${perm} used - ensure it's necessary`,
        severity: 'LOW'
      });
    }
  });
});

// Generate Report
console.log('\n' + '='.repeat(80));
console.log('🔒 SECURITY AUDIT REPORT');
console.log('='.repeat(80));

console.log(`\\n📊 Summary:`);
console.log(`   🔴 Critical Issues: ${securityIssues.filter(i => i.severity === 'HIGH' || i.severity === 'CRITICAL').length}`);
console.log(`   🟡 Warnings: ${warnings.length + securityIssues.filter(i => i.severity === 'MEDIUM').length}`);
console.log(`   ℹ️  Recommendations: ${recommendations.length}`);

if (securityIssues.filter(i => i.severity === 'HIGH' || i.severity === 'CRITICAL').length > 0) {
  console.log('\\n🔴 CRITICAL SECURITY ISSUES:');
  securityIssues.filter(i => i.severity === 'HIGH' || i.severity === 'CRITICAL').forEach((issue, index) => {
    console.log(`${index + 1}. ${issue.issue}`);
    if (issue.file) console.log(`   📁 File: ${issue.file}`);
    if (issue.details) console.log(`   📝 Details: ${issue.details}`);
    console.log('');
  });
}

if (warnings.length > 0 || securityIssues.filter(i => i.severity === 'MEDIUM').length > 0) {
  console.log('🟡 WARNINGS:');
  [...warnings, ...securityIssues.filter(i => i.severity === 'MEDIUM')].forEach((warning, index) => {
    console.log(`${index + 1}. ${warning.issue}`);
    if (warning.file) console.log(`   📁 File: ${warning.file}`);
    if (warning.details) console.log(`   📝 Details: ${Array.isArray(warning.details) ? warning.details.join(', ') : warning.details}`);
    console.log('');
  });
}

if (recommendations.length > 0) {
  console.log('ℹ️  RECOMMENDATIONS:');
  recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec.issue}`);
    if (rec.file) console.log(`   📁 File: ${rec.file}`);
    console.log('');
  });
}

// Security Best Practices Checklist
console.log('\\n✅ SECURITY BEST PRACTICES CHECKLIST:');
console.log('   □ All secrets are stored in environment variables or secure storage');
console.log('   □ API endpoints use HTTPS only');
console.log('   □ Input validation is implemented on all user inputs');
console.log('   □ Authentication tokens are stored securely');
console.log('   □ Deep linking is properly validated');
console.log('   □ App uses certificate pinning for critical API calls');
console.log('   □ Debug mode is disabled in production builds');
console.log('   □ Biometric authentication is implemented where appropriate');
console.log('   □ Data is encrypted at rest using appropriate methods');
console.log('   □ Network traffic is encrypted (HTTPS/TLS)');

console.log('\\n🎯 NEXT STEPS:');
console.log('1. Fix all critical security issues immediately');
console.log('2. Review and address warnings');
console.log('3. Consider implementing recommendations');
console.log('4. Run this audit regularly (weekly recommended)');
console.log('5. Test security measures with penetration testing');

const criticalCount = securityIssues.filter(i => i.severity === 'HIGH' || i.severity === 'CRITICAL').length;
if (criticalCount > 0) {
  console.log('\\n❌ SECURITY AUDIT FAILED - Critical issues must be resolved before TestFlight deployment');
  process.exit(1);
} else {
  console.log('\\n✅ SECURITY AUDIT PASSED - Ready for TestFlight deployment');
  process.exit(0);
}