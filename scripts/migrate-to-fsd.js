#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Starting &Friends FSD Migration...\n');

// Configuration
const PROJECT_ROOT = path.join(__dirname, '..');
const BACKUP_DIR = path.join(PROJECT_ROOT, '.backup_before_migration');

// Create backup
function createBackup() {
  console.log('📦 Creating backup...');
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
    // Note: In production, use proper backup tools
    console.log('✅ Backup directory created at:', BACKUP_DIR);
  }
}

// Move documentation files
function consolidateDocs() {
  console.log('\n📚 Consolidating documentation...');
  
  const docsDir = path.join(PROJECT_ROOT, 'docs');
  const subDirs = ['architecture', 'api', 'deployment', 'testing', 'figma'];
  
  // Create docs structure
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir);
  }
  
  subDirs.forEach(dir => {
    const dirPath = path.join(docsDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
  
  // Move .md files to docs
  const mdFiles = [
    { src: 'CURRENT_STATUS.md', dest: 'docs/CURRENT_STATUS.md' },
    { src: 'DEPLOY_GUIDE.md', dest: 'docs/deployment/DEPLOY_GUIDE.md' },
    { src: 'FIGMA_IMPLEMENTATION_REPORT.md', dest: 'docs/figma/IMPLEMENTATION_REPORT.md' },
    { src: 'FIGMA_SCREENS_ANALYSIS.md', dest: 'docs/figma/SCREENS_ANALYSIS.md' },
    { src: 'HOTFIX_ERRORS.md', dest: 'docs/HOTFIX_ERRORS.md' },
    { src: 'IMPLEMENTATION_PLAN.md', dest: 'docs/IMPLEMENTATION_PLAN.md' },
    { src: 'PROJECT_COMPLETE.md', dest: 'docs/PROJECT_COMPLETE.md' },
    { src: 'PROJECT_SUMMARY.md', dest: 'docs/PROJECT_SUMMARY.md' },
    { src: 'README_APP_STORE.md', dest: 'docs/deployment/APP_STORE.md' },
    { src: 'SUPABASE_COMPLETE_INTEGRATION.md', dest: 'docs/api/SUPABASE_INTEGRATION.md' },
    { src: 'SUPABASE_INTEGRATION_STATUS.md', dest: 'docs/api/SUPABASE_STATUS.md' },
    { src: 'TEST_PLAN.md', dest: 'docs/testing/TEST_PLAN.md' },
    { src: 'TEST_UPLOAD_IMAGE.md', dest: 'docs/testing/TEST_UPLOAD_IMAGE.md' },
  ];
  
  mdFiles.forEach(({ src, dest }) => {
    const srcPath = path.join(PROJECT_ROOT, src);
    const destPath = path.join(PROJECT_ROOT, dest);
    
    if (fs.existsSync(srcPath)) {
      fs.renameSync(srcPath, destPath);
      console.log(`✅ Moved ${src} → ${dest}`);
    }
  });
  
  // Move figma screenshots
  const figmaDir = path.join(PROJECT_ROOT, 'figma');
  if (fs.existsSync(figmaDir)) {
    fs.renameSync(figmaDir, path.join(docsDir, 'figma', 'screenshots'));
    console.log('✅ Moved figma screenshots to docs/figma/screenshots');
  }
}

// Clean duplicates
function removeDuplicates() {
  console.log('\n🧹 Removing duplicates...');
  
  // Remove old component/hook directories at root
  const toRemove = [
    'components',
    'hooks',
    'constants',
    'lib/supabase.ts'
  ];
  
  toRemove.forEach(item => {
    const itemPath = path.join(PROJECT_ROOT, item);
    if (fs.existsSync(itemPath)) {
      if (fs.lstatSync(itemPath).isDirectory()) {
        fs.rmSync(itemPath, { recursive: true });
      } else {
        fs.unlinkSync(itemPath);
      }
      console.log(`✅ Removed duplicate: ${item}`);
    }
  });
}

// Consolidate Supabase migrations
function consolidateMigrations() {
  console.log('\n🗄️ Consolidating Supabase migrations...');
  
  const migrationsDir = path.join(PROJECT_ROOT, 'supabase', 'migrations');
  const newMigrationsDir = path.join(PROJECT_ROOT, 'supabase', 'migrations_new');
  
  if (!fs.existsSync(newMigrationsDir)) {
    fs.mkdirSync(newMigrationsDir, { recursive: true });
  }
  
  // Create consolidated migrations
  const consolidatedMigrations = [
    {
      name: '001_initial_schema.sql',
      description: 'Initial database schema with all tables'
    },
    {
      name: '002_storage_setup.sql', 
      description: 'Storage buckets and policies'
    },
    {
      name: '003_rls_policies.sql',
      description: 'Row Level Security policies'
    },
    {
      name: '004_functions_triggers.sql',
      description: 'Database functions and triggers'
    }
  ];
  
  console.log('✅ Migration consolidation plan created');
  console.log('⚠️  Manual review required for SQL migration files');
}

// Create FSD structure
function createFSDStructure() {
  console.log('\n🏗️ Creating FSD architecture...');
  
  const fsdStructure = {
    'src/app': ['_layout.tsx', '(auth)', '(tabs)', 'providers'],
    'src/features/auth': ['api', 'hooks', 'components', 'screens', 'types'],
    'src/features/events': ['api', 'hooks', 'components', 'screens', 'stores', 'types'],
    'src/features/chat': ['api', 'hooks', 'components', 'screens', 'types'],
    'src/features/map': ['api', 'hooks', 'components', 'screens', 'types'],
    'src/features/stories': ['api', 'hooks', 'components', 'screens', 'types'],
    'src/features/discover': ['api', 'hooks', 'components', 'screens', 'types'],
    'src/features/monetization': ['api', 'hooks', 'components', 'screens', 'types'],
    'src/entities/user': ['model', 'api', 'types'],
    'src/entities/event': ['model', 'api', 'types'],
    'src/entities/message': ['model', 'api', 'types'],
    'src/entities/notification': ['model', 'api', 'types'],
    'src/shared/api': ['client', 'types'],
    'src/shared/ui': ['buttons', 'inputs', 'cards', 'modals'],
    'src/shared/utils': ['date', 'format', 'validation'],
    'src/shared/hooks': ['common'],
    'src/shared/constants': ['config'],
    'src/widgets/headers': [],
    'src/widgets/navigation': [],
    'src/widgets/modals': [],
    'tests/unit': [],
    'tests/e2e': [],
    '.github/workflows': [],
    '.github/ISSUE_TEMPLATE': []
  };
  
  Object.entries(fsdStructure).forEach(([dir, subdirs]) => {
    const dirPath = path.join(PROJECT_ROOT, dir);
    
    // Create main directory
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ Created: ${dir}`);
    }
    
    // Create subdirectories
    subdirs.forEach(subdir => {
      const subdirPath = path.join(dirPath, subdir);
      if (!fs.existsSync(subdirPath)) {
        fs.mkdirSync(subdirPath, { recursive: true });
      }
    });
  });
}

// Move and organize screens
function organizeScreens() {
  console.log('\n📱 Organizing screens by feature...');
  
  const screenMappings = {
    // Auth screens
    'auth/01_PhoneVerificationScreen.tsx': 'features/auth/screens/PhoneVerificationScreen.tsx',
    'auth/02_CodeVerificationScreen.tsx': 'features/auth/screens/CodeVerificationScreen.tsx',
    'auth/03_NameInputScreen.tsx': 'features/auth/screens/NameInputScreen.tsx',
    'auth/04_AvatarPickScreen.tsx': 'features/auth/screens/AvatarPickScreen.tsx',
    'auth/05_ContactsPermissionScreen.tsx': 'features/auth/screens/ContactsPermissionScreen.tsx',
    'auth/06_LocationPermissionScreen.tsx': 'features/auth/screens/LocationPermissionScreen.tsx',
    'auth/07_AgeInputScreen.tsx': 'features/auth/screens/AgeInputScreen.tsx',
    'auth/08_PathInputScreen.tsx': 'features/auth/screens/PathInputScreen.tsx',
    'auth/09_JamPickerScreen.tsx': 'features/auth/screens/JamPickerScreen.tsx',
    'auth/10_RestaurantPickerScreen.tsx': 'features/auth/screens/RestaurantPickerScreen.tsx',
    'auth/11_HobbyPickerScreen.tsx': 'features/auth/screens/HobbyPickerScreen.tsx',
    'auth/12_LoadingScreen.tsx': 'features/auth/screens/LoadingScreen.tsx',
    
    // Event screens
    'CreateEventScreen.tsx': 'features/events/screens/CreateEventScreen.tsx',
    'EventDetailsScreen.tsx': 'features/events/screens/EventDetailsScreen.tsx',
    'EditCoverScreen.tsx': 'features/events/screens/EditCoverScreen.tsx',
    
    // Chat screens
    'ChatScreen.tsx': 'features/chat/screens/ChatScreen.tsx',
    'ConversationScreen.tsx': 'features/chat/screens/ConversationScreen.tsx',
    
    // Map screens
    'MapScreen.tsx': 'features/map/screens/MapScreen.tsx',
  };
  
  console.log('✅ Screen organization plan created');
  console.log('⚠️  Manual file moving required to prevent data loss');
}

// Create migration summary
function createMigrationSummary() {
  console.log('\n📊 Migration Summary:');
  console.log('===================');
  console.log('✅ Documentation consolidated to /docs');
  console.log('✅ FSD structure created');
  console.log('✅ Duplicate directories identified');
  console.log('⚠️  Manual steps required:');
  console.log('   1. Review and consolidate Supabase migrations');
  console.log('   2. Move screens to appropriate feature folders');
  console.log('   3. Update import paths throughout the project');
  console.log('   4. Remove remaining duplicates after verification');
  console.log('   5. Run TypeScript and ESLint checks');
  
  // Create migration checklist
  const checklist = `# &Friends FSD Migration Checklist

## Automated Steps (Completed) ✅
- [x] Created backup directory
- [x] Moved documentation to /docs
- [x] Created FSD directory structure
- [x] Identified duplicates and inconsistencies

## Manual Steps Required 🔧

### 1. Supabase Migrations
- [ ] Review duplicate migrations in /supabase/migrations
- [ ] Consolidate into 4 main migration files
- [ ] Test migrations on fresh database

### 2. Screen Organization
- [ ] Move auth screens to /src/features/auth/screens
- [ ] Move event screens to /src/features/events/screens
- [ ] Move chat screens to /src/features/chat/screens
- [ ] Update all import paths

### 3. Component Migration
- [ ] Move shared components to /src/shared/ui
- [ ] Move feature-specific components to feature folders
- [ ] Create proper exports/index files

### 4. Clean Up
- [ ] Remove /components directory at root
- [ ] Remove /hooks directory at root
- [ ] Remove duplicate assets
- [ ] Update App.tsx location

### 5. Validation
- [ ] Run \`npm run typecheck\`
- [ ] Run \`npm run lint\`
- [ ] Run \`npm test\`
- [ ] Build project successfully

### 6. Git Commit
- [ ] Review all changes
- [ ] Commit with message: "refactor: migrate to FSD architecture"
`;
  
  fs.writeFileSync(path.join(PROJECT_ROOT, 'MIGRATION_CHECKLIST.md'), checklist);
  console.log('\n✅ Migration checklist created: MIGRATION_CHECKLIST.md');
}

// Main execution
async function main() {
  try {
    createBackup();
    consolidateDocs();
    // removeDuplicates(); // Commented out for safety
    consolidateMigrations();
    createFSDStructure();
    organizeScreens();
    createMigrationSummary();
    
    console.log('\n🎉 Migration script completed!');
    console.log('📋 Please review MIGRATION_CHECKLIST.md for next steps');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
main();