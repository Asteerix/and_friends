#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

function fixImportOrder(content) {
  const lines = content.split('\n');
  const imports = {
    react: [],
    reactNative: [],
    expo: [],
    dateFns: [],
    external: [],
    internal: [],
    relative: []
  };
  
  let currentImport = '';
  let nonImportStartIndex = -1;
  let i = 0;
  
  // Collect all imports
  while (i < lines.length) {
    const line = lines[i];
    
    // Handle multi-line imports
    if (currentImport || line.trim().startsWith('import')) {
      currentImport += (currentImport ? '\n' : '') + line;
      
      // Check if import is complete
      if (currentImport.includes(';') || (currentImport.includes('from') && currentImport.includes(')') && !currentImport.includes('(')) || (currentImport.includes('from') && currentImport.includes('}') && !currentImport.includes('{'))) {
        // Process complete import
        const importLine = currentImport.trim();
        
        if (importLine.includes('from \'react\'') || importLine.includes('from "react"')) {
          imports.react.push(importLine);
        } else if (importLine.includes('react-native')) {
          imports.reactNative.push(importLine);
        } else if (importLine.includes('date-fns')) {
          imports.dateFns.push(importLine);
        } else if (importLine.includes('expo') || importLine.includes('@expo')) {
          imports.expo.push(importLine);
        } else if (importLine.includes('@/')) {
          imports.internal.push(importLine);
        } else if (importLine.includes('./') || importLine.includes('../')) {
          imports.relative.push(importLine);
        } else if (importLine.startsWith('import')) {
          imports.external.push(importLine);
        }
        
        currentImport = '';
      }
      i++;
    } else if (line.trim() && nonImportStartIndex === -1) {
      nonImportStartIndex = i;
      break;
    } else {
      i++;
    }
  }
  
  // Build ordered imports according to ESLint rules
  const orderedImports = [];
  
  // Order: builtin, external, internal, parent, sibling, index
  // For React Native: react, react-native, expo packages, external packages, internal (@/), relative
  if (imports.react.length) orderedImports.push(...imports.react);
  if (imports.reactNative.length) orderedImports.push(...imports.reactNative);
  
  if (imports.dateFns.length || imports.expo.length || imports.external.length) {
    if (orderedImports.length) orderedImports.push('');
    if (imports.dateFns.length) orderedImports.push(...imports.dateFns);
    if (imports.expo.length) orderedImports.push(...imports.expo);
    if (imports.external.length) orderedImports.push(...imports.external);
  }
  
  if (imports.internal.length) {
    if (orderedImports.length) orderedImports.push('');
    orderedImports.push(...imports.internal);
  }
  
  if (imports.relative.length) {
    if (orderedImports.length) orderedImports.push('');
    orderedImports.push(...imports.relative);
  }
  
  // Get the rest of the file
  const restOfFile = nonImportStartIndex >= 0 ? lines.slice(nonImportStartIndex) : [];
  
  // Combine everything
  return [...orderedImports, '', ...restOfFile].join('\n').replace(/\n{3,}/g, '\n\n');
}

// Process all TypeScript files
const files = glob.sync('src/**/*.{ts,tsx}', {
  cwd: process.cwd(),
  absolute: true
});

console.log('Fixing import order in all files...');

let fixedCount = 0;
files.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const fixed = fixImportOrder(content);
    
    if (fixed !== content) {
      fs.writeFileSync(file, fixed);
      console.log(`Fixed: ${path.relative(process.cwd(), file)}`);
      fixedCount++;
    }
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
});

console.log(`Fixed ${fixedCount} files.`);