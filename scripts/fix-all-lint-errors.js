#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('Starting comprehensive lint fix...\n');

try {
  // Fix import order and other auto-fixable issues
  console.log('Running ESLint with auto-fix...');
  execSync('npx eslint src --ext .ts,.tsx --fix', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  
  console.log('\nAll auto-fixable lint errors have been resolved!');
  console.log('Running lint check again to see remaining issues...\n');
  
  // Check remaining issues
  execSync('npm run check:lint', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
} catch (error) {
  console.log('\nSome lint errors remain that need manual fixing.');
}