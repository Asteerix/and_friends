const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Function to categorize imports
function categorizeImport(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('import')) return null;
  
  if (trimmed.includes('react') && !trimmed.includes('react-')) return 'react';
  if (trimmed.includes('react-native')) return 'react-native';
  if (trimmed.includes('from \'@') || trimmed.includes('from "@')) return 'scoped';
  if (trimmed.includes('from \'./') || trimmed.includes('from \'../') || 
      trimmed.includes('from "./') || trimmed.includes('from "../')) return 'relative';
  return 'external';
}

// Function to fix imports in a file
function fixImportsInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const imports = {
    react: [],
    'react-native': [],
    external: [],
    scoped: [],
    relative: []
  };
  
  const nonImportLines = [];
  let inImportSection = true;
  let hasChanges = false;
  
  for (const line of lines) {
    const category = categorizeImport(line);
    
    if (category) {
      imports[category].push(line);
      inImportSection = true;
    } else if (inImportSection && line.trim() === '') {
      // Skip empty lines in import section
      hasChanges = true;
    } else {
      inImportSection = false;
      nonImportLines.push(line);
    }
  }
  
  // Build the new content
  const newLines = [];
  
  // Add imports in order with proper spacing
  const importOrder = ['react', 'react-native', 'external', 'scoped', 'relative'];
  let addedImports = false;
  
  for (const category of importOrder) {
    if (imports[category].length > 0) {
      if (addedImports) {
        newLines.push(''); // Add blank line between groups
      }
      newLines.push(...imports[category]);
      addedImports = true;
    }
  }
  
  if (addedImports && nonImportLines[0] !== '') {
    newLines.push(''); // Add blank line after imports
  }
  
  newLines.push(...nonImportLines);
  
  // Check if content changed
  const newContent = newLines.join('\n');
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent);
    return true;
  }
  
  return false;
}

// Main function
function fixAllImports() {
  const files = glob.sync('src/**/*.{ts,tsx}', {
    cwd: path.resolve(__dirname, '..'),
    absolute: true
  });
  
  let fixedCount = 0;
  
  for (const file of files) {
    if (fixImportsInFile(file)) {
      fixedCount++;
      console.log(`Fixed imports in: ${path.relative(process.cwd(), file)}`);
    }
  }
  
  console.log(`\nFixed imports in ${fixedCount} files`);
}

fixAllImports();