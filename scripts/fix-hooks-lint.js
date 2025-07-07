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
  
  // Fix floating promises by adding void operator
  content = content.replace(/(\s+)(fetchMemories|refreshMemories|loadEvents|loadChats|loadMessages|loadNotifications|loadStories|loadActivities|loadFriends|loadSearchHistory|loadPollData|loadProfile|checkOnboardingStatus|loadReports|loadBlocks|loadHighlights|loadTemplates)\(\);/g, (match, space, funcName) => {
    modified = true;
    return `${space}void ${funcName}();`;
  });
  
  // Fix specific floating promise patterns
  content = content.replace(/(\s+)(supabase\.channel\([^)]+\)\.subscribe\(\));/g, (match, space, expr) => {
    modified = true;
    return `${space}void ${expr};`;
  });
  
  // Fix subscription.unsubscribe() promises
  content = content.replace(/(\s+)(subscription\.unsubscribe\(\));/g, (match, space, expr) => {
    modified = true;
    return `${space}void ${expr};`;
  });
  
  // Fix error shadowing - rename inner error variables to err
  content = content.replace(/} catch \(error\)/g, '} catch (err)');
  content = content.replace(/console\.error\('([^']+)', error\)/g, "console.error('$1', err)");
  content = content.replace(/setError\(error\./g, 'setError(err.');
  content = content.replace(/throw error;/g, 'throw err;');
  
  // Fix any type annotations
  content = content.replace(/: any\b/g, ': unknown');
  content = content.replace(/<any>/g, '<unknown>');
  
  // Fix 'as any' casts - be more specific
  content = content.replace(/mediaTypes: 'images' as any/g, "mediaTypes: 'images' as ImagePicker.MediaTypeOptions");
  content = content.replace(/mediaTypes: 'videos' as any/g, "mediaTypes: 'videos' as ImagePicker.MediaTypeOptions");
  
  // Fix no-useless-catch
  content = content.replace(/try\s*{\s*throw error;\s*}\s*catch\s*\(error\)\s*{\s*throw error;\s*}/g, 'throw error;');
  
  // Fix Promise-returning function provided to property
  content = content.replace(/onRefresh: async \(\) => {/g, 'onRefresh: () => {');
  
  if (modified) {
    fs.writeFileSync(file, content);
    console.log(`Fixed: ${file}`);
  }
});

console.log('Fixed linting issues in hook files');