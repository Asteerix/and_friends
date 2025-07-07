#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const fixes = {
  // Fix activities.tsx
  'src/app/screens/activities.tsx': (content) => {
    // Remove duplicate imports and fix the malformed import
    const lines = content.split('\n');
    const fixedLines = [];
    let insideImport = false;
    let importBuffer = [];
    
    for (const line of lines) {
      if (line.includes('import {') && !line.includes('}')) {
        insideImport = true;
        importBuffer = [line];
      } else if (insideImport && line.includes('}')) {
        importBuffer.push(line);
        insideImport = false;
        // Check if this is the react-native import
        if (importBuffer.some(l => l.includes('react-native'))) {
          fixedLines.push('import {');
          fixedLines.push('  View,');
          fixedLines.push('  Text,');
          fixedLines.push('  ScrollView,');
          fixedLines.push('  TouchableOpacity,');
          fixedLines.push('  Image,');
          fixedLines.push('  ActivityIndicator,');
          fixedLines.push('  RefreshControl,');
          fixedLines.push('} from \'react-native\';');
        }
        importBuffer = [];
      } else if (insideImport) {
        importBuffer.push(line);
      } else {
        // Skip duplicate imports
        if (!line.includes('import') || !fixedLines.some(l => l.includes(line))) {
          fixedLines.push(line);
        }
      }
    }
    
    // Fix the content
    return fixedLines.join('\n')
      .replace(/await void refetch/g, 'await refetch')
      .replace(/void void router/g, 'void router');
  },

  // Fix CodeVerificationScreen.tsx
  'src/features/auth/screens/CodeVerificationScreen.tsx': (content) => {
    // Remove duplicate imports
    const lines = content.split('\n');
    const imports = new Map();
    const nonImportLines = [];
    let startOfNonImports = false;
    
    for (const line of lines) {
      if (!startOfNonImports && !line.trim().startsWith('import') && line.trim()) {
        startOfNonImports = true;
      }
      
      if (!startOfNonImports && line.includes('import')) {
        const match = line.match(/from\s+['"]([^'"]+)['"]/);
        if (match) {
          const source = match[1];
          if (!imports.has(source) || line.includes('{')) {
            imports.set(source, line);
          }
        }
      } else if (startOfNonImports || !line.includes('import')) {
        nonImportLines.push(line);
      }
    }
    
    // Reconstruct with proper imports
    const orderedImports = [
      imports.get('react'),
      imports.get('react-native'),
      '',
      imports.get('expo-router'),
      '',
      imports.get('libphonenumber-js'),
      '',
      ...Array.from(imports.entries())
        .filter(([key]) => key.startsWith('@/'))
        .map(([, value]) => value)
    ].filter(Boolean);
    
    return [...orderedImports, '', ...nonImportLines].join('\n')
      .replace(/void void router/g, 'void router');
  },

  // Fix AnimatedBackground.tsx
  'src/shared/ui/AnimatedBackground.tsx': (content) => {
    return content
      .replace(/interface AnimatedBackgroundProps \{[\s\S]*?\};/g, 
        'interface AnimatedBackgroundProps {\n  colors?: string[];\n  children: React.ReactNode;\n}')
      .replace(/React\.useEffect/g, 'useEffect')
      .replace(/React\.useRef/g, 'useRef');
  },

  // Fix other UI components with parsing errors
  'src/shared/ui/HelloWave.tsx': (content) => {
    return content.replace(/export default \(\s*\{[^}]+\}\s*:\s*\{[^}]+\}\s*\)\s*=>/g, 
      (match) => {
        return 'export default function HelloWave() {';
      });
  },

  'src/shared/ui/ParallaxScrollView.tsx': (content) => {
    return content.replace(/export default \(\s*\{[^}]+\}\s*:\s*\{[^}]+\}\s*\)\s*=>/g, 
      (match) => {
        return 'export default function ParallaxScrollView(props: ParallaxScrollViewProps) {';
      });
  },

  'src/shared/ui/ScreenLayout.tsx': (content) => {
    return content.replace(/export default \(\s*\{[^}]+\}\s*:\s*\{[^}]+\}\s*\)\s*=>/g, 
      (match) => {
        return 'export default function ScreenLayout(props: ScreenLayoutProps) {';
      });
  }
};

// Fix hooks with expression expected errors
const hookFiles = [
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

hookFiles.forEach(file => {
  fixes[file] = (content) => {
    // Fix common expression errors in hooks
    return content
      .replace(/\}\s*catch\s*\(\s*error\s*\)\s*\{/g, '} catch (error) {')
      .replace(/throw error\s*}/g, 'throw error;\n  }')
      .replace(/return\s*{\s*([^}]+)\s*}\s*}/g, 'return {\n    $1\n  };\n}')
      .replace(/\s*}\s*finally\s*{/g, '\n  } finally {');
  };
});

// Process files
console.log('Fixing specific parsing errors...');

Object.entries(fixes).forEach(([file, fix]) => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const fixed = fix(content);
      if (fixed !== content) {
        fs.writeFileSync(fullPath, fixed);
        console.log(`Fixed: ${file}`);
      }
    } catch (error) {
      console.error(`Error fixing ${file}:`, error.message);
    }
  }
});

console.log('Specific parsing error fixes complete.');