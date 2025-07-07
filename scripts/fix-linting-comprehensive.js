#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Fix duplicate imports and redeclarations
function fixDuplicateImports(content) {
  // Remove duplicate React imports
  const lines = content.split('\n');
  const seenImports = new Set();
  const newLines = [];
  
  for (const line of lines) {
    // Check if it's a React import
    if (line.includes('import') && line.includes('from \'react\'')) {
      const importMatch = line.match(/import\s*{([^}]+)}\s*from\s*['"]react['"]/);
      if (importMatch) {
        const imports = importMatch[1].split(',').map(i => i.trim());
        const newImports = imports.filter(imp => !seenImports.has(imp));
        
        if (newImports.length > 0) {
          newImports.forEach(imp => seenImports.add(imp));
          newLines.push(`import { ${newImports.join(', ')} } from 'react';`);
        }
      } else if (line.includes('import React')) {
        if (!seenImports.has('React')) {
          seenImports.add('React');
          newLines.push(line);
        }
      }
    } else {
      newLines.push(line);
    }
  }
  
  return newLines.join('\n');
}

// Fix missing closing brackets and syntax errors
function fixSyntaxErrors(content) {
  // Fix missing closing bracket in imports
  content = content.replace(/import\s*{[^}]+from\s*['"][^'"]+['"]/g, (match) => {
    if (!match.includes('}')) {
      const parts = match.split('from');
      return parts[0] + '} from' + parts[1];
    }
    return match;
  });
  
  // Fix duplicate import statements
  content = content.replace(/^(import\s+.+from\s+['"][^'"]+['"];?)\s*\n\1/gm, '$1');
  
  // Fix missing semicolons
  content = content.replace(/\}\s*\nexport/g, '};\nexport');
  
  // Fix type assertions in arrow functions
  content = content.replace(/as\s+[A-Z]\w+<[^>]+>>/g, (match) => {
    return match.replace(/>>/g, '>');
  });
  
  return content;
}

// Fix import order according to ESLint rules
function fixImportOrder(content) {
  const lines = content.split('\n');
  const imports = {
    react: [],
    reactNative: [],
    expo: [],
    external: [],
    internal: [],
    relative: []
  };
  
  let nonImportStartIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (!line.trim().startsWith('import')) {
      if (line.trim() && nonImportStartIndex === -1) {
        nonImportStartIndex = i;
      }
      continue;
    }
    
    if (line.includes('from \'react\'') || line.includes('from "react"')) {
      imports.react.push(line);
    } else if (line.includes('from \'react-native') || line.includes('from "react-native')) {
      imports.reactNative.push(line);
    } else if (line.includes('from \'expo') || line.includes('from "expo') || line.includes('from \'@expo')) {
      imports.expo.push(line);
    } else if (line.includes('from \'./') || line.includes('from \'../') || line.includes('from "./') || line.includes('from "../')) {
      imports.relative.push(line);
    } else if (line.includes('from \'@') || line.includes('from "@')) {
      imports.internal.push(line);
    } else {
      imports.external.push(line);
    }
  }
  
  // Reconstruct imports in correct order
  const orderedImports = [
    ...imports.react,
    ...imports.reactNative,
    '',
    ...imports.expo,
    '',
    ...imports.external,
    '',
    ...imports.internal,
    '',
    ...imports.relative
  ].filter((line, index, arr) => {
    // Remove consecutive empty lines
    return !(line === '' && arr[index - 1] === '');
  });
  
  // Get the rest of the file
  const restOfFile = lines.slice(nonImportStartIndex);
  
  return [...orderedImports, '', ...restOfFile].join('\n');
}

// Remove unused React imports in screen files
function removeUnusedReactImports(content, filePath) {
  if (filePath.includes('/screens/') && !content.includes('<React.') && !content.includes('React.')) {
    content = content.replace(/^import React from ['"]react['"];?\s*\n/gm, '');
  }
  return content;
}

// Fix floating promises
function fixFloatingPromises(content) {
  // Add void operator to common floating promise patterns
  content = content.replace(/(\s+)(router\.(push|replace|back)\([^)]*\));/g, '$1void $2;');
  content = content.replace(/(\s+)(refetch\(\));/g, '$1void $2;');
  content = content.replace(/(\s+)(Audio\.(requestPermissions|setAudioMode)\([^)]*\));/g, '$1void $2;');
  
  return content;
}

// Fix any type warnings
function fixAnyTypes(content) {
  // Replace common any patterns with more specific types
  content = content.replace(/:\s*any\[\]/g, ': unknown[]');
  content = content.replace(/:\s*{[^}]*:\s*any}/g, (match) => {
    return match.replace(/:\s*any/g, ': unknown');
  });
  
  return content;
}

// Main function to process files
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Apply fixes in order
    content = fixDuplicateImports(content);
    content = fixSyntaxErrors(content);
    content = fixImportOrder(content);
    content = removeUnusedReactImports(content, filePath);
    content = fixFloatingPromises(content);
    content = fixAnyTypes(content);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`Fixed: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Get all TypeScript files
const files = glob.sync('src/**/*.{ts,tsx}', {
  cwd: process.cwd(),
  absolute: true
});

console.log(`Processing ${files.length} files...`);

let fixedCount = 0;
files.forEach(file => {
  if (processFile(file)) {
    fixedCount++;
  }
});

console.log(`Fixed ${fixedCount} files.`);