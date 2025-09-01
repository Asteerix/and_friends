#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import * as path from 'path';

interface CheckResult {
  category: string;
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  fix?: string;
}

class ProductionReadinessChecker {
  private results: CheckResult[] = [];

  private addResult(
    category: string,
    name: string,
    status: 'pass' | 'warn' | 'fail',
    message: string,
    fix?: string
  ): void {
    this.results.push({ category, name, status, message, fix });
  }

  async runAllChecks(): Promise<void> {
    console.log('🚀 Running production readiness checks...\n');

    await this.checkPackageJson();
    await this.checkTypeScript();
    await this.checkESLint();
    await this.checkDependencies();
    await this.checkAssets();
    await this.checkConfiguration();
    await this.checkSecurity();
    await this.checkPerformance();
    await this.checkTestCoverage();
    await this.checkSupabaseSecurity();

    this.generateReport();
  }

  private async checkPackageJson(): Promise<void> {
    const category = 'Package Configuration';

    try {
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));

      if (packageJson.version && packageJson.version !== '0.0.0') {
        this.addResult(category, 'Version', 'pass', `Version: ${packageJson.version}`);
      } else {
        this.addResult(
          category,
          'Version',
          'warn',
          'No proper version specified',
          'Update version in package.json'
        );
      }

      const requiredScripts = ['test', 'check:types', 'check:lint'];
      for (const script of requiredScripts) {
        if (packageJson.scripts && packageJson.scripts[script]) {
          this.addResult(category, `Script: ${script}`, 'pass', `✓ ${script} script found`);
        } else {
          this.addResult(
            category,
            `Script: ${script}`,
            'warn',
            `Missing ${script} script`
          );
        }
      }

