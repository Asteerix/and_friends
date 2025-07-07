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
  
  // Fix error shadowing by renaming inner error variables
  content = content.replace(/const { data(?:, error)?(?::[^}]+)? } = await/g, (match) => {
    if (match.includes('error')) {
      modified = true;
      return match.replace('error', 'error: queryError');
    }
    return match;
  });
  
  // Fix specific error patterns
  content = content.replace(/if \(error\) throw error;/g, 'if (queryError) throw queryError;');
  content = content.replace(/if \(error\)/g, 'if (queryError)');
  
  // Fix no-useless-catch
  content = content.replace(/} catch \(err\) {\s*throw err;\s*}/g, '}');
  
  // Fix Promise-returning function in onRefresh
  content = content.replace(/onRefresh: async \(\) => {\s*fetchActivities\(\);\s*}/g, 'onRefresh: () => { void fetchActivities(); }');
  
  // Fix floating promises
  content = content.replace(/(\s+)(fetchActivities|fetchFriends|fetchFriendRequests|fetchHighlights|fetchBlockedUsers)\(\);/g, '$1void $2();');
  
  // Fix any types
  content = content.replace(/: any\[\]/g, ': unknown[]');
  content = content.replace(/\(([^:)]+): any\)/g, '($1: unknown)');
  content = content.replace(/data\?: any/g, 'data?: Record<string, unknown>');
  content = content.replace(/mediaTypes: 'images' as any/g, "mediaTypes: ImagePicker.MediaTypeOptions.Images");
  content = content.replace(/mediaTypes: 'videos' as any/g, "mediaTypes: ImagePicker.MediaTypeOptions.Videos");
  
  // Fix parsing error in useStories
  if (file.includes('useStories')) {
    content = content.replace(/return { error: { message: 'Not authenticated' } };\s*};/g, 
      'return { error: { message: \'Not authenticated\' } };');
    modified = true;
  }
  
  // Fix notification permissions issue
  if (file.includes('usePushNotifications')) {
    content = content.replace(/const { status } = await Notifications\.getPermissionsAsync\(\);/g,
      'const permissionResponse = await Notifications.getPermissionsAsync();\n      const { status } = permissionResponse;');
    modified = true;
  }
  
  if (content !== fs.readFileSync(file, 'utf8')) {
    fs.writeFileSync(file, content);
    console.log(`Fixed: ${file}`);
  }
});

console.log('\nCompleted final linting fixes');