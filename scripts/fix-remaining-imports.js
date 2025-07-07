#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// Mapping of common code patterns that appear in imports
const codePatterns = {
  'importantForAutofill="yes"': '',
  'autoCompleteType="tel"': '',
  'textContentType="telephoneNumber"': '',
  'const ': '\nconst ',
  'type ': '\ntype ',
  'interface ': '\ninterface ',
  'enum ': '\nenum ',
  'function ': '\nfunction ',
  'class ': '\nclass ',
  'export ': '\nexport ',
};

// React Native components that should be imported
const rnComponents = [
  'ActivityIndicator', 'Alert', 'Animated', 'Button', 'Dimensions',
  'Easing', 'FlatList', 'Image', 'Keyboard', 'KeyboardAvoidingView',
  'Linking', 'Modal', 'Platform', 'Pressable', 'RefreshControl',
  'SafeAreaView', 'ScrollView', 'StatusBar', 'StyleSheet', 'Switch',
  'Text', 'TextInput', 'TouchableOpacity', 'TouchableWithoutFeedback',
  'View', 'VirtualizedList'
];

async function fixFile(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    let modified = false;
    
    // Remove code patterns that shouldn't be in imports
    for (const [pattern, replacement] of Object.entries(codePatterns)) {
      if (content.includes(`import {\n${pattern}`)) {
        console.log(`Found "${pattern}" in import statement in ${filePath}`);
        content = content.replace(new RegExp(`import\\s*{\\s*\\n\\s*${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'), `import {\n`);
        modified = true;
      }
    }
    
    // Fix malformed imports like:
    // } from 'libphonenumber-js'; // comment
    //   Easing,
    const malformedPattern = /}\s*from\s*['"][^'"]+['"];\s*\/\/[^\n]*\n\s*(\w+,?\s*\n)/;
    if (malformedPattern.test(content)) {
      console.log(`Found malformed import in ${filePath}`);
      content = content.replace(malformedPattern, (match, component) => {
        return match.replace(/}\s*from/, `,\n  ${component.trim()}\n} from`).replace(/;\s*\/\/[^\n]*\n\s*\w+,?\s*\n/, ';');
      });
      modified = true;
    }
    
    // Fix orphaned components that should be in React Native import
    const lines = content.split('\n');
    const newLines = [];
    let inImport = false;
    let importStart = -1;
    let rnImportIndex = -1;
    let orphanedComponents = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Track import blocks
      if (line.includes('import {') || line.includes('import type {')) {
        inImport = true;
        importStart = i;
      }
      if (inImport && line.includes('} from')) {
        inImport = false;
        if (line.includes('react-native')) {
          rnImportIndex = importStart;
        }
      }
      
      // Check for orphaned RN components
      if (!inImport && trimmedLine && !line.includes('import') && !line.includes('from') && !line.includes('//')) {
        const isOrphaned = rnComponents.some(comp => {
          const pattern = new RegExp(`^${comp},?\\s*$`);
          return pattern.test(trimmedLine);
        });
        
        if (isOrphaned) {
          console.log(`Found orphaned component "${trimmedLine}" in ${filePath}`);
          orphanedComponents.push(trimmedLine.replace(',', '').trim());
          continue; // Skip this line
        }
      }
      
      newLines.push(line);
    }
    
    // Add orphaned components to React Native import
    if (orphanedComponents.length > 0 && rnImportIndex >= 0) {
      content = newLines.join('\n');
      
      // Find existing RN import and add components
      const rnImportMatch = content.match(/import\s*{\s*([^}]*)\s*}\s*from\s*['"]react-native['"]/);
      if (rnImportMatch) {
        const existingComponents = rnImportMatch[1].split(',').map(c => c.trim()).filter(c => c);
        const allComponents = [...new Set([...existingComponents, ...orphanedComponents])].sort();
        
        content = content.replace(
          /import\s*{\s*[^}]*\s*}\s*from\s*['"]react-native['"]/,
          `import {\n  ${allComponents.join(',\n  ')}\n} from 'react-native'`
        );
        modified = true;
      }
    } else if (newLines.length !== lines.length) {
      content = newLines.join('\n');
      modified = true;
    }
    
    // Fix double imports from same module
    const doubleImportPattern = /import\s*{([^}]+)}\s*from\s*['"]([^'"]+)['"];\s*\nimport\s*{([^}]+)}\s*from\s*['"]\2['"]/g;
    const doubleImports = content.match(doubleImportPattern);
    if (doubleImports) {
      console.log(`Found double imports in ${filePath}`);
      content = content.replace(doubleImportPattern, (match, imports1, module, imports2) => {
        const allImports = [...new Set([
          ...imports1.split(',').map(i => i.trim()),
          ...imports2.split(',').map(i => i.trim())
        ])].filter(i => i);
        return `import {\n  ${allImports.join(',\n  ')}\n} from '${module}'`;
      });
      modified = true;
    }
    
    if (modified) {
      await fs.writeFile(filePath, content, 'utf8');
      console.log(`✓ Fixed ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

async function findAndFixFiles(dir) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  let fixedCount = 0;
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
      fixedCount += await findAndFixFiles(fullPath);
    } else if (file.isFile() && (file.name.endsWith('.tsx') || file.name.endsWith('.ts'))) {
      if (await fixFile(fullPath)) {
        fixedCount++;
      }
    }
  }
  
  return fixedCount;
}

async function main() {
  console.log('Fixing remaining import issues...\n');
  
  const srcPath = path.join(process.cwd(), 'src');
  const fixedCount = await findAndFixFiles(srcPath);
  
  console.log(`\n✨ Fixed ${fixedCount} files`);
}

main().catch(console.error);