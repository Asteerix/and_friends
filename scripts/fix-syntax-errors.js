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
  let modified = false;
  
  // Fix broken try-catch blocks
  content = content.replace(/}\s*catch \(err\) {/g, '    } catch (err) {');
  
  // Fix misplaced catch blocks
  content = content.replace(/setMemories\(data \|\| \[\]\);\s*} catch \(err\) {/g, 'setMemories(data || []);\n    } catch (err) {');
  content = content.replace(/setFriends\(data \|\| \[\]\);\s*} catch \(err\) {/g, 'setFriends(data || []);\n    } catch (err) {');
  content = content.replace(/return data;\s*} catch \(err\) {/g, 'return data;\n    } catch (err) {');
  
  // Fix missing closing braces in useEventsAdvanced
  if (file.includes('useEventsAdvanced')) {
    // Fix the broken if statement
    content = content.replace(/return { error: { message: 'Not authenticated - no current session' } };\s*\/\/ Utiliser la session/g, 
      'return { error: { message: \'Not authenticated - no current session\' } };\n        }\n        // Utiliser la session');
    
    // Fix missing closing braces
    content = content.replace(/return { error: { message: 'Authentication error' } };\s*}\s*\/\/ Récupérer/g, 
      'return { error: { message: \'Authentication error\' } };\n      }\n    }\n\n    // Récupérer');
    
    content = content.replace(/return { error: { message: 'Unable to get user ID' } };\s*try {/g, 
      'return { error: { message: \'Unable to get user ID\' } };\n    }\n\n    try {');
    
    content = content.replace(/return { error: { message: 'Not authenticated' } };\s*try {/g, 
      'return { error: { message: \'Not authenticated\' } };\n    }\n\n    try {');
    
    modified = true;
  }
  
  // Fix void fetchEvents
  content = content.replace(/await void fetchEvents\(\);/g, 'await fetchEvents();');
  
  if (content !== fs.readFileSync(file, 'utf8')) {
    fs.writeFileSync(file, content);
    console.log(`Fixed syntax errors in: ${file}`);
  }
});

console.log('\nCompleted fixing syntax errors');