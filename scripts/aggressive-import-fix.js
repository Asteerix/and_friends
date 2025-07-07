#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// Known patterns that indicate broken imports
const brokenPatterns = [
  // Pattern: import { supabase } from '@/...'
  /import\s*{\s*supabase\s*}\s*from\s*['"]@\//,
  // Pattern: } from 'module';
  /^}\s*from\s*['"][^'"]+['"];\s*$/gm,
];

async function fixFile(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    let modified = false;
    
    // Find all lines
    const lines = content.split('\n');
    const fixedLines = [];
    let currentImport = null;
    let importDepth = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Skip empty lines in imports
      if (currentImport && trimmedLine === '') {
        continue;
      }
      
      // Detect start of import
      if (line.includes('import ') && line.includes('{')) {
        currentImport = {
          start: i,
          lines: [line],
          fromModule: ''
        };
        importDepth = 1;
        
        // Check if it's a complete import on one line
        if (line.includes('} from ')) {
          fixedLines.push(line);
          currentImport = null;
          importDepth = 0;
        }
        continue;
      }
      
      // If we're in an import
      if (currentImport) {
        // Count braces
        for (const char of line) {
          if (char === '{') importDepth++;
          if (char === '}') importDepth--;
        }
        
        // Check if this line has "from"
        if (line.includes('from ')) {
          currentImport.fromModule = line;
          
          // Reconstruct the import
          const importItems = [];
          for (const importLine of currentImport.lines) {
            if (!importLine.includes('import ') && !importLine.includes('from ')) {
              const items = importLine.split(',').map(item => item.trim()).filter(item => item && item !== '{' && item !== '}');
              importItems.push(...items);
            }
          }
          
          // Extract module name
          const moduleMatch = line.match(/from\s*['"]([^'"]+)['"]/);
          if (moduleMatch) {
            const moduleName = moduleMatch[1];
            const cleanedItems = importItems.filter(item => {
              // Remove invalid items
              return item && 
                !item.includes('=') && 
                !item.includes('export') &&
                !item.includes('const') &&
                !item.includes('type ') &&
                !item.includes('interface ') &&
                !item.includes('"') &&
                !item.includes("'");
            });
            
            if (cleanedItems.length > 0) {
              fixedLines.push(`import {\n  ${cleanedItems.join(',\n  ')}\n} from '${moduleName}';`);
            }
          }
          
          currentImport = null;
          importDepth = 0;
          modified = true;
          continue;
        } else {
          currentImport.lines.push(line);
          continue;
        }
      }
      
      // Fix orphaned "} from 'module';" lines
      if (trimmedLine.startsWith('} from ') && trimmedLine.endsWith(';')) {
        console.log(`Found orphaned import close in ${filePath}: ${trimmedLine}`);
        modified = true;
        continue; // Skip this line
      }
      
      // Fix lines that look like they should be in imports but aren't
      if (i < 50 && // Only in the import section
          !line.includes('//') && 
          !line.includes('/*') &&
          !line.includes('const ') &&
          !line.includes('let ') &&
          !line.includes('var ') &&
          !line.includes('function ') &&
          !line.includes('class ') &&
          !line.includes('export ') &&
          !line.includes('type ') &&
          !line.includes('interface ') &&
          trimmedLine.match(/^[A-Z]\w*,?\s*$/)) {
        console.log(`Found potential orphaned component in ${filePath}: ${trimmedLine}`);
        // This will be handled later
      }
      
      fixedLines.push(line);
    }
    
    if (modified) {
      content = fixedLines.join('\n');
      
      // Final cleanup - merge React Native imports
      const rnImports = [];
      const rnImportPattern = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]react-native['"];?/g;
      let match;
      while ((match = rnImportPattern.exec(content)) !== null) {
        const components = match[1].split(',').map(c => c.trim()).filter(c => c);
        rnImports.push(...components);
      }
      
      if (rnImports.length > 1) {
        // Remove all RN imports
        content = content.replace(rnImportPattern, '');
        
        // Add consolidated import after the first import
        const firstImportMatch = content.match(/import[^;]+;/);
        if (firstImportMatch) {
          const uniqueComponents = [...new Set(rnImports)].sort();
          const newImport = `\nimport {\n  ${uniqueComponents.join(',\n  ')}\n} from 'react-native';`;
          const insertPos = firstImportMatch.index + firstImportMatch[0].length;
          content = content.slice(0, insertPos) + newImport + content.slice(insertPos);
        }
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
      if (await fixFile(fullPath)) {
        fixedCount++;
      }
    }
  }
  
  return fixedCount;
}

async function main() {
  console.log('Aggressively fixing import issues...\n');
  
  const srcPath = path.join(process.cwd(), 'src');
  const fixedCount = await findAndFixFiles(srcPath);
  
  console.log(`\n✨ Fixed ${fixedCount} files`);
}

main().catch(console.error);