#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

console.log(`${colors.blue}🌍 Testing Translation System${colors.reset}\n`);

// Check if translation files exist
const i18nPath = path.join(__dirname, '..', 'src', 'i18n');
const enPath = path.join(i18nPath, 'locales', 'en', 'index.ts');
const frPath = path.join(i18nPath, 'locales', 'fr', 'index.ts');
const i18nConfigPath = path.join(i18nPath, 'i18n.ts');

console.log('Checking translation files...');

// Check if files exist
const files = [
  { path: i18nConfigPath, name: 'i18n configuration' },
  { path: enPath, name: 'English translations' },
  { path: frPath, name: 'French translations' },
];

let allFilesExist = true;
files.forEach(({ path: filePath, name }) => {
  if (fs.existsSync(filePath)) {
    console.log(`${colors.green}✓${colors.reset} ${name} found`);
  } else {
    console.log(`${colors.red}✗${colors.reset} ${name} not found`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log(`\n${colors.red}Some translation files are missing!${colors.reset}`);
  process.exit(1);
}

// Load and parse translation files
console.log('\nChecking translation keys...');

function extractTranslationKeys(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Simple regex to extract translation keys (this is a basic implementation)
  const keys = [];
  
  const extractKeysFromObject = (lines, prefix = '') => {
    let currentKey = '';
    let depth = 0;
    
    lines.forEach(line => {
      // Count opening and closing braces
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;
      depth += openBraces - closeBraces;
      
      // Extract key from line like "key: 'value'" or "key: {"
      const keyMatch = line.match(/^\s*(\w+):\s*['{]/);
      if (keyMatch && depth > 0) {
        currentKey = keyMatch[1];
        const fullKey = prefix ? `${prefix}.${currentKey}` : currentKey;
        
        if (line.includes("'") || line.includes('"')) {
          // It's a direct value
          keys.push(fullKey);
        }
      }
    });
  };
  
  const lines = content.split('\n');
  extractKeysFromObject(lines);
  
  return keys;
}

// Count keys in each file
const enContent = fs.readFileSync(enPath, 'utf8');
const frContent = fs.readFileSync(frPath, 'utf8');

// Count translation entries (simple count of lines with quotes)
const enCount = (enContent.match(/['"].*['"]/g) || []).length;
const frCount = (frContent.match(/['"].*['"]/g) || []).length;

console.log(`\nTranslation statistics:`);
console.log(`English translations: ${colors.blue}${enCount}${colors.reset} entries`);
console.log(`French translations: ${colors.blue}${frCount}${colors.reset} entries`);

if (Math.abs(enCount - frCount) > 5) {
  console.log(`${colors.yellow}⚠ Warning: Translation counts differ significantly${colors.reset}`);
} else {
  console.log(`${colors.green}✓ Translation counts are similar${colors.reset}`);
}

// Check for common translation keys
console.log('\nChecking common translation sections...');
const sections = [
  'common',
  'auth',
  'home',
  'events',
  'profile',
  'map',
  'settings',
  'errors',
  'permissions',
  'network'
];

sections.forEach(section => {
  const enHasSection = enContent.includes(`${section}:`);
  const frHasSection = frContent.includes(`${section}:`);
  
  if (enHasSection && frHasSection) {
    console.log(`${colors.green}✓${colors.reset} ${section} section present in both languages`);
  } else if (enHasSection && !frHasSection) {
    console.log(`${colors.red}✗${colors.reset} ${section} section missing in French`);
  } else if (!enHasSection && frHasSection) {
    console.log(`${colors.red}✗${colors.reset} ${section} section missing in English`);
  }
});

// Check LanguageSwitcher component
console.log('\nChecking LanguageSwitcher component...');
const languageSwitcherPath = path.join(__dirname, '..', 'src', 'shared', 'components', 'LanguageSwitcher.tsx');
if (fs.existsSync(languageSwitcherPath)) {
  console.log(`${colors.green}✓${colors.reset} LanguageSwitcher component found`);
  
  const switcherContent = fs.readFileSync(languageSwitcherPath, 'utf8');
  if (switcherContent.includes('useTranslation') && switcherContent.includes('i18n.changeLanguage')) {
    console.log(`${colors.green}✓${colors.reset} LanguageSwitcher uses i18n correctly`);
  }
} else {
  console.log(`${colors.red}✗${colors.reset} LanguageSwitcher component not found`);
}

// Check if main app imports i18n
console.log('\nChecking app configuration...');
const layoutPath = path.join(__dirname, '..', 'src', 'app', '_layout.tsx');
if (fs.existsSync(layoutPath)) {
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  if (layoutContent.includes("import '@/i18n/i18n'")) {
    console.log(`${colors.green}✓${colors.reset} i18n imported in _layout.tsx`);
  } else {
    console.log(`${colors.red}✗${colors.reset} i18n not imported in _layout.tsx`);
  }
}

// Check for AsyncStorage usage
console.log('\nChecking language persistence...');
if (fs.existsSync(i18nConfigPath)) {
  const i18nContent = fs.readFileSync(i18nConfigPath, 'utf8');
  if (i18nContent.includes('AsyncStorage') && i18nContent.includes('app_language')) {
    console.log(`${colors.green}✓${colors.reset} Language persistence configured with AsyncStorage`);
  } else {
    console.log(`${colors.yellow}⚠${colors.reset} Language persistence might not be configured`);
  }
}

console.log(`\n${colors.green}✅ Translation system check complete!${colors.reset}`);
console.log('\nNext steps:');
console.log('1. Run the app and test language switching in Preferences');
console.log('2. Verify that all screens update when language is changed');
console.log('3. Check that language preference persists after app restart');