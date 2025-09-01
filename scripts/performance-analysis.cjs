#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting Performance Analysis for TestFlight...\n');

const performanceReport = {
  timestamp: new Date().toISOString(),
  checks: [],
  optimizations: [],
  warnings: [],
  errors: [],
  score: 100
};

// Helper functions
function checkFileSize(filePath, maxSizeKB) {
  try {
    const stats = fs.statSync(filePath);
    const sizeKB = stats.size / 1024;
    return {
      path: filePath,
      sizeKB: sizeKB.toFixed(2),
      isValid: sizeKB <= maxSizeKB,
      maxSizeKB
    };
  } catch (error) {
    return null;
  }
}

function findLargeFiles(dir, maxSizeKB = 500) {
  const largeFiles = [];
  
  function scanDir(currentPath) {
    try {
      const items = fs.readdirSync(currentPath);
      
      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        
        // Skip node_modules, .git, etc.
        if (item === 'node_modules' || item === '.git' || item === '.expo' || item === 'coverage') {
          continue;
        }
        
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
          scanDir(fullPath);
        } else if (stats.isFile()) {
          const sizeKB = stats.size / 1024;
          if (sizeKB > maxSizeKB) {
            largeFiles.push({
              path: fullPath.replace(dir, '.'),
              sizeKB: sizeKB.toFixed(2)
            });
          }
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
  }
  
  scanDir(dir);
  return largeFiles;
}

// 1. Check for large assets
console.log('📊 Analyzing asset sizes...');
const assetsDir = path.join(__dirname, '..', 'assets');
const largeAssets = findLargeFiles(assetsDir, 500);

if (largeAssets.length > 0) {
  performanceReport.warnings.push({
    type: 'LARGE_ASSETS',
    message: `Found ${largeAssets.length} large asset files (>500KB)`,
    files: largeAssets
  });
  performanceReport.score -= 10;
}

performanceReport.checks.push({
  name: 'Asset Size Check',
  passed: largeAssets.length === 0,
  details: `Found ${largeAssets.length} large assets`
});

// 2. Check image optimization
console.log('🖼️  Checking image optimization...');
const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif'];
const images = [];

function findImages(dir) {
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      
      if (item === 'node_modules' || item === '.git') continue;
      
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        findImages(fullPath);
      } else if (imageExtensions.includes(path.extname(item).toLowerCase())) {
        const sizeKB = stats.size / 1024;
        images.push({
          path: fullPath.replace(path.join(__dirname, '..'), '.'),
          sizeKB: sizeKB.toFixed(2)
        });
      }
    }
  } catch (error) {
    // Ignore errors
  }
}

findImages(path.join(__dirname, '..', 'assets'));
const unoptimizedImages = images.filter(img => img.sizeKB > 100);

if (unoptimizedImages.length > 0) {
  performanceReport.optimizations.push({
    type: 'IMAGE_OPTIMIZATION',
    message: `${unoptimizedImages.length} images could be optimized`,
    files: unoptimizedImages.slice(0, 10) // Show first 10
  });
  performanceReport.score -= 5;
}

performanceReport.checks.push({
  name: 'Image Optimization',
  passed: unoptimizedImages.length === 0,
  details: `${unoptimizedImages.length} images need optimization`
});

// 3. Check for unused dependencies
console.log('📦 Checking dependencies...');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const dependencies = Object.keys(packageJson.dependencies || {});

performanceReport.checks.push({
  name: 'Dependencies Count',
  passed: dependencies.length < 100,
  details: `Project has ${dependencies.length} dependencies`
});

if (dependencies.length > 80) {
  performanceReport.warnings.push({
    type: 'MANY_DEPENDENCIES',
    message: `Project has ${dependencies.length} dependencies, consider reviewing for unused packages`
  });
  performanceReport.score -= 5;
}

// 4. Check for console.log statements
console.log('🔍 Checking for console statements...');
let consoleCount = 0;

