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
  
  // Fix unused queryError by using underscore prefix
  content = content.replace(/const { (data[^}]*), error: queryError }/g, 'const { $1, error }');
  
  // Fix catch blocks with unused err
  content = content.replace(/} catch \(err\) {/g, '} catch {');
  
  // Fix error shadowing in catch blocks
  content = content.replace(/const { error }/g, 'const { error: fetchError }');
  content = content.replace(/if \(error\) throw error;/g, 'if (fetchError) throw fetchError;');
  
  // Fix parsing errors for missing catch/finally
  content = content.replace(/return data;\s*}\s*};/g, 'return data;\n    } catch (err) {\n      throw err;\n    }\n  };');
  
  // Fix misused promises in onRefresh
  content = content.replace(/onRefresh: async \(payload\) => {/g, 'onRefresh: (payload) => {');
  
  // Fix notification shadowing
  content = content.replace(/\.addNotificationReceivedListener\(notification => {/g, '.addNotificationReceivedListener(notif => {');
  content = content.replace(/setNotification\(notification\);/g, 'setNotification(notif);');
  
  // Fix indentation issues
  content = content.replace(/^ {6}const { status } = permissionResponse;$/gm, '    const { status } = permissionResponse;');
  content = content.replace(/^ {2}} finally {$/gm, '    } finally {');
  content = content.replace(/^ {8}} catch \(err\) {$/gm, '    } catch (err) {');
  
  // Fix import order in useStories
  if (file.includes('useStories')) {
    content = content.replace(
      /import { useState, useEffect } from 'react';\n\nimport { supabase } from '@\/shared\/lib\/supabase\/client';\nimport type { PostgrestError } from '@supabase\/supabase-js';\nimport { useSession } from '@\/shared\/providers\/SessionContext';/,
      `import { useState, useEffect } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';

import { supabase } from '@/shared/lib/supabase/client';
import { useSession } from '@/shared/providers/SessionContext';`
    );
    modified = true;
  }
  
  // Fix async in realtime subscription handlers
  content = content.replace(/\.on\(\s*'postgres_changes',\s*{[^}]+},\s*async \(payload\) => {/g, 
    '.on(\n        \'postgres_changes\',\n        { event: \'*\', schema: \'public\', table: \'polls\' },\n        (payload) => {');
  
  if (content !== fs.readFileSync(file, 'utf8')) {
    fs.writeFileSync(file, content);
    console.log(`Fixed: ${file}`);
  }
});

console.log('\nCompleted final linting fixes');