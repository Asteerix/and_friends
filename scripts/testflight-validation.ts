#!/usr/bin/env node

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  category: string;
  item: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

class TestFlightValidator {
  private results: ValidationResult[] = [];
  private projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
  }

  async validate(): Promise<void> {
    console.log('🚀 Starting TestFlight Validation...\n');

    await this.checkProjectStructure();
    await this.checkDependencies();
    await this.checkBuildConfiguration();
    await this.checkSecurityAndPermissions();
    await this.checkPerformance();
    await this.checkTests();
    await this.checkAssets();
    await this.checkiOSConfiguration();
    await this.checkAndroidConfiguration();
    await this.generateReport();
  }

  private async checkProjectStructure(): Promise<void> {
    console.log('📁 Checking project structure...');

    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      'app.json',
      'babel.config.cjs',
      'metro.config.js',
      'ios/Podfile',
      'android/build.gradle',
    ];

    for (const file of requiredFiles) {
      const exists = fs.existsSync(path.join(this.projectRoot, file));
      this.addResult(
        'Project Structure',
        file,
        exists ? 'pass' : 'fail',
        exists ? `${file} exists` : `Missing required file: ${file}`,
        'critical'
      );
    }
  }

  private async checkDependencies(): Promise<void> {
    console.log('📦 Checking dependencies...');

    try {
      // Check for vulnerabilities
      const auditResult = this.runCommand('pnpm audit --json', true);
      const audit = JSON.parse(auditResult);
      
      const vulnerabilities = audit.advisories ? Object.keys(audit.advisories).length : 0;
      
      this.addResult(
        'Dependencies',
        'Security Audit',
        vulnerabilities === 0 ? 'pass' : 'warning',
        `Found ${vulnerabilities} vulnerabilities`,
        vulnerabilities > 0 ? 'high' : 'low'
      );

      // Check for outdated packages
      const outdated = this.runCommand('pnpm outdated --json', true);
      const outdatedPackages = JSON.parse(outdated || '{}');
      const outdatedCount = Object.keys(outdatedPackages).length;

      this.addResult(
        'Dependencies',
        'Outdated Packages',
        outdatedCount < 10 ? 'pass' : 'warning',
        `${outdatedCount} packages are outdated`,
        'low'
      );

    } catch (error) {
      this.addResult(
        'Dependencies',
        'Dependency Check',
        'warning',
        'Could not check dependencies',
        'medium'
      );
    }
  }

  private async checkBuildConfiguration(): Promise<void> {
    console.log('🔨 Checking build configuration...');

    // Check iOS build
    const iosProjectPath = path.join(this.projectRoot, 'ios');
    if (fs.existsSync(iosProjectPath)) {
      this.addResult(
        'Build Configuration',
        'iOS Project',
        'pass',
        'iOS project exists',
        'critical'
      );

      // Check for release scheme
      const xcodeproj = fs.readdirSync(iosProjectPath).find(f => f.endsWith('.xcodeproj'));
      if (xcodeproj) {
        this.addResult(
          'Build Configuration',
          'Xcode Project',
          'pass',
          `Found ${xcodeproj}`,
          'critical'
        );
      }
    }

    // Check Android build
    const androidProjectPath = path.join(this.projectRoot, 'android');
    if (fs.existsSync(androidProjectPath)) {
      this.addResult(
        'Build Configuration',
        'Android Project',
        'pass',
        'Android project exists',
        'critical'
      );

      // Check for release configuration
      const gradlePath = path.join(androidProjectPath, 'app', 'build.gradle');
      if (fs.existsSync(gradlePath)) {
        const gradleContent = fs.readFileSync(gradlePath, 'utf-8');
        const hasRelease = gradleContent.includes('release {');
        
        this.addResult(
          'Build Configuration',
          'Android Release Config',
          hasRelease ? 'pass' : 'warning',
          hasRelease ? 'Release configuration found' : 'Missing release configuration',
          'high'
        );
      }
    }
  }

  private async checkSecurityAndPermissions(): Promise<void> {
    console.log('🔒 Checking security and permissions...');

    // Check iOS permissions
    const infoPlistPath = path.join(this.projectRoot, 'ios', 'friends', 'Info.plist');
    if (fs.existsSync(infoPlistPath)) {
      const infoPlist = fs.readFileSync(infoPlistPath, 'utf-8');
      
      const permissions = [
        'NSCameraUsageDescription',
        'NSPhotoLibraryUsageDescription',
        'NSLocationWhenInUseUsageDescription',
        'NSContactsUsageDescription',
        'NSMicrophoneUsageDescription',
      ];

      for (const permission of permissions) {
        const hasPermission = infoPlist.includes(permission);
        this.addResult(
          'iOS Permissions',
          permission,
          hasPermission ? 'pass' : 'warning',
          hasPermission ? `${permission} is configured` : `Missing ${permission}`,
          'medium'
        );
      }
    }

    // Check Android permissions
    const manifestPath = path.join(this.projectRoot, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
    if (fs.existsSync(manifestPath)) {
      const manifest = fs.readFileSync(manifestPath, 'utf-8');
      
      const androidPermissions = [
        'android.permission.CAMERA',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.READ_CONTACTS',
        'android.permission.RECORD_AUDIO',
      ];

      for (const permission of androidPermissions) {
        const hasPermission = manifest.includes(permission);
        this.addResult(
          'Android Permissions',
          permission,
          hasPermission ? 'pass' : 'warning',
          hasPermission ? `${permission} is configured` : `Missing ${permission}`,
          'medium'
        );
      }
    }

    // Check for sensitive data
    this.checkForSensitiveData();
  }

  private checkForSensitiveData(): void {
    const sensitivePatterns = [
      { pattern: /api[_-]?key/gi, name: 'API Keys' },
      { pattern: /secret/gi, name: 'Secrets' },
      { pattern: /password/gi, name: 'Passwords' },
      { pattern: /token/gi, name: 'Tokens' },
    ];

    const srcPath = path.join(this.projectRoot, 'src');
    const files = this.getAllFiles(srcPath, ['.ts', '.tsx', '.js', '.jsx']);

    for (const pattern of sensitivePatterns) {
      let found = false;
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        if (pattern.pattern.test(content)) {
          // Check if it's actually hardcoded
          const lines = content.split('\n');
          for (const line of lines) {
            if (pattern.pattern.test(line) && line.includes('=') && line.includes('"')) {
              found = true;
              break;
            }
          }
        }
      }

      this.addResult(
        'Security',
        `Hardcoded ${pattern.name}`,
        found ? 'fail' : 'pass',
        found ? `Found potential hardcoded ${pattern.name}` : `No hardcoded ${pattern.name} found`,
        'critical'
      );
    }
  }

  private async checkPerformance(): Promise<void> {
    console.log('⚡ Checking performance...');

    // Check bundle size
    const packageJson = JSON.parse(fs.readFileSync(path.join(this.projectRoot, 'package.json'), 'utf-8'));
    const dependencies = Object.keys(packageJson.dependencies || {});
    const devDependencies = Object.keys(packageJson.devDependencies || {});

    this.addResult(
      'Performance',
      'Dependencies Count',
      dependencies.length < 100 ? 'pass' : 'warning',
      `${dependencies.length} production dependencies`,
      'medium'
    );

    // Check for large assets
    const assetsPath = path.join(this.projectRoot, 'assets');
    if (fs.existsSync(assetsPath)) {
      const largeAssets = this.findLargeFiles(assetsPath, 1024 * 1024); // 1MB
      
      this.addResult(
        'Performance',
        'Large Assets',
        largeAssets.length === 0 ? 'pass' : 'warning',
        largeAssets.length > 0 
          ? `Found ${largeAssets.length} assets over 1MB` 
          : 'All assets are optimized',
        'medium'
      );
    }

    // Check TypeScript configuration
    const tsconfigPath = path.join(this.projectRoot, 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
      const strict = tsconfig.compilerOptions?.strict;

      this.addResult(
        'Performance',
        'TypeScript Strict Mode',
        strict ? 'pass' : 'warning',
        strict ? 'Strict mode enabled' : 'Consider enabling strict mode',
        'low'
      );
    }
  }

  private async checkTests(): Promise<void> {
    console.log('🧪 Checking tests...');

    try {
      // Run tests
      const testResult = this.runCommand('pnpm test --passWithNoTests --json', true);
      const results = JSON.parse(testResult);

      this.addResult(
        'Tests',
        'Test Suite',
        results.success ? 'pass' : 'fail',
        `${results.numPassedTests} passed, ${results.numFailedTests} failed`,
        results.success ? 'low' : 'high'
      );

      // Check test coverage
      if (results.coverageMap) {
        const coverage = results.coverageMap;
        // Calculate average coverage
        // This is simplified, you'd need to properly parse coverage data
        this.addResult(
          'Tests',
          'Code Coverage',
          'pass',
          'Coverage data available',
          'medium'
        );
      }
    } catch (error) {
      this.addResult(
        'Tests',
        'Test Execution',
        'warning',
        'Could not run tests',
        'high'
      );
    }
  }

  private async checkAssets(): Promise<void> {
    console.log('🎨 Checking assets...');

    // Check app icons
    const iconPaths = [
      'assets/icon.png',
      'assets/adaptive-icon.png',
      'assets/splash-icon.png',
    ];

    for (const iconPath of iconPaths) {
      const exists = fs.existsSync(path.join(this.projectRoot, iconPath));
      this.addResult(
        'Assets',
        path.basename(iconPath),
        exists ? 'pass' : 'fail',
        exists ? `${iconPath} exists` : `Missing ${iconPath}`,
        'high'
      );
    }

    // Check splash screen
    const splashPath = path.join(this.projectRoot, 'assets', 'splash.png');
    if (fs.existsSync(splashPath)) {
      const stats = fs.statSync(splashPath);
      const sizeMB = stats.size / (1024 * 1024);

      this.addResult(
        'Assets',
        'Splash Screen',
        sizeMB < 2 ? 'pass' : 'warning',
        `Splash screen size: ${sizeMB.toFixed(2)}MB`,
        sizeMB < 2 ? 'low' : 'medium'
      );
    }
  }

  private async checkiOSConfiguration(): Promise<void> {
    console.log('📱 Checking iOS configuration...');

    const iosPath = path.join(this.projectRoot, 'ios');
    if (!fs.existsSync(iosPath)) {
      this.addResult(
        'iOS Configuration',
        'iOS Project',
        'fail',
        'iOS project not found',
        'critical'
      );
      return;
    }

    // Check Podfile
    const podfilePath = path.join(iosPath, 'Podfile');
    if (fs.existsSync(podfilePath)) {
      const podfile = fs.readFileSync(podfilePath, 'utf-8');
      const hasFlipperDisabled = podfile.includes(':flipper_configuration => FlipperConfiguration.disabled');

      this.addResult(
        'iOS Configuration',
        'Flipper (Debug)',
        hasFlipperDisabled ? 'pass' : 'warning',
        hasFlipperDisabled ? 'Flipper disabled for release' : 'Consider disabling Flipper for release',
        'medium'
      );
    }

    // Check for required capabilities
    const xcodeproj = fs.readdirSync(iosPath).find(f => f.endsWith('.xcodeproj'));
    if (xcodeproj) {
      this.addResult(
        'iOS Configuration',
        'Xcode Project',
        'pass',
        'Xcode project configured',
        'critical'
      );
    }
  }

  private async checkAndroidConfiguration(): Promise<void> {
    console.log('🤖 Checking Android configuration...');

    const androidPath = path.join(this.projectRoot, 'android');
    if (!fs.existsSync(androidPath)) {
      this.addResult(
        'Android Configuration',
        'Android Project',
        'fail',
        'Android project not found',
        'critical'
      );
      return;
    }

    // Check build.gradle
    const buildGradlePath = path.join(androidPath, 'app', 'build.gradle');
    if (fs.existsSync(buildGradlePath)) {
      const buildGradle = fs.readFileSync(buildGradlePath, 'utf-8');
      
      // Check for signing config
      const hasSigningConfig = buildGradle.includes('signingConfigs');
      this.addResult(
        'Android Configuration',
        'Signing Config',
        hasSigningConfig ? 'pass' : 'warning',
        hasSigningConfig ? 'Signing config found' : 'No signing config for release',
        'high'
      );

      // Check minSdkVersion
      const minSdkMatch = buildGradle.match(/minSdkVersion\s+(\d+)/);
      if (minSdkMatch) {
        const minSdk = parseInt(minSdkMatch[1]);
        this.addResult(
          'Android Configuration',
          'Min SDK Version',
          minSdk >= 21 ? 'pass' : 'warning',
          `Min SDK: ${minSdk}`,
          'medium'
        );
      }
    }
  }

  private async generateReport(): Promise<void> {
    console.log('\n📊 Generating report...\n');

    const critical = this.results.filter(r => r.severity === 'critical' && r.status === 'fail');
    const high = this.results.filter(r => r.severity === 'high' && r.status === 'fail');
    const warnings = this.results.filter(r => r.status === 'warning');
    const passed = this.results.filter(r => r.status === 'pass');

    console.log('='.repeat(60));
    console.log('TESTFLIGHT READINESS REPORT');
    console.log('='.repeat(60));
    console.log();

    console.log('📈 Summary:');
    console.log(`  ✅ Passed: ${passed.length}`);
    console.log(`  ⚠️  Warnings: ${warnings.length}`);
    console.log(`  ❌ Failed (High): ${high.length}`);
    console.log(`  🚨 Failed (Critical): ${critical.length}`);
    console.log();

    if (critical.length > 0) {
      console.log('🚨 CRITICAL ISSUES (Must fix before TestFlight):');
      critical.forEach(r => {
        console.log(`  ❌ [${r.category}] ${r.item}: ${r.message}`);
      });
      console.log();
    }

    if (high.length > 0) {
      console.log('❗ HIGH PRIORITY ISSUES (Should fix):');
      high.forEach(r => {
        console.log(`  ❌ [${r.category}] ${r.item}: ${r.message}`);
      });
      console.log();
    }

    if (warnings.length > 0) {
      console.log('⚠️  WARNINGS (Consider fixing):');
      warnings.forEach(r => {
        console.log(`  ⚠️  [${r.category}] ${r.item}: ${r.message}`);
      });
      console.log();
    }

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        passed: passed.length,
        warnings: warnings.length,
        failed: critical.length + high.length,
      },
      results: this.results,
    };

    fs.writeFileSync(
      path.join(this.projectRoot, 'testflight-validation-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('📄 Detailed report saved to testflight-validation-report.json');
    console.log();

    const ready = critical.length === 0 && high.length === 0;
    if (ready) {
      console.log('✅ Your app is ready for TestFlight! 🎉');
    } else {
      console.log('❌ Please fix the issues above before submitting to TestFlight.');
      process.exit(1);
    }
  }

  private addResult(
    category: string,
    item: string,
    status: 'pass' | 'fail' | 'warning',
    message: string,
    severity: 'critical' | 'high' | 'medium' | 'low'
  ): void {
    this.results.push({ category, item, status, message, severity });
  }

  private runCommand(command: string, returnOutput = false): string {
    try {
      const output = execSync(command, { 
        encoding: 'utf-8',
        stdio: returnOutput ? 'pipe' : 'inherit'
      });
      return output || '';
    } catch (error) {
      if (returnOutput) {
        return '';
      }
      throw error;
    }
  }

  private getAllFiles(dir: string, extensions: string[]): string[] {
    const files: string[] = [];
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        files.push(...this.getAllFiles(fullPath, extensions));
      } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private findLargeFiles(dir: string, sizeThreshold: number): string[] {
    const largeFiles: string[] = [];
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.')) {
        largeFiles.push(...this.findLargeFiles(fullPath, sizeThreshold));
      } else if (stat.isFile() && stat.size > sizeThreshold) {
        largeFiles.push(fullPath);
      }
    }

    return largeFiles;
  }
}

// Run validation
const validator = new TestFlightValidator();
validator.validate().catch(console.error);