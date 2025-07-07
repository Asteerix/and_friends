#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

async function fixImports(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    let modified = false;
    
    // Fix pattern where there's a hanging `} from 'module';` without proper import
    const hangingImportPattern = /^}\s*from\s*['"][^'"]+['"];\s*$/gm;
    if (hangingImportPattern.test(content)) {
      console.log(`Fixing hanging imports in: ${filePath}`);
      content = content.replace(hangingImportPattern, '');
      modified = true;
    }
    
    // Fix imports that have wrong structure like:
    // import {
    // import { something } from 'module';
    const doubleImportPattern = /import\s*{\s*\nimport\s*{/g;
    if (doubleImportPattern.test(content)) {
      console.log(`Fixing double import in: ${filePath}`);
      content = content.replace(doubleImportPattern, 'import {');
      modified = true;
    }
    
    // Fix case where import statement is split incorrectly
    // Looking for patterns like:
    // import { something } from 'module1';
    // } from 'react-native';
    const splitImportPattern = /(import\s*{[^}]+}\s*from\s*['"][^'"]+['"];\s*\n)\s*}\s*from\s*['"]react-native['"];/g;
    if (splitImportPattern.test(content)) {
      console.log(`Fixing split imports in: ${filePath}`);
      content = content.replace(splitImportPattern, '$1');
      modified = true;
    }
    
    // Fix orphaned React Native components
    // Pattern where components are listed outside any import statement
    const orphanedComponentsPattern = /\n\s*((?:ActivityIndicator|Dimensions|FlatList|Image|KeyboardAvoidingView|Modal|Platform|Pressable|StyleSheet|Switch|Text|TouchableOpacity|View|Alert|ScrollView|TextInput|SafeAreaView|Animated|RefreshControl|StatusBar|Button|Keyboard|Linking),?\s*)+\n/g;
    const matches = content.match(orphanedComponentsPattern);
    if (matches && matches.some(m => m.trim().length > 0)) {
      console.log(`Found orphaned components in: ${filePath}`);
      
      // Remove orphaned components
      content = content.replace(orphanedComponentsPattern, '\n');
      
      // Add them to React Native import if it exists
      const rnImportMatch = content.match(/import\s*{\s*([^}]*)\s*}\s*from\s*['"]react-native['"];/);
      if (rnImportMatch) {
        const existingComponents = rnImportMatch[1].split(',').map(c => c.trim()).filter(c => c);
        const orphanedComponents = matches.join(',').split(',').map(c => c.trim()).filter(c => c);
        const allComponents = [...new Set([...existingComponents, ...orphanedComponents])].filter(c => c);
        
        content = content.replace(
          /import\s*{\s*[^}]*\s*}\s*from\s*['"]react-native['"];/,
          `import {\n  ${allComponents.join(',\n  ')}\n} from 'react-native';`
        );
      }
      
      modified = true;
    }
    
    // Fix imports with missing module specifier
    const incompleteImportPattern = /import\s*{([^}]+)}\s*from\s*;/g;
    if (incompleteImportPattern.test(content)) {
      console.log(`Fixing incomplete imports in: ${filePath}`);
      content = content.replace(incompleteImportPattern, '// FIXME: Incomplete import removed');
      modified = true;
    }
    
    // Fix case where there's random code between imports
    const codeInImportsPattern = /(import\s*{)\s*\n[^}]*?(\w+\s*=|const\s+|let\s+|var\s+|function\s+|class\s+)/;
    if (codeInImportsPattern.test(content)) {
      console.log(`Found code mixed with imports in: ${filePath}`);
      // This is more complex, mark for manual review
      console.log(`  ⚠️  Needs manual review: ${filePath}`);
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
      if (await fixImports(fullPath)) {
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