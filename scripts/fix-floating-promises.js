const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Common promise-returning function patterns
const promisePatterns = [
  /router\.(push|replace|navigate|back)/,
  /Haptics\./,
  /supabase\./,
  /fetch\(/,
  /\.then\(/,
  /\.catch\(/,
  /async\s+/,
  /Promise\./,
  /\.json\(\)/,
  /\.save\(\)/,
  /\.update\(/,
  /\.delete\(/,
  /\.create\(/,
  /\.subscribe\(/,
  /\.unsubscribe\(/,
  /navigation\./,
  /Audio\./,
  /Video\./,
  /FileSystem\./,
  /AsyncStorage\./,
  /SecureStore\./,
  /Notifications\./,
  /Location\./,
  /ImagePicker\./,
  /refetch\(/
];

// Function to check if a line likely contains a floating promise
function isLikelyFloatingPromise(line) {
  const trimmed = line.trim();
  
  // Skip if already has void, await, return, or assignment
  if (trimmed.startsWith('void ') || 
      trimmed.startsWith('await ') || 
      trimmed.startsWith('return ') ||
      trimmed.includes(' = ') ||
      trimmed.includes('const ') ||
      trimmed.includes('let ') ||
      trimmed.includes('var ')) {
    return false;
  }
  
  // Check if it matches any promise pattern
  return promisePatterns.some(pattern => pattern.test(trimmed));
}

// Function to fix floating promises in a file
function fixFloatingPromisesInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let hasChanges = false;
  
  const newLines = lines.map((line, index) => {
    if (isLikelyFloatingPromise(line)) {
      const indentation = line.match(/^(\s*)/)[1];
      const trimmed = line.trim();
      
      // Special handling for certain patterns
      if (trimmed.endsWith(';')) {
        hasChanges = true;
        return `${indentation}void ${trimmed}`;
      } else if (trimmed.endsWith(')') || trimmed.endsWith('}')) {
        // Multi-line promise call - just add void to the start
        hasChanges = true;
        return `${indentation}void ${trimmed}`;
      }
    }
    return line;
  });
  
  if (hasChanges) {
    fs.writeFileSync(filePath, newLines.join('\n'));
    return true;
  }
  
  return false;
}

// Main function
function fixAllFloatingPromises() {
  const files = glob.sync('src/**/*.{ts,tsx}', {
    cwd: path.resolve(__dirname, '..'),
    absolute: true
  });
  
  let fixedCount = 0;
  
  for (const file of files) {
    if (fixFloatingPromisesInFile(file)) {
      fixedCount++;
      console.log(`Fixed floating promises in: ${path.relative(process.cwd(), file)}`);
    }
  }
  
  console.log(`\nFixed floating promises in ${fixedCount} files`);
}

fixAllFloatingPromises();