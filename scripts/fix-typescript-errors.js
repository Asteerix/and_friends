#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get TypeScript errors
function getTypeScriptErrors() {
  try {
    execSync('npm run check:types', { stdio: 'pipe' });
    return [];
  } catch (error) {
    return error.stdout.toString();
  }
}

// Function to fix unused imports
function fixUnusedImports(filePath, content) {
  console.log(`🔧 Fixing unused imports in: ${filePath}`);
  
  const lines = content.split('\n');
  const fixedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip lines with unused variable declarations
    if (line.includes('is declared but its value is never read') || 
        line.includes('TS6133')) {
      continue;
    }
    
    fixedLines.push(line);
  }
  
  return fixedLines.join('\n');
}

// Function to add missing types
function addMissingTypes(filePath, content) {
  console.log(`🔧 Adding missing types in: ${filePath}`);
  
  let fixedContent = content;
  
  // Fix common TypeScript issues
  
  // Add return type annotations for functions that don't return a value
  fixedContent = fixedContent.replace(
    /(\w+)\s*\([^)]*\)\s*\{[^}]*\}/g,
    (match, functionName) => {
      if (!match.includes('return') && !match.includes(':')) {
        return match.replace(/\)\s*\{/, '): void {');
      }
      return match;
    }
  );
  
  // Fix undefined parameter types
  fixedContent = fixedContent.replace(
    /\(([^:)]+)\s*\)/g,
    '($1: any)'
  );
  
  return fixedContent;
}

// Function to fix specific file issues based on error messages
function fixSpecificIssues(filePath, content, errors) {
  let fixedContent = content;
  
  if (filePath.includes('VoiceRecorder.tsx')) {
    // Fix RecordingOptions type issue
    fixedContent = fixedContent.replace(
      'Audio.Recording.prepareToRecordAsync(recordingOptions)',
      'Audio.Recording.prepareToRecordAsync(recordingOptions || {})'
    );
    
    // Add return statement for function that doesn't return in all paths
    fixedContent = fixedContent.replace(
      'const formatDuration = (milliseconds: number) => {',
      'const formatDuration = (milliseconds: number): string => {'
    );
  }
  
  if (filePath.includes('VoiceRecorderModal.tsx')) {
    // Fix useSharedValue call without argument
    fixedContent = fixedContent.replace(
      'useSharedValue()',
      'useSharedValue(0)'
    );
  }
  
  if (filePath.includes('assetValidator.ts') || filePath.includes('testflightLogger.ts')) {
    // Fix FileSystem property access
    fixedContent = fixedContent.replace(
      /FileSystem\.FileSystem/g,
      'FileSystem'
    );
  }
  
  return fixedContent;
}

// Function to remove unused imports
function removeUnusedImports(content, unusedImports = []) {
  const lines = content.split('\n');
  const filteredLines = lines.filter(line => {
    const isImportLine = line.trim().startsWith('import');
    if (!isImportLine) return true;
    
    return !unusedImports.some(unused => line.includes(unused));
  });
  
  return filteredLines.join('\n');
}

// Process files with errors
async function processFiles() {
  console.log('🚀 Starting TypeScript error fixes...\n');
  
  const srcDir = path.join(process.cwd(), 'src');
  
  // List of common unused imports to remove
  const commonUnusedImports = [
    'isOffline',
    'adaptiveTimeout', 
    'insets',
    'calendarEvents',
    'messageContent',
    'senderId',
    'session',
    'setIsLoading',
    'SCREEN_WIDTH',
    'chatId',
    'userId',
    'amplitude',
    'setAmplitude',
    'animatedAmplitude',
    'data',
    'phoneNumbersList',
    't'
  ];
  
  // Files with specific errors
  const filesToFix = [
    'src/features/auth/screens/CodeVerificationScreen.tsx',
    'src/features/auth/screens/ContactsFriendsScreen.tsx', 
    'src/features/auth/screens/NameInputScreen.tsx',
    'src/features/calendar/screens/CalendarPerfect.tsx',
    'src/features/chat/components/MessageOptionsButton.tsx',
    'src/features/chat/components/VoiceMessage.tsx',
    'src/features/chat/components/VoiceRecorder.tsx',
    'src/features/chat/components/VoiceRecorderModal.tsx',
    'src/features/chat/screens/ChatListScreen.tsx',
    'src/shared/utils/assetValidator.ts',
    'src/shared/utils/testflightLogger.ts'
  ];
  
  for (const relativeFilePath of filesToFix) {
    const filePath = path.join(process.cwd(), relativeFilePath);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      continue;
    }
    
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      
      // Remove unused imports
      content = removeUnusedImports(content, commonUnusedImports);
      
      // Fix specific issues
      content = fixSpecificIssues(filePath, content, []);
      
      // Add missing types
      content = addMissingTypes(filePath, content);
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Fixed: ${relativeFilePath}`);
      } else {
        console.log(`👍 No changes needed: ${relativeFilePath}`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }
  
  console.log('\n🎉 TypeScript error fixing completed!');
  console.log('\n🔍 Running type check to verify fixes...');
  
  try {
    execSync('npm run check:types', { stdio: 'inherit' });
    console.log('✅ All TypeScript errors fixed!');
  } catch (error) {
    console.log('⚠️  Some TypeScript errors remain. Manual review needed.');
  }
}

if (require.main === module) {
  processFiles().catch(console.error);
}

module.exports = { processFiles };