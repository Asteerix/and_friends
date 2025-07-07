#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// These are React Native components that should be imported from 'react-native'
const reactNativeComponents = new Set([
  'ActivityIndicator', 'Alert', 'Animated', 'Button', 'Dimensions',
  'Easing', 'FlatList', 'Image', 'Keyboard', 'KeyboardAvoidingView',
  'Linking', 'Modal', 'Platform', 'Pressable', 'RefreshControl',
  'SafeAreaView', 'ScrollView', 'SectionList', 'StatusBar', 'StyleSheet', 
  'Switch', 'Text', 'TextInput', 'TouchableOpacity', 'TouchableWithoutFeedback',
  'View', 'VirtualizedList', 'Share', 'AccessibilityInfo', 'PanResponder'
]);

// Keywords that indicate code, not imports
const codeKeywords = new Set([
  'const', 'let', 'var', 'function', 'class', 'interface', 'type', 'enum',
  'export const', 'export let', 'export function', 'export class', 'export interface',
  'export type', 'export enum', 'export default'
]);

async function fixImportsInFile(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    let modified = false;

    // Split into lines for processing
    const lines = content.split('\n');
    const fixedLines = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Handle broken import patterns
      if (trimmedLine === 'import {' && i + 1 < lines.length) {
        // Look ahead to see if next line is another import
        const nextLine = lines[i + 1].trim();
        if (nextLine.startsWith('import {')) {
          // Skip this line - it's a broken import
          modified = true;
          i++;
          continue;
        }
      }

      // Fix duplicate imports
      if (trimmedLine.startsWith('} from ') && trimmedLine.endsWith(';')) {
        // Check if this is an orphaned closing import
        let hasMatchingOpen = false;
        for (let j = Math.max(0, i - 20); j < i; j++) {
          if (lines[j].includes('import {') && !lines[j].includes('} from')) {
            hasMatchingOpen = true;
            break;
          }
        }
        if (!hasMatchingOpen) {
          modified = true;
          i++;
          continue; // Skip orphaned closing
        }
      }

      // Fix lines that are just React Native components outside imports
      if (trimmedLine && reactNativeComponents.has(trimmedLine.replace(',', '').trim())) {
        // Check if we're not in an import block
        let inImport = false;
        for (let j = Math.max(0, i - 10); j <= i; j++) {
          if (lines[j].includes('import {') && !lines[j].includes('} from')) {
            inImport = true;
            break;
          }
        }
        if (!inImport) {
          modified = true;
          i++;
          continue; // Skip orphaned component
        }
      }

      fixedLines.push(line);
      i++;
    }

    if (modified) {
      content = fixedLines.join('\n');
    }

    // Fix specific patterns with regex
    const patterns = [
      // Fix double import statements
      {
        pattern: /import\s*{\s*\nimport\s*{/g,
        replacement: 'import {'
      },
      // Fix orphaned imports
      {
        pattern: /import\s*{\s*\nimport\s*{\s*supabase\s*}\s*from/g,
        replacement: 'import { supabase } from'
      },
      // Fix components after imports
      {
        pattern: /from\s*['"]react-native['"];\s*\n\s*(ActivityIndicator|Alert|Animated|Dimensions|View|Text|StyleSheet|Platform|TouchableOpacity|ScrollView|FlatList|Modal|Pressable|KeyboardAvoidingView|Image|TextInput|Switch|RefreshControl|SafeAreaView|StatusBar|Easing|Keyboard|Share|SectionList|AccessibilityInfo|PanResponder),?\s*\n/g,
        replacement: 'from \'react-native\';\n'
      },
      // Fix code in imports
      {
        pattern: /import\s*{\s*\n\s*(const|let|var|function|class|interface|type|enum|export)\s+/g,
        replacement: '$1 '
      },
      // Fix duplicate React imports
      {
        pattern: /import\s+React[^;]+;\s*\nimport\s+React[^;]+;/g,
        replacement: 'import React, { useState, useEffect, useRef, useCallback } from \'react\';'
      },
      // Fix duplicate icon imports
      {
        pattern: /import\s+Ionicons[^;]+;\s*\nimport\s+Ionicons[^;]+;/g,
        replacement: 'import Ionicons from \'react-native-vector-icons/Ionicons\';'
      },
      // Fix void void pattern
      {
        pattern: /void\s+void\s+/g,
        replacement: 'void '
      }
    ];

    for (const { pattern, replacement } of patterns) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    }

    // Clean up duplicate blank lines
    content = content.replace(/\n\n\n+/g, '\n\n');

    if (modified) {
      await fs.writeFile(filePath, content, 'utf8');
      console.log(`✓ Fixed ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

async function processDirectory(dir) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  let fixedCount = 0;

  for (const file of files) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
      fixedCount += await processDirectory(fullPath);
    } else if (file.isFile() && (file.name.endsWith('.tsx') || file.name.endsWith('.ts'))) {
      if (await fixImportsInFile(fullPath)) {
        fixedCount++;
      }
    }
  }

  return fixedCount;
}

async function main() {
  console.log('Running final import cleanup...\n');

  const srcPath = path.join(process.cwd(), 'src');
  const appPath = path.join(process.cwd(), 'app');
  
  let totalFixed = 0;
  
  if (await fs.access(srcPath).then(() => true).catch(() => false)) {
    totalFixed += await processDirectory(srcPath);
  }
  
  if (await fs.access(appPath).then(() => true).catch(() => false)) {
    totalFixed += await processDirectory(appPath);
  }

  console.log(`\n✨ Fixed ${totalFixed} files`);
}

main().catch(console.error);