function checkForConsole(dir) {
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      
      if (item === 'node_modules' || item === '.git' || item === '__tests__' || item === 'scripts') continue;
      
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        checkForConsole(fullPath);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js') || item.endsWith('.jsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const matches = content.match(/console\.(log|error|warn|debug)/g);
        if (matches) {
          consoleCount += matches.length;
        }
      }
    }
  } catch (error) {
    // Ignore errors
  }
}

checkForConsole(path.join(__dirname, '..', 'src'));

if (consoleCount > 10) {
  performanceReport.warnings.push({
    type: 'CONSOLE_STATEMENTS',
    message: `Found ${consoleCount} console statements in production code`,
    severity: 'medium'
  });
  performanceReport.score -= 5;
}

performanceReport.checks.push({
  name: 'Console Statements',
  passed: consoleCount <= 10,
  details: `Found ${consoleCount} console statements`
});

// 5. Check bundle size (if build exists)
console.log('📏 Checking bundle size...');
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  const bundleFiles = findLargeFiles(distPath, 2000); // 2MB limit for bundles
  
  if (bundleFiles.length > 0) {
    performanceReport.warnings.push({
      type: 'LARGE_BUNDLES',
      message: `Found ${bundleFiles.length} large bundle files (>2MB)`,
      files: bundleFiles
    });
    performanceReport.score -= 10;
  }
  
  performanceReport.checks.push({
    name: 'Bundle Size',
    passed: bundleFiles.length === 0,
    details: `${bundleFiles.length} large bundles found`
  });
}

// 6. Check for memory leaks patterns
console.log('🔍 Checking for potential memory leaks...');
let memoryLeakPatterns = 0;

function checkMemoryLeaks(dir) {
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      
      if (item === 'node_modules' || item === '.git' || item === '__tests__') continue;
      
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        checkMemoryLeaks(fullPath);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Check for common memory leak patterns
        if (content.includes('setInterval') && !content.includes('clearInterval')) {
          memoryLeakPatterns++;
        }
        if (content.includes('setTimeout') && content.match(/setTimeout.*\d{5,}/)) { // Long timeouts
          memoryLeakPatterns++;
        }
        if (content.includes('addEventListener') && !content.includes('removeEventListener')) {
          memoryLeakPatterns++;
        }
      }
    }
  } catch (error) {
    // Ignore errors
  }
}

checkMemoryLeaks(path.join(__dirname, '..', 'src'));

if (memoryLeakPatterns > 0) {
  performanceReport.warnings.push({
    type: 'MEMORY_LEAK_RISK',
    message: `Found ${memoryLeakPatterns} potential memory leak patterns`,
    severity: 'high'
  });
  performanceReport.score -= 10;
}

performanceReport.checks.push({
  name: 'Memory Leak Patterns',
  passed: memoryLeakPatterns === 0,
  details: `${memoryLeakPatterns} potential issues found`
});

// 7. Check React Native specific optimizations
console.log('⚛️  Checking React Native optimizations...');
let rnOptimizations = [];

function checkRNOptimizations(dir) {
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      
      if (item === 'node_modules' || item === '.git' || item === '__tests__') continue;
      
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        checkRNOptimizations(fullPath);
      } else if (item.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Check for FlatList optimization
        if (content.includes('FlatList') && !content.includes('keyExtractor')) {
          rnOptimizations.push({
            file: fullPath.replace(path.join(__dirname, '..'), '.'),
            issue: 'FlatList without keyExtractor'
          });
        }
        
        // Check for unnecessary re-renders
        if (content.includes('useCallback') || content.includes('useMemo') || content.includes('React.memo')) {
          // Good optimization
        } else if (content.match(/export.*function.*\(.*props/)) {
          // Component that might benefit from memo
          if (!content.includes('memo(')) {
            rnOptimizations.push({
              file: fullPath.replace(path.join(__dirname, '..'), '.'),
              issue: 'Component could benefit from React.memo'
            });
          }
        }
      }
    }
  } catch (error) {
    // Ignore errors
  }
}

