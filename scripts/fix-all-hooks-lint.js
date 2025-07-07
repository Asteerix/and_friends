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
  
  // Fix syntax errors with return objects
  content = content.replace(/return {\s*error: { message: '([^']+)'\s*};\s*};\s*}/g, (match, message) => {
    modified = true;
    return `return { error: { message: '${message}' } };`;
  });
  
  // Fix indentation issues in catch blocks
  content = content.replace(/} catch \(err\) {([^}]+)} finally {/g, (match, catchContent) => {
    modified = true;
    const lines = catchContent.split('\n').filter(line => line.trim()).map(line => '      ' + line.trim());
    return '    } catch (err) {\n' + lines.join('\n') + '\n    } finally {';
  });
  
  // Fix any type annotations with specific types
  if (file.includes('useActivities')) {
    content = content.replace(/activities: any\[\]/g, 'activities: Activity[]');
    content = content.replace(/: any\) =>/g, ': Activity) =>');
    modified = true;
  }
  
  if (file.includes('useReports')) {
    content = content.replace(/data: any/g, 'data: Report');
    content = content.replace(/reports: any\[\]/g, 'reports: Report[]');
    modified = true;
  }
  
  if (file.includes('useOnboardingStatus')) {
    content = content.replace(/data: any/g, 'data: Profile');
    content = content.replace(/\(error: any\)/g, '(error: unknown)');
    modified = true;
  }
  
  if (file.includes('useOtpVerification')) {
    content = content.replace(/\(error: any\)/g, '(error: unknown)');
    content = content.replace(/\(err: any\)/g, '(err: unknown)');
    modified = true;
  }
  
  // Fix floating promises in useActivities
  if (file.includes('useActivities')) {
    content = content.replace(/fetchActivities\(\);/g, 'void fetchActivities();');
    modified = true;
  }
  
  // Fix floating promises in useChats
  if (file.includes('useChats')) {
    content = content.replace(/loadChats\(\);/g, 'void loadChats();');
    modified = true;
  }
  
  // Fix floating promises in useEvents
  if (file.includes('useEvents')) {
    content = content.replace(/fetchEvents\(\);/g, 'void fetchEvents();');
    modified = true;
  }
  
  // Fix floating promises in useNotifications
  if (file.includes('useNotifications')) {
    content = content.replace(/fetchNotifications\(\);/g, 'void fetchNotifications();');
    modified = true;
  }
  
  // Fix floating promises in useOnboardingStatus
  if (file.includes('useOnboardingStatus')) {
    content = content.replace(/checkOnboardingStatus\(\);/g, 'void checkOnboardingStatus();');
    modified = true;
  }
  
  // Fix misused promises in event handlers
  content = content.replace(/onRefresh: async \(\) => {/g, 'onRefresh: () => {');
  
  // Fix no-useless-catch
  content = content.replace(/try\s*{\s*throw\s+error;\s*}\s*catch\s*\(error\)\s*{\s*throw\s+error;\s*}/g, 'throw error;');
  
  // Add missing type for data parameter
  content = content.replace(/data\?: any/g, 'data?: Record<string, unknown>');
  
  if (modified) {
    fs.writeFileSync(file, content);
    console.log(`Fixed: ${file}`);
  }
});

console.log('\nCompleted fixing linting issues in hook files');