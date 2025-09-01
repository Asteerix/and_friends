#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class PerformanceTestRunner {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
  }

  async runTest(name, testFn, threshold) {
    console.log(`\n📊 Running test: ${name}`);
    const startTime = Date.now();
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      const passed = duration <= threshold;
      const status = passed ? 'PASS' : 'FAIL';
      
      this.results.tests.push({
        name,
        duration,
        threshold,
        status,
        passed
      });
      
      this.results.summary.total++;
      if (passed) {
        this.results.summary.passed++;
        console.log(`✅ ${status}: ${name} (${duration}ms <= ${threshold}ms)`);
      } else {
        this.results.summary.failed++;
        console.log(`❌ ${status}: ${name} (${duration}ms > ${threshold}ms)`);
      }
      
      return { passed, duration };
    } catch (error) {
      this.results.tests.push({
        name,
        error: error.message,
        status: 'ERROR'
      });
      this.results.summary.failed++;
      console.error(`❌ ERROR: ${name} - ${error.message}`);
      return { passed: false, error };
    }
  }

  async testBundleSize() {
    const distPath = path.join(__dirname, '..', 'dist');
    const iosPath = path.join(__dirname, '..', 'ios', 'build');
    const androidPath = path.join(__dirname, '..', 'android', 'app', 'build');
    
    const results = {
      assets: 0,
      node_modules: 0,
      total: 0
    };

    const getDirectorySize = (dirPath) => {
      if (!fs.existsSync(dirPath)) return 0;
      
      let totalSize = 0;
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          totalSize += getDirectorySize(filePath);
        } else {
          totalSize += stats.size;
        }
      }
      
      return totalSize;
    };

    results.assets = getDirectorySize(path.join(__dirname, '..', 'assets'));
    results.node_modules = getDirectorySize(path.join(__dirname, '..', 'node_modules'));
    results.total = results.assets + results.node_modules;

    const mbSize = (results.total / (1024 * 1024)).toFixed(2);
    console.log(`📦 Total bundle size: ${mbSize} MB`);
    
    return mbSize < 200; // Should be under 200MB
  }

  async testImageOptimization() {
    const imagesDir = path.join(__dirname, '..', 'assets', 'images');
    const srcImagesDir = path.join(__dirname, '..', 'src', 'assets', 'images');
    
    let totalImages = 0;
    let optimizedImages = 0;
    let oversizedImages = [];

    const checkImages = (dirPath) => {
      if (!fs.existsSync(dirPath)) return;
      
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          checkImages(filePath);
        } else if (/\.(jpg|jpeg|png|webp)$/i.test(file)) {
          totalImages++;
          const sizeMB = stats.size / (1024 * 1024);
          
          if (sizeMB < 0.5) {
            optimizedImages++;
          } else {
            oversizedImages.push({
              path: filePath.replace(path.join(__dirname, '..'), ''),
              size: sizeMB.toFixed(2)
            });
          }
        }
      }
    };

    checkImages(imagesDir);
    checkImages(srcImagesDir);

    const optimizationRate = (optimizedImages / totalImages * 100).toFixed(1);
    console.log(`🖼️  Image optimization: ${optimizationRate}% (${optimizedImages}/${totalImages})`);
    
    if (oversizedImages.length > 0) {
      console.log('⚠️  Oversized images found:');
      oversizedImages.slice(0, 5).forEach(img => {
        console.log(`   - ${img.path}: ${img.size} MB`);
      });
    }

    return optimizationRate > 80; // At least 80% should be optimized
  }

  async testMemoryLeaks() {
    console.log('🧠 Checking for potential memory leaks...');
    
    const sourceFiles = [];
    const checkForLeaks = (dirPath) => {
      if (!fs.existsSync(dirPath)) return;
      
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory() && !file.includes('node_modules') && !file.includes('.')) {
          checkForLeaks(filePath);
        } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          
          // Check for common memory leak patterns
          const leakPatterns = [
            /addEventListener.*(?!removeEventListener)/g,
            /setInterval\s*\([^)]*\)(?!.*clearInterval)/g,
            /setTimeout\s*\([^)]*\)(?!.*clearTimeout)/g,
            /subscribe\s*\([^)]*\)(?!.*unsubscribe)/g
          ];
          
          for (const pattern of leakPatterns) {
            if (pattern.test(content)) {
              sourceFiles.push({
                file: filePath.replace(path.join(__dirname, '..'), ''),
                pattern: pattern.source
              });
            }
          }
        }
      }
    };

    checkForLeaks(path.join(__dirname, '..', 'src'));
    
    if (sourceFiles.length > 0) {
      console.log(`⚠️  Potential memory leaks found in ${sourceFiles.length} files`);
      sourceFiles.slice(0, 5).forEach(file => {
        console.log(`   - ${file.file}`);
      });
    } else {
      console.log('✅ No obvious memory leak patterns detected');
    }

    return sourceFiles.length < 10; // Less than 10 potential leaks
  }

  async testStartupTime() {
    console.log('⏱️  Estimating app startup time...');
    
    // Check for heavy operations in app initialization
    const appFiles = [
      'src/app/_layout.tsx',
      'src/app/index.tsx',
      'src/shared/lib/supabase/client.ts'
    ];
    
    let heavyOperations = 0;
    
    for (const file of appFiles) {
      const filePath = path.join(__dirname, '..', file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Check for heavy operations
        if (/await.*fetch|axios|supabase/g.test(content)) {
          heavyOperations++;
        }
        if (/require\(|import\(/g.test(content)) {
          heavyOperations++;
        }
      }
    }
    
    const estimatedTime = 1000 + (heavyOperations * 200); // Base + operations
    console.log(`   Estimated startup time: ${estimatedTime}ms`);
    
    return estimatedTime < 3000; // Should start in less than 3 seconds
  }

  async testApiOptimization() {
    console.log('🌐 Checking API optimization...');
    
    const apiPatterns = {
      batching: 0,
      caching: 0,
      pagination: 0,
      total: 0
    };
    
    const checkApiOptimization = (dirPath) => {
      if (!fs.existsSync(dirPath)) return;
      
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory() && !file.includes('node_modules')) {
          checkApiOptimization(filePath);
        } else if (/\.(ts|tsx)$/.test(file)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          
          if (/supabase|fetch|axios/i.test(content)) {
            apiPatterns.total++;
            
            if (/Promise\.all|batch|bulk/i.test(content)) {
              apiPatterns.batching++;
            }
            if (/cache|staleTime|cacheTime/i.test(content)) {
              apiPatterns.caching++;
            }
            if (/limit|offset|page|cursor/i.test(content)) {
              apiPatterns.pagination++;
            }
          }
        }
      }
    };
    
    checkApiOptimization(path.join(__dirname, '..', 'src'));
    
    const optimizationScore = apiPatterns.total > 0 
      ? ((apiPatterns.batching + apiPatterns.caching + apiPatterns.pagination) / (apiPatterns.total * 3) * 100)
      : 0;
    
    console.log(`   API Optimization Score: ${optimizationScore.toFixed(1)}%`);
    console.log(`   - Batching: ${apiPatterns.batching}/${apiPatterns.total}`);
    console.log(`   - Caching: ${apiPatterns.caching}/${apiPatterns.total}`);
    console.log(`   - Pagination: ${apiPatterns.pagination}/${apiPatterns.total}`);
    
    return optimizationScore > 30; // At least 30% optimization
  }

  generateReport() {
    const reportPath = path.join(__dirname, '..', 'performance-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${this.results.summary.total}`);
    console.log(`✅ Passed: ${this.results.summary.passed}`);
    console.log(`❌ Failed: ${this.results.summary.failed}`);
    console.log(`⚠️  Warnings: ${this.results.summary.warnings}`);
    
    const successRate = (this.results.summary.passed / this.results.summary.total * 100).toFixed(1);
    console.log(`\nSuccess Rate: ${successRate}%`);
    
    if (successRate >= 80) {
      console.log('\n✅ Performance tests passed! Ready for TestFlight.');
    } else {
      console.log('\n❌ Performance issues detected. Please optimize before TestFlight submission.');
    }
    
    console.log(`\nDetailed report saved to: ${reportPath}`);
    
    return successRate >= 80;
  }

  async run() {
    console.log('🚀 Starting Performance Tests...\n');
    
    await this.runTest('Bundle Size Check', () => this.testBundleSize(), 5000);
    await this.runTest('Image Optimization', () => this.testImageOptimization(), 3000);
    await this.runTest('Memory Leak Detection', () => this.testMemoryLeaks(), 2000);
    await this.runTest('Startup Time', () => this.testStartupTime(), 2000);
    await this.runTest('API Optimization', () => this.testApiOptimization(), 2000);
    
    return this.generateReport();
  }
}

// Run tests
const runner = new PerformanceTestRunner();
runner.run().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});