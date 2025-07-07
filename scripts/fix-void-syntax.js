const fs = require('fs');
const path = require('path');

// Find all TypeScript files in src/hooks
function findTsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(findTsFiles(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const hooksDir = path.join(__dirname, '../src/hooks');
const files = findTsFiles(hooksDir);

files.forEach((file) => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Fix the void syntax error - remove 'void' before method calls
  content = content.replace(/\bvoid\s*\./g, '.');
  
  fs.writeFileSync(file, content);
  console.log(`Fixed: ${file}`);
});

console.log('Fixed void syntax errors in all hook files');