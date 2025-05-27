#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

async function createDirectoryIfNotExists(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    console.error(`Error creating directory ${dir}:`, error);
  }
}

async function moveFile(src, dest) {
  try {
    // Create destination directory if it doesn't exist
    await createDirectoryIfNotExists(path.dirname(dest));
    
    // Check if source exists
    await fs.access(src);
    
    // Move the file
    await fs.rename(src, dest);
    console.log(`✓ Moved ${src} → ${dest}`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`⚠️  Source not found: ${src}`);
    } else {
      console.error(`✗ Error moving ${src} to ${dest}:`, error.message);
    }
  }
}

async function copyFile(src, dest) {
  try {
    await createDirectoryIfNotExists(path.dirname(dest));
    await fs.copyFile(src, dest);
    console.log(`✓ Copied ${src} → ${dest}`);
  } catch (error) {
    console.error(`✗ Error copying ${src} to ${dest}:`, error.message);
  }
}

async function reorganizeProject() {
  console.log('🚀 Starting project reorganization...\n');

  // Create new directory structure
  console.log('📁 Creating new directory structure...');
  const newDirs = [
    'src/shared/ui',
    'src/shared/hooks',
    'src/shared/lib/supabase',
    'src/shared/config',
    'src/app/providers',
    'src/features/home/screens',
    'src/features/home/components',
    'src/features/events/components',
    'src/features/chat/components',
    'src/features/map/components',
    'src/features/profile/components',
    'src/features/notifications/components',
    'src/features/calendar/screens',
    'src/features/calendar/components',
    'src/features/stories/screens',
    'src/features/stories/components',
    'app/(auth)',
    'app/(tabs)'
  ];

  for (const dir of newDirs) {
    await createDirectoryIfNotExists(dir);
  }

  console.log('\n📦 Step 1: Merging assets...');
  // Move src/assets to assets (if exists)
  try {
    await fs.access('src/assets/images/scribble.png');
    await moveFile('src/assets/images/scribble.png', 'assets/images/scribble.png');
  } catch (e) {}

  console.log('\n🎨 Step 2: Moving components to shared/ui...');
  // Move components from root to shared/ui
  const componentsToMove = [
    ['components/BackgroundHalo.tsx', 'src/shared/ui/BackgroundHalo.tsx'],
    ['components/BottomTabs.tsx', 'src/shared/ui/BottomTabs.tsx'],
    ['components/Collapsible.tsx', 'src/shared/ui/Collapsible.tsx'],
    ['components/ExternalLink.tsx', 'src/shared/ui/ExternalLink.tsx'],
    ['components/HapticTab.tsx', 'src/shared/ui/HapticTab.tsx'],
    ['components/HelloWave.tsx', 'src/shared/ui/HelloWave.tsx'],
    ['components/ParallaxScrollView.tsx', 'src/shared/ui/ParallaxScrollView.tsx'],
    ['components/ScreenLayout.tsx', 'src/shared/ui/ScreenLayout.tsx'],
    ['components/SimulatorWarning.tsx', 'src/shared/ui/SimulatorWarning.tsx'],
    ['components/SuccessTransition.tsx', 'src/shared/ui/SuccessTransition.tsx'],
    ['components/ThemedText.tsx', 'src/shared/ui/ThemedText.tsx'],
    ['components/ThemedView.tsx', 'src/shared/ui/ThemedView.tsx'],
    ['components/ui/CustomTabBar.tsx', 'src/shared/ui/CustomTabBar.tsx'],
    ['components/ui/IconSymbol.tsx', 'src/shared/ui/IconSymbol.tsx'],
    ['components/ui/IconSymbol.ios.tsx', 'src/shared/ui/IconSymbol.ios.tsx'],
    ['components/ui/TabBarBackground.tsx', 'src/shared/ui/TabBarBackground.tsx'],
    ['components/ui/TabBarBackground.ios.tsx', 'src/shared/ui/TabBarBackground.ios.tsx'],
  ];

  // Move components from src/components
  const srcComponentsToMove = [
    ['src/components/Scribble.tsx', 'src/shared/ui/Scribble.tsx'],
    ['src/components/ScribbleDivider.tsx', 'src/shared/ui/ScribbleDivider.tsx'],
    ['src/components/common/CustomText.tsx', 'src/shared/ui/CustomText.tsx'],
    ['src/components/common/GradientBackground.tsx', 'src/shared/ui/GradientBackground.tsx'],
  ];

  for (const [src, dest] of [...componentsToMove, ...srcComponentsToMove]) {
    await moveFile(src, dest);
  }

  console.log('\n🔧 Step 3: Moving hooks to shared/hooks...');
  const hooksToMove = [
    ['hooks/useColorScheme.ts', 'src/shared/hooks/useColorScheme.ts'],
    ['hooks/useColorScheme.web.ts', 'src/shared/hooks/useColorScheme.web.ts'],
    ['hooks/useThemeColor.ts', 'src/shared/hooks/useThemeColor.ts'],
    ['src/hooks/useSupabaseStorage.ts', 'src/shared/hooks/useSupabaseStorage.ts'],
  ];

  for (const [src, dest] of hooksToMove) {
    await moveFile(src, dest);
  }

  console.log('\n🗄️ Step 4: Moving Supabase to shared/lib...');
  await moveFile('src/lib/supabase.ts', 'src/shared/lib/supabase/client.ts');
  await moveFile('src/lib/SessionContext.tsx', 'src/app/providers/SessionContext.tsx');

  console.log('\n📱 Step 5: Moving screens to features...');
  // Move screens to their respective features
  const screenMoves = [
    // Home
    ['src/screens/HomeScreen.tsx', 'src/features/home/screens/HomeScreen.tsx'],
    ['src/screens/home/SearchScreen.tsx', 'src/features/home/screens/SearchScreen.tsx'],
    
    // Map
    ['src/screens/MapScreen.tsx', 'src/features/map/screens/MapScreen.tsx'],
    
    // Profile
    ['src/screens/ProfileScreen.tsx', 'src/features/profile/screens/ProfileScreen.tsx'],
    ['src/screens/profile/EditProfileScreen.tsx', 'src/features/profile/screens/EditProfileScreen.tsx'],
    ['src/screens/profile/PersonCardScreen.tsx', 'src/features/profile/screens/PersonCardScreen.tsx'],
    
    // Notifications
    ['src/screens/NotificationsScreen.tsx', 'src/features/notifications/screens/NotificationsScreen.tsx'],
    ['src/screens/NotificationsFullScreen.tsx', 'src/features/notifications/screens/NotificationsFullScreen.tsx'],
    
    // Calendar
    ['src/screens/CalendarScreen.tsx', 'src/features/calendar/screens/CalendarScreen.tsx'],
    ['src/screens/calendar/CalendarMonthScreen.tsx', 'src/features/calendar/screens/CalendarMonthScreen.tsx'],
    
    // Stories/Memories
    ['src/screens/MemoriesScreen.tsx', 'src/features/stories/screens/MemoriesScreen.tsx'],
    ['src/screens/memories/CreateStoryScreen.tsx', 'src/features/stories/screens/CreateStoryScreen.tsx'],
    
    // Settings
    ['src/screens/settings/SettingsScreen.tsx', 'src/features/settings/screens/SettingsScreen.tsx'],
    ['src/screens/settings/PreferencesScreen.tsx', 'src/features/settings/screens/PreferencesScreen.tsx'],
  ];

  for (const [src, dest] of screenMoves) {
    await moveFile(src, dest);
  }

  console.log('\n🧩 Step 6: Moving feature components...');
  // Move components to their features
  const componentMoves = [
    // Home components
    ['src/components/HeaderGreeting.tsx', 'src/features/home/components/HeaderGreeting.tsx'],
    ['src/components/EventCard.tsx', 'src/features/home/components/EventCard.tsx'],
    ['src/components/EventCardNew.tsx', 'src/features/home/components/EventCardNew.tsx'],
    ['src/components/CategoryTabs.tsx', 'src/features/home/components/CategoryTabs.tsx'],
    ['src/components/SearchBar.tsx', 'src/features/home/components/SearchBar.tsx'],
    ['src/components/SectionHeader.tsx', 'src/features/home/components/SectionHeader.tsx'],
    ['src/components/LinkCard.tsx', 'src/features/home/components/LinkCard.tsx'],
    
    // Chat components
    ['src/components/ChatCard.tsx', 'src/features/chat/components/ChatCard.tsx'],
    ['src/components/HeaderChat.tsx', 'src/features/chat/components/HeaderChat.tsx'],
    ['src/components/InputBar.tsx', 'src/features/chat/components/InputBar.tsx'],
    ['src/components/BubbleLeft.tsx', 'src/features/chat/components/BubbleLeft.tsx'],
    ['src/components/BubbleRight.tsx', 'src/features/chat/components/BubbleRight.tsx'],
    ['src/components/PollBlockCompact.tsx', 'src/features/chat/components/PollBlockCompact.tsx'],
    ['src/components/PollBlockLarge.tsx', 'src/features/chat/components/PollBlockLarge.tsx'],
    
    // Map components
    ['src/components/MiniMap.tsx', 'src/features/map/components/MiniMap.tsx'],
    
    // Stories components
    ['src/components/MemoriesStrip.tsx', 'src/features/stories/components/MemoriesStrip.tsx'],
    ['src/components/MemoryItem.tsx', 'src/features/stories/components/MemoryItem.tsx'],
  ];

  for (const [src, dest] of componentMoves) {
    await moveFile(src, dest);
  }

  console.log('\n🗂️ Step 7: Moving config and constants...');
  await moveFile('src/config/constants.ts', 'src/shared/config/constants.ts');
  await moveFile('constants/Colors.ts', 'src/shared/config/Colors.ts');

  console.log('\n🚀 Step 8: Creating app export files...');
  // Create export files for app directory
  const appExports = [
    {
      path: 'app/(tabs)/home.tsx',
      content: `export { default } from '@/features/home/screens/HomeScreen';`
    },
    {
      path: 'app/(tabs)/map.tsx',
      content: `export { default } from '@/features/map/screens/MapScreen';`
    },
    {
      path: 'app/(tabs)/chat.tsx',
      content: `export { default } from '@/features/chat/screens/ChatScreen';`
    },
    {
      path: 'app/(tabs)/create.tsx',
      content: `export { default } from '@/features/events/screens/CreateEventScreen';`
    },
    {
      path: 'app/(tabs)/profile.tsx',
      content: `export { default } from '@/features/profile/screens/ProfileScreen';`
    },
    {
      path: 'app/(auth)/phone-verification.tsx',
      content: `export { default } from '@/features/auth/screens/PhoneVerificationScreen';`
    },
    {
      path: 'app/(auth)/code-verification.tsx',
      content: `export { default } from '@/features/auth/screens/CodeVerificationScreen';`
    }
  ];

  for (const { path: filePath, content } of appExports) {
    await fs.writeFile(filePath, content);
    console.log(`✓ Created export: ${filePath}`);
  }

  console.log('\n🧹 Step 9: Cleaning up empty directories...');
  // List of directories to remove if empty
  const dirsToClean = [
    'components/ui',
    'components',
    'hooks',
    'src/components/common',
    'src/components',
    'src/screens/home',
    'src/screens/profile',
    'src/screens/calendar',
    'src/screens/memories',
    'src/screens/settings',
    'src/screens',
    'src/config',
    'src/lib',
    'constants'
  ];

  for (const dir of dirsToClean) {
    try {
      const files = await fs.readdir(dir);
      if (files.length === 0) {
        await fs.rmdir(dir);
        console.log(`✓ Removed empty directory: ${dir}`);
      }
    } catch (e) {
      // Directory doesn't exist or not empty
    }
  }

  console.log('\n✅ Reorganization complete!');
  console.log('\n⚠️  Next steps:');
  console.log('1. Update all imports in the project');
  console.log('2. Update tsconfig.json paths if needed');
  console.log('3. Test the application thoroughly');
}

// Run the reorganization
reorganizeProject().catch(console.error);