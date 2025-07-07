#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Fix double void operators
function fixDoubleVoid(content) {
  return content.replace(/void\s+void\s+/g, 'void ');
}

// Get all TypeScript files
const files = glob.sync('src/**/*.{ts,tsx}', {
  cwd: process.cwd(),
  absolute: true
});

console.log('Fixing double void operators...');

let fixedCount = 0;
files.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    const fixed = fixDoubleVoid(content);
    
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