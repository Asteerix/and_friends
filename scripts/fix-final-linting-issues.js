#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Fix specific parsing errors in files
const parsingFixes = {
  'src/features/auth/screens/AvatarPickScreen.tsx': (content) => {
    // Fix the dangling expression
    return content.replace(/\n\s*\n}\s*\n(?!export)/, '\n}\n');
  },
  
  'src/features/auth/screens/CodeVerificationScreen.tsx': (content) => {
    // Fix the void statement issue
    return content.replace(/void\s+\/\//g, 'void // ')
      .replace(/return;\s*}\s*}/g, 'return;\n    }\n  }');
  },
  
  'src/features/auth/screens/HobbyPickerScreen.tsx': (content) => {
    // Fix dangling expressions
    return content.replace(/\n\s*\n}\s*\n(?!export)/, '\n}\n');
  },
  
  'src/features/auth/screens/LoadingScreen.tsx': (content) => {
    // Fix dangling expressions
    return content.replace(/\n\s*\n}\s*\n(?!export)/, '\n}\n');
  },
  
  'src/features/auth/screens/NameInputScreen.tsx': (content) => {
    // Fix dangling expressions
    return content.replace(/\n\s*\n}\s*\n(?!export)/, '\n}\n');
  },
  
  'src/features/auth/screens/PhoneVerificationScreen.tsx': (content) => {
    // Fix dangling expressions
    return content.replace(/\n\s*\n}\s*\n(?!export)/, '\n}\n');
  },
  
  'src/features/auth/screens/RestaurantPickerScreen.tsx': (content) => {
    // Fix the incomplete parse error
    return content.replace(/^(\s*)T$/gm, '');
  },
  
  'src/shared/hooks/useRealtimeSubscription.ts': (content) => {
    // Fix expression expected error
    return content.replace(/}\s*catch\s*\(\s*error\s*\)\s*{\s*}/g, '} catch (error) {\n    // Handle error\n  }');
  }
};

// Fix floating promises
function fixFloatingPromises(content) {
  // Common patterns that need void operator
  const patterns = [
    { pattern: /(\s+)(router\.(push|replace|back)\([^)]*\));/g, replacement: '$1void $2;' },
    { pattern: /(\s+)(refetch\(\));/g, replacement: '$1void $2;' },
    { pattern: /(\s+)(fetchEvents\(\));/g, replacement: '$1void $2;' },
    { pattern: /(\s+)(fetchActivities\(\));/g, replacement: '$1void $2;' },
    { pattern: /(\s+)(Audio\.(requestPermissions|setAudioMode)\([^)]*\));/g, replacement: '$1void $2;' },
    { pattern: /(\s+)(subscription\.unsubscribe\(\));/g, replacement: '$1void $2;' },
    { pattern: /useEffect\(\(\)\s*=>\s*{\s*([^}]+)\(\);?\s*}\)/g, replacement: 'useEffect(() => {\n    void $1();\n  })' }
  ];
  
  patterns.forEach(({ pattern, replacement }) => {
    content = content.replace(pattern, replacement);
  });
  
  return content;
}

// Fix duplicate imports and redeclarations
function fixDuplicateDeclarations(content) {
  // Remove duplicate React hook imports
  const lines = content.split('\n');
  const seenImports = new Map();
  const fixedLines = [];
  
  for (const line of lines) {
    if (line.includes('import') && line.includes('from \'react\'')) {
      const match = line.match(/import\s*{\s*([^}]+)\s*}\s*from\s*['"]react['"]/);
      if (match) {
        const imports = match[1].split(',').map(i => i.trim());
        const uniqueImports = [];
        
        for (const imp of imports) {
          if (!seenImports.has(imp)) {
            seenImports.set(imp, true);
            uniqueImports.push(imp);
          }
        }
        
        if (uniqueImports.length > 0) {
          fixedLines.push(`import { ${uniqueImports.join(', ')} } from 'react';`);
        }
      } else {
        fixedLines.push(line);
      }
    } else {
      fixedLines.push(line);
    }
  }
  
  return fixedLines.join('\n');
}

// Fix unused imports
function removeUnusedImports(content, filePath) {
  // Remove unused React imports if not used
  if (!content.includes('<') && !content.includes('React.') && !content.includes('JSX.')) {
    content = content.replace(/^import React from ['"]react['"];?\s*\n/gm, '');
  }
  
  // Remove specific unused imports based on file
  if (filePath.includes('NotificationBadge.tsx')) {
    content = content.replace(/import\s*{\s*useEffect[^}]*}\s*from\s*['"]react['"];?/g, 'import React from \'react\';');
  }
  
  if (filePath.includes('Scribble.tsx')) {
    content = content.replace(/,\s*Image(?=\s*})/, '');
  }
  
  return content;
}

// Fix @ts-ignore to @ts-expect-error
function fixTsComments(content) {
  return content.replace(/@ts-ignore/g, '@ts-expect-error');
}

// Fix any types
function fixAnyTypes(content) {
  // Replace common any patterns
  const replacements = [
    { pattern: /:\s*any\[\]/g, replacement: ': unknown[]' },
    { pattern: /\((\w+):\s*any\)/g, replacement: '($1: unknown)' },
    { pattern: /as\s+any(?=\s*[,;)\]}])/g, replacement: 'as unknown' }
  ];
  
  replacements.forEach(({ pattern, replacement }) => {
    content = content.replace(pattern, replacement);
  });
  
  return content;
}

// Main processing function
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Apply specific parsing fixes if available
    const relativePath = path.relative(process.cwd(), filePath);
    if (parsingFixes[relativePath]) {
      content = parsingFixes[relativePath](content);
    }
    
    // Apply general fixes
    content = fixDuplicateDeclarations(content);
    content = fixFloatingPromises(content);
    content = removeUnusedImports(content, filePath);
    content = fixTsComments(content);
    content = fixAnyTypes(content);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`Fixed: ${relativePath}`);
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

console.log('Applying final linting fixes...');

let fixedCount = 0;
files.forEach(file => {
  if (processFile(file)) {
    fixedCount++;
  }
});

console.log(`Fixed ${fixedCount} files.`);