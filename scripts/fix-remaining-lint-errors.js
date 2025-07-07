#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const fixes = [
  // Fix redeclared imports
  {
    files: [
      'src/features/auth/screens/AgeInputScreen.tsx',
      'src/features/auth/screens/AvatarPickScreen.tsx',
      'src/features/chat/screens/ConversationsListScreen.tsx',
      'src/shared/ui/GradientBackground.tsx',
      'src/shared/ui/SuccessTransition.tsx'
    ],
    fix: (content) => {
      // Remove duplicate React hook imports
      return content.replace(/import\s*{\s*useState\s*,\s*useEffect\s*,\s*useCallback\s*}\s*from\s*['"]react['"];\s*import\s*React\s*,\s*{\s*useState\s*,\s*useEffect\s*,\s*useCallback\s*}\s*from\s*['"]react['"];/g, 
        "import React, { useState, useEffect, useCallback } from 'react';");
    }
  },
  
  // Fix undefined TouchableWithoutFeedback
  {
    files: ['src/features/auth/screens/PhoneVerificationScreen.tsx'],
    fix: (content) => {
      // Add TouchableWithoutFeedback to imports
      return content.replace(
        /import\s*{\s*([^}]+)\s*}\s*from\s*['"]react-native['"];/,
        (match, imports) => {
          if (!imports.includes('TouchableWithoutFeedback')) {
            return match.replace(imports, `${imports}, TouchableWithoutFeedback`);
          }
          return match;
        }
      );
    }
  },
  
  // Fix undefined SafeAreaView
  {
    files: ['src/features/chat/screens/ConversationScreen.tsx'],
    fix: (content) => {
      // Add SafeAreaView import
      if (!content.includes("from 'react-native-safe-area-context'")) {
        return content.replace(
          /import\s*{\s*router\s*}\s*from\s*['"]expo-router['"];/,
          "import { router } from 'expo-router';\nimport { SafeAreaView } from 'react-native-safe-area-context';"
        );
      }
      return content;
    }
  },
  
  // Fix undefined ChatCard
  {
    files: ['src/features/chat/screens/ChatScreen.tsx'],
    fix: (content) => {
      // Add ChatCard import
      if (!content.includes("import ChatCard")) {
        return content.replace(
          /import\s*{\s*useChats\s*}\s*from\s*['"]@\/hooks\/useChats['"];/,
          "import { useChats } from '@/hooks/useChats';\nimport { ChatCard } from '../components/ChatCard';"
        );
      }
      return content;
    }
  },
  
  // Fix @ts-ignore to @ts-expect-error
  {
    files: ['src/shared/ui/SimulatorWarning.tsx'],
    fix: (content) => {
      return content.replace(/@ts-ignore/g, '@ts-expect-error');
    }
  },
  
  // Fix floating promises
  {
    files: [
      'src/features/auth/screens/JamPickerScreen.tsx',
      'src/features/auth/screens/LoadingScreen.tsx',
      'src/features/auth/screens/LocationPermissionScreen.tsx',
      'src/features/auth/screens/NameInputScreen.tsx',
      'src/features/auth/screens/PathInputScreen.tsx',
      'src/features/chat/components/VoiceMessage.tsx',
      'src/features/chat/components/VoiceRecorder.tsx',
      'src/features/chat/screens/ConversationScreen.tsx',
      'src/hooks/usePushNotifications.ts',
      'src/shared/providers/SessionContext.tsx'
    ],
    fix: (content) => {
      // Add void to floating promises
      return content
        .replace(/(\s+)(router\.(push|replace|back)\()/g, '$1void $2')
        .replace(/(\s+)(sound\.(playAsync|pauseAsync|unloadAsync)\()/g, '$1void $2')
        .replace(/(\s+)(Audio\.(setAudioModeAsync)\()/g, '$1void $2')
        .replace(/(\s+)(updateUserProfileWithPermission\()/g, '$1void $2')
        .replace(/(\s+)(checkSession\(\))/g, '$1void checkSession()')
        .replace(/(\s+)(fetchProfile\(\))/g, '$1void fetchProfile()')
        .replace(/(\s+)(fetchChatInfo\(\))/g, '$1void fetchChatInfo()')
        .replace(/(\s+)(registerForPushNotificationsAsync\(\))/g, '$1void registerForPushNotificationsAsync()')
        .replace(/(\s+)(savePushToken\(\))/g, '$1void savePushToken()');
    }
  },
  
  // Fix NodeJS undefined
  {
    files: [
      'src/features/auth/screens/RestaurantPickerScreen.tsx',
      'src/features/chat/components/VoiceRecorder.tsx'
    ],
    fix: (content) => {
      return content.replace(/NodeJS\./g, '');
    }
  },
  
  // Fix err is not defined
  {
    files: ['src/hooks/useProfile.ts'],
    fix: (content) => {
      return content.replace(/console\.error\('Error:', err\)/g, "console.error('Error:', error)");
    }
  }
];

console.log('Fixing remaining lint errors...\n');

fixes.forEach(({ files, fix }) => {
  files.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    
    if (fs.existsSync(filePath)) {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        content = fix(content);
        fs.writeFileSync(filePath, content);
        console.log(`Fixed: ${file}`);
      } catch (error) {
        console.error(`Error fixing ${file}:`, error.message);
      }
    } else {
      console.log(`File not found: ${file}`);
    }
  });
});

console.log('\nRunning ESLint auto-fix again...');
try {
  execSync('npx eslint src --ext .ts,.tsx --fix', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
} catch (error) {
  // ESLint will exit with error if there are unfixable issues
}

console.log('\nDone!');