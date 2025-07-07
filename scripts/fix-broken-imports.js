#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

async function fixBrokenImports(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    
    // Pattern to find broken imports where React Native components are outside the import statement
    const brokenImportPattern = /import\s*{\s*\n\nimport\s*{[^}]+}\s*from\s*['"]@\/[^'"]+['"];[\s\S]*?(\s+ActivityIndicator,[\s\S]*?}\s*from\s*['"]react-native['"];)/;
    
    if (brokenImportPattern.test(content)) {
      console.log(`Fixing broken imports in: ${filePath}`);
      
      // Extract the React Native components list
      const match = content.match(/(\s+ActivityIndicator,[\s\S]*?)\s*}\s*from\s*['"]react-native['"];/);
      if (match) {
        const componentsList = match[1];
        
        // Replace the broken import pattern
        content = content.replace(
          /import\s*{\s*\n\nimport/,
          'import'
        );
        
        // Remove the duplicate components list
        content = content.replace(
          /\/\/[^\n]*\n\/\/[^\n]*\n\n\s+ActivityIndicator,[\s\S]*?}\s*from\s*['"]react-native['"];\s*\n/,
          ''
        );
        
        // Fix the React Native import
        content = content.replace(
          /import\s*{\s*\n/,
          `import {\n${componentsList}\n} from 'react-native';\n\nimport {\n`
        );
      }
      
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