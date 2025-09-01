#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Automated Fix Script for Common Issues\n');
console.log('=' .repeat(60));

let fixCount = 0;
const fixes = [];

// 1. Check and fix Supabase configuration
console.log('\n📋 Checking Supabase Configuration...');
const appJsonPath = path.join(__dirname, '..', 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

if (appJson.expo?.extra?.supabaseUrl?.includes('REMPLACER')) {
  console.log('⚠️  Supabase URL needs configuration');
  console.log('   Please set your Supabase URL in app.json');
  fixes.push('Configure Supabase URL in app.json');
} else {
  console.log('✅ Supabase URL configured');
}

// 2. Remove console.log statements
console.log('\n📋 Removing console.log statements...');
let consoleRemoved = 0;

function removeConsoleLogs(dir) {
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      
      if (item === 'node_modules' || item === '.git' || item === '__tests__' || item === 'scripts') {
        continue;
      }
      
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        removeConsoleLogs(fullPath);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        let content = fs.readFileSync(fullPath, 'utf8');
        const originalContent = content;
        
        // Remove console.log statements but keep console.error and console.warn
        content = content.replace(/^\s*console\.log\([^)]*\);?\s*$/gm, '');
        content = content.replace(/^\s*console\.debug\([^)]*\);?\s*$/gm, '');
        
        if (content !== originalContent) {
          fs.writeFileSync(fullPath, content);
          consoleRemoved++;
        }
      }
    }
  } catch (error) {
    // Ignore errors
  }
}

// Uncomment to actually remove console.logs
// removeConsoleLogs(path.join(__dirname, '..', 'src'));

if (consoleRemoved > 0) {
  console.log(`✅ Removed ${consoleRemoved} console.log statements`);
  fixCount += consoleRemoved;
} else {
  console.log('ℹ️  Console.log removal skipped (uncomment to enable)');
}

// 3. Fix common TypeScript issues
console.log('\n📋 Fixing common TypeScript issues...');

// Create missing type declarations
const typeDeclarations = [
  {
    file: 'src/types/global.d.ts',
    content: `// Global type declarations
declare module '*.png' {
  const value: any;
  export default value;
}

declare module '*.jpg' {
  const value: any;
  export default value;
}

declare module '*.jpeg' {
  const value: any;
  export default value;
}

declare module '*.svg' {
  const value: any;
  export default value;
}

declare module '*.gif' {
  const value: any;
  export default value;
}
`
  }
];

typeDeclarations.forEach(({ file, content }) => {
  const filePath = path.join(__dirname, '..', file);
  const dir = path.dirname(filePath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Created ${file}`);
    fixCount++;
  }
});

// 4. Create missing test setup files
console.log('\n📋 Setting up test environment...');

const testSetupFiles = [
  {
    file: '__mocks__/@expo/vector-icons.js',
    content: `module.exports = {
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
  FontAwesome: 'FontAwesome',
  Feather: 'Feather',
};`
  },
  {
    file: '__mocks__/expo-router.js',
    content: `module.exports = {
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
  useSegments: () => [],
  Link: ({ children }) => children,
  Stack: {
    Screen: ({ children }) => children,
  },
};`
  },
  {
    file: '__mocks__/expo-haptics.js',
    content: `module.exports = {
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
};`
  }
];

testSetupFiles.forEach(({ file, content }) => {
  const filePath = path.join(__dirname, '..', file);
  const dir = path.dirname(filePath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Created ${file}`);
    fixCount++;
  }
});

// 5. Fix package.json scripts
console.log('\n📋 Checking package.json scripts...');
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

if (!packageJson.scripts.typecheck && packageJson.scripts['check:types']) {
  packageJson.scripts.typecheck = packageJson.scripts['check:types'];
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('✅ Added typecheck script alias');
  fixCount++;
}

// 6. Create .env.example file
console.log('\n📋 Creating environment example file...');
const envExamplePath = path.join(__dirname, '..', '.env.example');
if (!fs.existsSync(envExamplePath)) {
  const envContent = `# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Environment
NODE_ENV=development
`;
  fs.writeFileSync(envExamplePath, envContent);
  console.log('✅ Created .env.example file');
  fixCount++;
}

// 7. Optimize images
console.log('\n📋 Checking image sizes...');
const assetsDir = path.join(__dirname, '..', 'assets');
let largeImages = 0;

function checkImageSizes(dir) {
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        checkImageSizes(fullPath);
      } else if (item.match(/\.(png|jpg|jpeg)$/i)) {
        const sizeMB = stats.size / (1024 * 1024);
        if (sizeMB > 1) {
          largeImages++;
          console.log(`   ⚠️  Large image: ${item} (${sizeMB.toFixed(2)}MB)`);
        }
      }
    }
  } catch (error) {
    // Ignore
  }
}

checkImageSizes(assetsDir);

if (largeImages > 0) {
  console.log(`   Found ${largeImages} large images that should be optimized`);
  fixes.push(`Optimize ${largeImages} large images`);
}

// Summary
console.log('\n' + '=' .repeat(60));
console.log('📊 FIX SUMMARY');
console.log('=' .repeat(60));

console.log(`\n✅ Applied ${fixCount} automatic fixes`);

if (fixes.length > 0) {
  console.log('\n⚠️  Manual fixes required:');
  fixes.forEach(fix => {
    console.log(`   • ${fix}`);
  });
}

console.log('\n📝 Recommendations:');
console.log('   1. Configure Supabase credentials in app.json');
console.log('   2. Run: npm run typecheck (to check TypeScript)');
console.log('   3. Run: npm test (to run tests)');
console.log('   4. Run: node scripts/performance-analysis.cjs');
console.log('   5. Run: node scripts/final-test-report.cjs');

console.log('\n✨ Script completed!');