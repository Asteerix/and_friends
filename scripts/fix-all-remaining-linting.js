#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Fix all remaining issues comprehensively
function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Fix specific file issues
    if (filePath.includes('useEventsAdvanced.ts')) {
      content = content.replace(/error:\s*queryError:/g, 'error:');
    }
    
    if (filePath.includes('useFriends.ts')) {
      content = content.replace(/error:\s*queryError:/g, 'error:');
    }
    
    if (filePath.includes('usePollsSupabase.ts')) {
      content = content.replace(/error:\s*queryError:/g, 'error:');
    }
    
    if (filePath.includes('useUserBlocks.ts')) {
      content = content.replace(/error:\s*queryError:/g, 'error:');
    }
    
    if (filePath.includes('useSearchHistory.ts')) {
      content = content.replace(/error:\s*queryError:/g, 'error:');
      content = content.replace(/if \(queryError\)/g, 'if (error)');
    }
    
    if (filePath.includes('useStories.ts')) {
      content = content.replace(/error:\s*queryError:/g, 'error:');
      content = content.replace(/if \(queryError\)/g, 'if (error)');
      // Fix the syntax error
      content = content.replace(/return {\s*error: { message: 'Not authenticated'\s*}\s*};\s*};/g, 
        'return { error: { message: \'Not authenticated\' } };');
    }
    
    if (filePath.includes('useStoryHighlights.ts')) {
      content = content.replace(/error:\s*queryError:/g, 'error:');
      content = content.replace(/if \(queryError\)/g, 'if (error)');
    }
    
    if (filePath.includes('useReports.ts')) {
      content = content.replace(/error:\s*queryError:/g, 'error:');
      content = content.replace(/if \(queryError\)/g, 'if (error)');
    }
    
    if (filePath.includes('useEventMemories.ts')) {
      content = content.replace(/error:\s*queryError:/g, 'error:');
      content = content.replace(/if \(queryError\)/g, 'if (error)');
    }
    
    // Fix MessageBubble.tsx parsing error
    if (filePath.includes('MessageBubble.tsx')) {
      content = content.replace(/}\s*\nexport/, '};\n\nexport');
    }
    
    // Fix PhoneVerificationScreen.tsx indentation
    if (filePath.includes('PhoneVerificationScreen.tsx')) {
      const lines = content.split('\n');
      content = lines.map(line => {
        // Fix lines that start without proper indentation
        if (line.match(/^[A-Z]/) && !line.startsWith('export')) {
          return '  ' + line;
        }
        return line;
      }).join('\n');
    }
    
    // Fix RestaurantPickerScreen.tsx Timeout undefined
    if (filePath.includes('RestaurantPickerScreen.tsx')) {
      content = content.replace(/Timeout/g, 'NodeJS.Timeout');
    }
    
    // Fix no-useless-escape
    content = content.replace(/\\\.(?![*+?^${}()|[\]\\])/g, '.');
    
    // Fix activities.tsx getActivityText type
    if (filePath.includes('activities.tsx')) {
      content = content.replace(/const getActivityText = \(activity: unknown\)/, 
        'const getActivityText = (activity: any)');
    }
    
    // Fix AnimatedBackground.tsx LinearGradient colors type
    if (filePath.includes('AnimatedBackground.tsx')) {
      content = content.replace(/colors={colors as unknown}/, 
        'colors={colors as any}');
    }
    
    // Fix activities.tsx double await void
    if (filePath.includes('activities.tsx')) {
      content = content.replace(/await void refetch/g, 'await refetch');
    }
    
    // Remove unused imports
    if (filePath.includes('CodeVerificationScreen.tsx')) {
      content = content.replace(/import[^;]+Alert[^;]+;/g, (match) => {
        const imports = match.match(/{\s*([^}]+)\s*}/)?.[1]?.split(',').map(i => i.trim()) || [];
        const filtered = imports.filter(i => !['Alert', 'Pressable', 'TouchableOpacity'].includes(i));
        if (filtered.length === 0) return '';
        return match.replace(/{\s*[^}]+\s*}/, `{ ${filtered.join(', ')} }`);
      });
    }
    
    if (filePath.includes('ChatCard.tsx')) {
      content = content.replace(/export (interface|type) ChatCardType[^}]+}/g, '');
    }
    
    // Fix import order - this is a simplified version
    const lines = content.split('\n');
    const imports = {
      react: [],
      reactNative: [],
      expo: [],
      external: [],
      internal: [],
      relative: []
    };
    
    let nonImportStartIndex = -1;
    let inImportBlock = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.trim().startsWith('import')) {
        inImportBlock = true;
        
        if (line.includes('from \'react\'') || line.includes('from "react"')) {
          imports.react.push(line);
        } else if (line.includes('react-native')) {
          imports.reactNative.push(line);
        } else if (line.includes('expo') || line.includes('@expo')) {
          imports.expo.push(line);
        } else if (line.includes('@/')) {
          imports.internal.push(line);
        } else if (line.includes('./') || line.includes('../')) {
          imports.relative.push(line);
        } else {
          imports.external.push(line);
        }
      } else if (inImportBlock && line.trim() && !line.trim().startsWith('import')) {
        nonImportStartIndex = i;
        break;
      }
    }
    
    if (nonImportStartIndex > 0) {
      const orderedImports = [
        ...imports.react,
        ...imports.reactNative,
        ...(imports.expo.length ? ['', ...imports.expo] : []),
        ...(imports.external.length ? ['', ...imports.external] : []),
        ...(imports.internal.length ? ['', ...imports.internal] : []),
        ...(imports.relative.length ? ['', ...imports.relative] : [])
      ].filter((line, index, arr) => {
        // Remove duplicate empty lines
        return !(line === '' && index > 0 && arr[index - 1] === '');
      });
      
      const restOfFile = lines.slice(nonImportStartIndex);
      content = [...orderedImports, '', ...restOfFile].join('\n');
    }
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`Fixed: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Get all TypeScript files
const files = glob.sync('src/**/*.{ts,tsx}', {
  cwd: process.cwd(),
  absolute: true
});

console.log('Applying all remaining linting fixes...');

let fixedCount = 0;
files.forEach(file => {
  if (fixFile(file)) {
    fixedCount++;
  }
});

console.log(`Fixed ${fixedCount} files.`);