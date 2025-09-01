#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PerformanceChecker {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.optimizations = [];
  }

  checkLargeImages() {
    console.log('🖼️  Checking image sizes...');
    const assetsDir = path.join(__dirname, '..', 'assets');
    const srcAssets = path.join(__dirname, '..', 'src', 'assets');
    const maxSizeKB = 500; // 500KB max for images

    const checkDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir, { recursive: true });
      files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isFile()) {
          const ext = path.extname(file).toLowerCase();
          if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
            const stats = fs.statSync(filePath);
            const sizeKB = stats.size / 1024;
            if (sizeKB > maxSizeKB) {
              this.issues.push({
                type: 'large-image',
                file: filePath,
                size: `${(sizeKB / 1024).toFixed(2)}MB`,
                recommendation: 'Compress or resize this image'
              });
            }
          }
        }
      });
    };

    checkDir(assetsDir);
    checkDir(srcAssets);
  }

  checkConsoleLogs() {
    console.log('📝 Checking console logs...');
    const srcDir = path.join(__dirname, '..', 'src');
    let consoleCount = 0;
    const files = [];

    const checkFile = (filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      const matches = content.match(/console\.(log|warn|error|info|debug)/g);
      if (matches) {
        consoleCount += matches.length;
        files.push({ file: filePath, count: matches.length });
      }
    };

    const walkDir = (dir) => {
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        if (stat.isDirectory() && !item.includes('test') && !item.includes('__')) {
          walkDir(itemPath);
        } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
          checkFile(itemPath);
        }
      });
    };

    walkDir(srcDir);

    if (consoleCount > 30) {
      this.warnings.push({
        type: 'console-logs',
        count: consoleCount,
        message: `Found ${consoleCount} console statements. Consider removing for production.`,
        files: files.slice(0, 5) // Show top 5 files
      });
    }
  }

  checkUnusedDependencies() {
    console.log('📦 Checking dependencies...');
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    const dependencies = Object.keys(packageJson.dependencies || {});
    
    // Common large packages to check
    const largePackages = {
      'lodash': 'Consider using lodash-es or individual imports',
      'moment': 'Consider using date-fns (already installed)',
      'axios': 'Consider using native fetch'
    };

    dependencies.forEach(dep => {
      if (largePackages[dep]) {
        this.warnings.push({
          type: 'large-dependency',
          package: dep,
          recommendation: largePackages[dep]
        });
      }
    });
  }

  checkListPerformance() {
    console.log('📋 Checking list components...');
    const srcDir = path.join(__dirname, '..', 'src');
    
    const checkFile = (filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for FlatList without optimization props
      if (content.includes('FlatList') && !content.includes('getItemLayout')) {
        this.optimizations.push({
          type: 'flatlist-optimization',
          file: filePath,
          recommendation: 'Consider adding getItemLayout for better performance'
        });
      }
      
      // Check for missing React.memo
      if (content.includes('export default function') && !content.includes('React.memo')) {
        const componentName = path.basename(filePath, path.extname(filePath));
        if (componentName.includes('Item') || componentName.includes('Card') || componentName.includes('Row')) {
          this.optimizations.push({
            type: 'memo-optimization',
            file: filePath,
            recommendation: 'Consider wrapping with React.memo to prevent unnecessary re-renders'
          });
        }
      }
    };

    const walkDir = (dir) => {
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        if (stat.isDirectory() && !item.includes('test')) {
          walkDir(itemPath);
        } else if (item.endsWith('.tsx')) {
          checkFile(itemPath);
        }
      });
    };

    walkDir(srcDir);
  }

  checkMemoryLeaks() {
    console.log('💾 Checking for potential memory leaks...');
    const srcDir = path.join(__dirname, '..', 'src');
    
    const checkFile = (filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for event listeners without cleanup
      if (content.includes('addEventListener') && !content.includes('removeEventListener')) {
        this.warnings.push({
          type: 'memory-leak',
          file: filePath,
          issue: 'addEventListener without removeEventListener'
        });
      }
      
      // Check for setInterval without clearInterval
      if (content.includes('setInterval') && !content.includes('clearInterval')) {
        this.warnings.push({
          type: 'memory-leak',
          file: filePath,
          issue: 'setInterval without clearInterval'
        });
      }
      
      // Check for subscriptions without cleanup
      if (content.includes('.subscribe(') && !content.includes('.unsubscribe(')) {
        this.warnings.push({
          type: 'memory-leak',
          file: filePath,
          issue: 'Subscription without unsubscribe'
        });
      }
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
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('⚡ PERFORMANCE ANALYSIS REPORT');
    console.log('='.repeat(80) + '\n');

    if (this.issues.length > 0) {
      console.log('❌ CRITICAL ISSUES:');
      this.issues.forEach(issue => {
        console.log(`  • ${issue.type}: ${issue.file || issue.message}`);
        if (issue.recommendation) {
          console.log(`    → ${issue.recommendation}`);
        }
      });
      console.log('');
    }

    if (this.warnings.length > 0) {
      console.log('⚠️  WARNINGS:');
      this.warnings.forEach(warning => {
        if (warning.type === 'console-logs') {
          console.log(`  • ${warning.message}`);
          warning.files.forEach(f => {
            console.log(`    - ${path.basename(f.file)}: ${f.count} occurrences`);
          });
        } else {
          console.log(`  • ${warning.type}: ${warning.file || warning.package || warning.issue}`);
          if (warning.recommendation) {
            console.log(`    → ${warning.recommendation}`);
          }
        }
      });
      console.log('');
    }

    if (this.optimizations.length > 0) {
      console.log('💡 OPTIMIZATION SUGGESTIONS:');
      const grouped = {};
      this.optimizations.forEach(opt => {
        if (!grouped[opt.type]) grouped[opt.type] = [];
        grouped[opt.type].push(opt);
      });
      
      Object.entries(grouped).forEach(([type, opts]) => {
        console.log(`  • ${type} (${opts.length} files)`);
        opts.slice(0, 3).forEach(opt => {
          console.log(`    - ${path.basename(opt.file)}`);
        });
        if (opts.length > 3) {
          console.log(`    ... and ${opts.length - 3} more`);
        }
      });
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    
    const score = Math.max(0, 100 - (this.issues.length * 10) - (this.warnings.length * 3));
    console.log(`  Performance Score: ${score}/100`);
    console.log(`  Critical Issues: ${this.issues.length}`);
    console.log(`  Warnings: ${this.warnings.length}`);
    console.log(`  Optimization Opportunities: ${this.optimizations.length}`);
    
    if (score >= 80) {
      console.log('\n  ✅ Performance is GOOD for production!');
    } else if (score >= 60) {
      console.log('\n  ⚠️  Performance is ACCEPTABLE but could be improved.');
    } else {
      console.log('\n  ❌ Performance needs improvement before production.');
    }

    // Save to file
    const report = {
      timestamp: new Date().toISOString(),
      score,
      issues: this.issues,
      warnings: this.warnings,
      optimizations: this.optimizations
    };
    
    fs.writeFileSync('performance-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed report saved to: performance-report.json\n');
  }
}

// Run checker
const checker = new PerformanceChecker();
checker.checkLargeImages();
checker.checkConsoleLogs();
checker.checkUnusedDependencies();
checker.checkListPerformance();
checker.checkMemoryLeaks();
checker.generateReport();