      const appConfigExists = existsSync('app.json') || existsSync('app.config.js');
      if (appConfigExists) {
        this.addResult(category, 'App Config', 'pass', 'App configuration found');
      } else {
        this.addResult(
          category,
          'App Config',
          'fail',
          'Missing app configuration'
        );
      }
    } catch (error) {
      this.addResult(category, 'Package.json', 'fail', `Error reading package.json: ${error}`);
    }
  }

  private async checkTypeScript(): Promise<void> {
    const category = 'TypeScript';

    try {
      console.log('Checking TypeScript compilation...');
      execSync('pnpm check:types', { 
        stdio: 'pipe',
        timeout: 60000 
      });
      this.addResult(category, 'Compilation', 'pass', 'TypeScript compiles without errors');
    } catch (error) {
      const errorOutput = error.toString();
      const errorCount = (errorOutput.match(/error TS\d+:/g) || []).length;
      this.addResult(
        category,
        'Compilation',
        errorCount > 20 ? 'fail' : 'warn',
        `${errorCount} TypeScript errors found`,
        'Run "pnpm check:types" and fix errors'
      );
    }
  }

  private async checkESLint(): Promise<void> {
    const category = 'Code Quality';

    try {
      console.log('Running ESLint...');
      execSync('pnpm check:lint', { 
        stdio: 'pipe',
        timeout: 60000 
      });
      this.addResult(category, 'ESLint', 'pass', 'ESLint passes');
    } catch (error) {
      const errorOutput = error.toString();
      const warningCount = (errorOutput.match(/warning/gi) || []).length;
      const errorCount = (errorOutput.match(/error/gi) || []).length;

      if (errorCount > 0) {
        this.addResult(
          category,
          'ESLint',
          'fail',
          `${errorCount} ESLint errors found`
        );
      } else if (warningCount > 50) {
        this.addResult(
          category,
          'ESLint',
          'warn',
          `${warningCount} ESLint warnings found`
        );
      } else {
        this.addResult(category, 'ESLint', 'pass', `${warningCount} warnings (acceptable)`);
      }
    }
  }

  private async checkDependencies(): Promise<void> {
    const category = 'Dependencies';

    try {
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));

      const criticalPackages = [
        'react',
        'react-native',
        'expo',
        '@supabase/supabase-js',
        'typescript'
      ];

      for (const pkg of criticalPackages) {
        if (packageJson.dependencies?.[pkg] || packageJson.devDependencies?.[pkg]) {
          this.addResult(category, `Package: ${pkg}`, 'pass', `✓ ${pkg} installed`);
        } else {
          this.addResult(
            category,
            `Package: ${pkg}`,
            'warn',
            `Critical package ${pkg} not found`
          );
        }
      }
    } catch (error) {
      this.addResult(category, 'Dependencies Check', 'fail', `Error: ${error}`);
    }
  }

  private async checkAssets(): Promise<void> {
    const category = 'Assets';

    const requiredAssets = [
      'assets/images/icon.png',
      'assets/images/splash.png'
    ];

    for (const asset of requiredAssets) {
      if (existsSync(asset)) {
        this.addResult(category, path.basename(asset), 'pass', `✓ ${asset} found`);
      } else {
        this.addResult(
          category,
          path.basename(asset),
          'warn',
          `Missing ${asset}`
        );
      }
    }

    if (existsSync('assets')) {
      this.addResult(category, 'Assets Directory', 'pass', 'Assets directory exists');
    }
  }

  private async checkConfiguration(): Promise<void> {
    const category = 'Configuration';

    try {
      let appConfig: any = {};
      
      if (existsSync('app.json')) {
        appConfig = JSON.parse(readFileSync('app.json', 'utf8'));
      }

      if (appConfig.expo) {
        const expo = appConfig.expo;
        
        if (expo.name) {
          this.addResult(category, 'App Name', 'pass', `App name: ${expo.name}`);
        } else {
          this.addResult(category, 'App Name', 'fail', 'Missing app name');
        }

        if (expo.slug) {
          this.addResult(category, 'App Slug', 'pass', `App slug: ${expo.slug}`);
        } else {
          this.addResult(category, 'App Slug', 'fail', 'Missing app slug');
        }

        if (expo.ios && expo.ios.bundleIdentifier) {
          this.addResult(category, 'iOS Bundle ID', 'pass', `Bundle ID: ${expo.ios.bundleIdentifier}`);
        } else {
          this.addResult(category, 'iOS Bundle ID', 'fail', 'Missing iOS bundle identifier');
        }
      }
    } catch (error) {
      this.addResult(category, 'App Configuration', 'warn', `Error: ${error}`);
    }
  }

  private async checkSecurity(): Promise<void> {
    const category = 'Security';

    const envFiles = ['.env', '.env.local'];
    let hasEnvFile = false;
    
    for (const envFile of envFiles) {
      if (existsSync(envFile)) {
        hasEnvFile = true;
        break;
      }
    }

    if (hasEnvFile) {
      this.addResult(category, 'Environment Variables', 'pass', 'Environment configuration found');
    } else {
      this.addResult(category, 'Environment Variables', 'warn', 'No environment files found');
    }
  }

  private async checkPerformance(): Promise<void> {
    const category = 'Performance';

    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
      const depCount = Object.keys(packageJson.dependencies || {}).length;
      
      if (depCount < 50) {
        this.addResult(category, 'Dependencies Count', 'pass', `${depCount} dependencies (good)`);
      } else if (depCount < 100) {
        this.addResult(category, 'Dependencies Count', 'warn', `${depCount} dependencies (moderate)`);
      } else {
        this.addResult(category, 'Dependencies Count', 'warn', `${depCount} dependencies (high)`);
      }
    } catch (error) {
      this.addResult(category, 'Performance Check', 'warn', 'Could not analyze dependencies');
    }
  }

  private async checkTestCoverage(): Promise<void> {
    const category = 'Testing';

    try {
      let hasTests = false;

      try {
        const testFiles = execSync('find src -name "*.test.ts" -o -name "*.test.tsx"', { 
          encoding: 'utf8',
          timeout: 5000 
        }).trim();
        hasTests = testFiles.length > 0;
      } catch {
        // No test files found
      }

      if (hasTests) {
        this.addResult(category, 'Test Files', 'pass', 'Test files found');
        
        try {
          console.log('Running tests...');
          execSync('pnpm test -- --passWithNoTests --silent', {
            stdio: 'pipe',
            timeout: 60000
          });
          this.addResult(category, 'Test Execution', 'pass', 'Tests run successfully');
        } catch (error) {
          this.addResult(category, 'Test Execution', 'warn', 'Some tests may be failing');
        }
      } else {
        this.addResult(category, 'Test Coverage', 'warn', 'No test files found');
      }
    } catch (error) {
      this.addResult(category, 'Testing Setup', 'warn', `Could not verify testing: ${error}`);
    }
  }

  private async checkSupabaseSecurity(): Promise<void> {
    const category = 'Supabase Security';

    if (existsSync('supabase')) {
      this.addResult(category, 'Supabase Setup', 'pass', 'Supabase configuration found');
      
      const migrationsDir = 'supabase/migrations';
      if (existsSync(migrationsDir)) {
        this.addResult(category, 'Database Migrations', 'pass', 'Migration files found');
      } else {
        this.addResult(category, 'Database Migrations', 'warn', 'No migration files found');
      }
    } else {
      this.addResult(category, 'Supabase Setup', 'warn', 'No Supabase configuration found');
    }
  }

  private generateReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 PRODUCTION READINESS REPORT');
    console.log('='.repeat(80) + '\n');

    const categories = [...new Set(this.results.map(r => r.category))];
    
    let totalChecks = this.results.length;
    let passedChecks = this.results.filter(r => r.status === 'pass').length;
    let warnings = this.results.filter(r => r.status === 'warn').length;
    let failures = this.results.filter(r => r.status === 'fail').length;

    console.log('📈 SUMMARY');
    console.log(`Total Checks: ${totalChecks}`);
    console.log(`✅ Passed: ${passedChecks} (${Math.round((passedChecks / totalChecks) * 100)}%)`);
    console.log(`⚠️  Warnings: ${warnings} (${Math.round((warnings / totalChecks) * 100)}%)`);
    console.log(`❌ Failures: ${failures} (${Math.round((failures / totalChecks) * 100)}%)`);
    console.log();

    for (const category of categories) {
      console.log(`📁 ${category.toUpperCase()}`);
      console.log('-'.repeat(40));
      
      const categoryResults = this.results.filter(r => r.category === category);
      
      for (const result of categoryResults) {
        const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
        console.log(`${icon} ${result.name}: ${result.message}`);
        
        if (result.fix) {
          console.log(`   💡 Fix: ${result.fix}`);
        }
      }
      console.log();
    }

    console.log('🚀 TESTFLIGHT READINESS');
    console.log('-'.repeat(40));
    
    const score = Math.round(((passedChecks + warnings * 0.5) / totalChecks) * 100);
    
    if (score >= 90 && failures === 0) {
      console.log('🟢 READY FOR TESTFLIGHT');
      console.log('Your app is ready for TestFlight submission!');
    } else if (score >= 75 && failures <= 2) {
      console.log('🟡 MOSTLY READY');
      console.log('Your app is mostly ready. Address the failures and major warnings.');
    } else {
      console.log('🔴 NOT READY');
      console.log('Your app needs significant work before TestFlight submission.');
    }
    
    console.log(`Overall Score: ${score}/100`);

    const reportPath = path.join(process.cwd(), 'production-readiness-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalChecks,
        passed: passedChecks,
        warnings,
        failures,
        score
      },
      results: this.results
    };
    
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📝 Detailed report saved to: ${reportPath}`);
  }
}

async function main() {
  const checker = new ProductionReadinessChecker();
  try {
    await checker.runAllChecks();
  } catch (error) {
    console.error('❌ Error running production readiness check:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { ProductionReadinessChecker };
