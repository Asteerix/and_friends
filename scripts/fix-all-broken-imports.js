#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

async function fixBrokenImports(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    let modified = false;
    
    // Pattern 1: Fix broken React Native imports
    const brokenPattern1 = /import\s*{\s*\n\nimport\s*{[^}]+}\s*from\s*['"]@\/[^'"]+['"];[\s\S]*?\n\s+(ActivityIndicator|Dimensions|FlatList|Image|KeyboardAvoidingView|Modal|Platform|Pressable|StyleSheet|Switch|Text|TouchableOpacity|View|Alert|ScrollView|TextInput|SafeAreaView),/;
    
    if (brokenPattern1.test(content)) {
      console.log(`Fixing broken imports in: ${filePath}`);
      
      // Find all React Native components that are outside the import
      const componentsMatch = content.match(/\n\s+((?:ActivityIndicator|Dimensions|FlatList|Image|KeyboardAvoidingView|Modal|Platform|Pressable|StyleSheet|Switch|Text|TouchableOpacity|View|Alert|ScrollView|TextInput|SafeAreaView|Animated|RefreshControl|StatusBar|Button|Keyboard),?\s*\n\s*)+}\s*from\s*['"]react-native['"];/);
      
      if (componentsMatch) {
        const componentsList = componentsMatch[0]
          .replace(/}\s*from\s*['"]react-native['"];/, '')
          .trim();
        
        // Remove the broken import structure
        content = content.replace(/import\s*{\s*\n\nimport/, 'import');
        
        // Remove duplicate components list
        content = content.replace(/\n\s+((?:ActivityIndicator|Dimensions|FlatList|Image|KeyboardAvoidingView|Modal|Platform|Pressable|StyleSheet|Switch|Text|TouchableOpacity|View|Alert|ScrollView|TextInput|SafeAreaView|Animated|RefreshControl|StatusBar|Button|Keyboard),?\s*\n\s*)+}\s*from\s*['"]react-native['"];/, '');
        
        // Add React Native import in the correct place
        content = content.replace(
          /(import\s*{\s*useRouter\s*}\s*from\s*['"]expo-router['"];)\s*\n\s*import\s*{/,
          `$1\nimport {\n  ${componentsList}\n} from 'react-native';\n\nimport {`
        );
        
        modified = true;
      }
    }
    
    // Pattern 2: Fix cases where import statement is incomplete
    const incompleteImportPattern = /import\s*{\s*\n\s*import\s*{/;
    if (incompleteImportPattern.test(content)) {
      console.log(`Fixing incomplete import in: ${filePath}`);
      content = content.replace(/import\s*{\s*\n\s*import\s*{/, 'import {');
      modified = true;
    }
    
    // Pattern 3: Fix duplicate import statements
    const duplicateImportPattern = /from\s*['"]react-native['"];\s*\n\s*}\s*from\s*['"]react-native['"];/;
    if (duplicateImportPattern.test(content)) {
      console.log(`Fixing duplicate imports in: ${filePath}`);
      content = content.replace(/from\s*['"]react-native['"];\s*\n\s*}\s*from\s*['"]react-native['"];/, '} from \'react-native\';');
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
      if (await fixBrokenImports(fullPath)) {
        fixedCount++;
      }
    }
  }
  
  return fixedCount;
}

async function main() {
  console.log('Searching for files with broken imports...\n');
  
  const srcPath = path.join(process.cwd(), 'src');
  const fixedCount = await findAndFixFiles(srcPath);
  
  console.log(`\n✨ Fixed ${fixedCount} files with broken imports`);
}

main().catch(console.error);