checkRNOptimizations(path.join(__dirname, '..', 'src'));

if (rnOptimizations.length > 5) {
  performanceReport.optimizations.push({
    type: 'REACT_NATIVE_OPTIMIZATIONS',
    message: `${rnOptimizations.length} React Native optimization opportunities found`,
    files: rnOptimizations.slice(0, 5)
  });
  performanceReport.score -= 5;
}

performanceReport.checks.push({
  name: 'React Native Optimizations',
  passed: rnOptimizations.length <= 5,
  details: `${rnOptimizations.length} optimization opportunities`
});

// 8. Check lazy loading
console.log('🚀 Checking lazy loading implementation...');
const srcPath = path.join(__dirname, '..', 'src');
let lazyLoadingCount = 0;

function checkLazyLoading(dir) {
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      
      if (item === 'node_modules' || item === '.git') continue;
      
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        checkLazyLoading(fullPath);
      } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        if (content.includes('React.lazy') || content.includes('lazy(')) {
          lazyLoadingCount++;
        }
      }
    }
  } catch (error) {
    // Ignore errors
  }
}

checkLazyLoading(srcPath);

performanceReport.checks.push({
  name: 'Lazy Loading',
  passed: lazyLoadingCount > 0,
  details: `${lazyLoadingCount} components use lazy loading`
});

if (lazyLoadingCount === 0) {
  performanceReport.optimizations.push({
    type: 'LAZY_LOADING',
    message: 'Consider implementing lazy loading for heavy components'
  });
  performanceReport.score -= 5;
}

// Final score calculation
performanceReport.score = Math.max(0, performanceReport.score);

// Generate recommendations
const recommendations = [];

if (performanceReport.score < 90) {
  recommendations.push('⚠️  Performance improvements needed before TestFlight submission');
}

if (largeAssets.length > 0) {
  recommendations.push('🖼️  Optimize large image assets using tools like ImageOptim or TinyPNG');
}

if (consoleCount > 10) {
  recommendations.push('🔍 Remove console statements from production code');
}

if (memoryLeakPatterns > 0) {
  recommendations.push('💾 Fix potential memory leaks before release');
}

if (rnOptimizations.length > 5) {
  recommendations.push('⚛️  Implement React Native performance optimizations');
}

performanceReport.recommendations = recommendations;

// Output report
console.log('\n' + '='.repeat(60));
console.log('📊 PERFORMANCE ANALYSIS REPORT');
console.log('='.repeat(60));

console.log(`\n📈 Performance Score: ${performanceReport.score}/100\n`);

console.log('✅ Checks Passed:');
performanceReport.checks.filter(c => c.passed).forEach(check => {
  console.log(`   ✓ ${check.name}`);
});

console.log('\n❌ Checks Failed:');
performanceReport.checks.filter(c => !c.passed).forEach(check => {
  console.log(`   ✗ ${check.name}: ${check.details}`);
});

if (performanceReport.warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  performanceReport.warnings.forEach(warning => {
    console.log(`   • ${warning.message}`);
  });
}

if (performanceReport.optimizations.length > 0) {
  console.log('\n🚀 Optimization Opportunities:');
  performanceReport.optimizations.forEach(opt => {
    console.log(`   • ${opt.message}`);
  });
}

if (recommendations.length > 0) {
  console.log('\n📝 Recommendations:');
  recommendations.forEach(rec => {
    console.log(`   ${rec}`);
  });
}

// Save report to file
const reportPath = path.join(__dirname, '..', 'performance-report.json');
fs.writeFileSync(reportPath, JSON.stringify(performanceReport, null, 2));
console.log(`\n📄 Full report saved to: ${reportPath}`);

// Exit with appropriate code
if (performanceReport.score >= 80) {
  console.log('\n✅ Performance analysis passed! Ready for TestFlight.');
  process.exit(0);
} else {
  console.log('\n❌ Performance issues detected. Please address them before TestFlight submission.');
  process.exit(1);
}