const fs = require('fs');
const path = require('path');

// Find all TypeScript files
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
  let modified = false;
  
  // Fix the double colon syntax error: error: queryError: should be error:
  content = content.replace(/error:\s*queryError:\s*(\w+)/g, 'error: $1');
  
  // Fix if (queryError) when it should be if (error)
  content = content.replace(/if \(queryError\) throw queryError;/g, 'if (error) throw error;');
  
  // Fix references to queryError that should be error
  content = content.replace(/if \(queryError\)/g, 'if (error)');
  
  // Fix error references in catch blocks
  content = content.replace(/console\.error\('([^']+)', err\);/g, "console.error('$1', error);");
  
  // Fix missing closing braces
  content = content.replace(/throw err;\s*}/g, 'throw err;\n    }');
  
  // Fix void void patterns
  content = content.replace(/void void /g, 'void ');
  
  if (content !== fs.readFileSync(file, 'utf8')) {
    fs.writeFileSync(file, content);
    console.log(`Fixed: ${file}`);
  }
});

console.log('\nCompleted fixing query error syntax');