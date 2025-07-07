#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const fixes = [
  {
    // Fix type annotations in arrow functions
    pattern: /export default \(\s*\{[^}]+\}\s*:\s*\{[^}]+\}\s*\)\s*=>/g,
    replacement: (match) => {
      // Extract parameters and type
      const paramsMatch = match.match(/\(\s*(\{[^}]+\})\s*:\s*(\{[^}]+\})\s*\)/);
      if (paramsMatch) {
        const [, params, type] = paramsMatch;
        return `export default (${params}: ${type}) =>`;
      }
      return match;
    }
  },
  {
    // Fix missing semicolons before export statements
    pattern: /\}\s*\nexport/g,
    replacement: '};\nexport'
  },
  {
    // Fix missing commas in object literals
    pattern: /([,\s])(\w+):\s*([^,\n}]+)\n\s*(\w+):/g,
    replacement: '$1$2: $3,\n  $4:'
  },
  {
    // Fix parsing errors with type assertions
    pattern: /as\s+ReactElement<any>;/g,
    replacement: 'as ReactElement<any>'
  },
  {
    // Fix arrow function type annotations
    pattern: /:\s*\(\s*\)\s*=>\s*ReactElement/g,
    replacement: ': () => ReactElement'
  }
];

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    fixes.forEach(fix => {
      const newContent = content.replace(fix.pattern, fix.replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`Fixed parsing errors in: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

// Files with known parsing errors
const filesWithParsingErrors = [
  'src/app/screens/activities.tsx',
  'src/features/auth/screens/CodeVerificationScreen.tsx',
  'src/shared/ui/AnimatedBackground.tsx',
  'src/shared/ui/HelloWave.tsx',
  'src/shared/ui/ParallaxScrollView.tsx',
  'src/shared/ui/ScreenLayout.tsx',
  'src/hooks/useActivities.ts',
  'src/hooks/useChats.ts',
  'src/hooks/useEventInteractions.ts',
  'src/hooks/useEventMemories.ts',
  'src/hooks/useEventTemplates.ts',
  'src/hooks/useEventsAdvanced.ts',
  'src/hooks/useFriends.ts',
  'src/hooks/usePollsSupabase.ts',
  'src/hooks/useReports.ts',
  'src/hooks/useSearchHistory.ts',
  'src/hooks/useStories.ts',
  'src/hooks/useStoryHighlights.ts',
  'src/hooks/useUserBlocks.ts',
  'src/shared/hooks/useRealtimeSubscription.ts'
];

console.log('Fixing parsing errors...');

filesWithParsingErrors.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    fixFile(fullPath);
  }
});

console.log('Parsing error fixes complete.');