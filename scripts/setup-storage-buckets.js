#!/usr/bin/env node

/**
 * Script to ensure all storage buckets are properly configured
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Load configuration from app.config.js
let config = {};
try {
  const appConfigPath = path.join(__dirname, '..', 'app.config.js');
  if (fs.existsSync(appConfigPath)) {
    // Handle ES module format
    delete require.cache[require.resolve(appConfigPath)];
    const appConfigModule = require(appConfigPath);
    const appConfig = appConfigModule.default || appConfigModule;
    config = appConfig?.expo?.extra || {};
  } else {
    log('❌ app.config.js not found', 'red');
    process.exit(1);
  }
} catch (error) {
  log(`❌ Error loading app.config.js: ${error.message}`, 'red');
  process.exit(1);
}

const { supabaseUrl, supabaseAnonKey } = config;

if (!supabaseUrl || !supabaseAnonKey) {
  log('❌ Missing Supabase configuration in app.config.js', 'red');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupStorageBuckets() {
  log('🗄️  Setting up storage buckets...', 'bold');
  log('', '');

  const bucketsToCreate = [
    {
      id: 'avatars',
      name: 'avatars',
      public: true,
      fileSizeLimit: 1048576, // 1MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
    },
    {
      id: 'stories',
      name: 'stories',
      public: false,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/mov']
    },
    {
      id: 'event-covers',
      name: 'event-covers',
      public: true,
      fileSizeLimit: 2097152, // 2MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
    },
    {
      id: 'chat-media',
      name: 'chat-media',
      public: false,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'audio/mpeg', 'audio/wav', 'audio/m4a']
    }
  ];

  let allBucketsExist = true;

  try {
    // List existing buckets
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      log('❌ Error listing buckets: ' + listError.message, 'red');
      log('⚠️  Note: This script needs to be run with service role key for bucket creation.', 'yellow');
      log('   You may need to create buckets manually in the Supabase dashboard.', 'yellow');
      return false;
    }

    log(`Found ${existingBuckets?.length || 0} existing buckets`, 'cyan');
    log('');

    // Check each bucket
    for (const bucketConfig of bucketsToCreate) {
      const exists = existingBuckets?.find(b => b.id === bucketConfig.id);
      
      if (exists) {
        log(`✅ Bucket '${bucketConfig.id}' already exists`, 'green');
      } else {
        log(`❌ Bucket '${bucketConfig.id}' is missing`, 'red');
        log(`   Settings needed:`, 'cyan');
        log(`   - Public: ${bucketConfig.public}`, 'cyan');
        log(`   - File size limit: ${Math.round(bucketConfig.fileSizeLimit / 1024 / 1024)}MB`, 'cyan');
        log(`   - Allowed MIME types: ${bucketConfig.allowedMimeTypes.join(', ')}`, 'cyan');
        log('');
        allBucketsExist = false;
      }
    }

    if (!allBucketsExist) {
      log('📝 To create missing buckets:', 'bold');
      log('1. Go to your Supabase dashboard', 'yellow');
      log('2. Navigate to Storage', 'yellow');
      log('3. Click "New bucket" for each missing bucket', 'yellow');
      log('4. Use the settings shown above for each bucket', 'yellow');
      log('');
    }

    return allBucketsExist;

  } catch (error) {
    log('❌ Unexpected error: ' + error.message, 'red');
    return false;
  }
}

async function main() {
  log('🗂️  Supabase Storage Buckets Setup', 'bold');
  log('==================================', 'bold');
  
  const success = await setupStorageBuckets();
  
  log('📊 Setup Summary', 'bold');
  log('================', 'bold');
  
  if (success) {
    log('✅ All required storage buckets exist!', 'green');
    log('🔄 Run validation again: npm run validate-supabase', 'cyan');
  } else {
    log('❌ Some storage buckets are missing', 'red');
    log('📝 Please create them manually in the Supabase dashboard', 'yellow');
    log('🔄 Then run: npm run validate-supabase', 'cyan');
  }
}

// Run the setup
main().catch(error => {
  log(`\n💥 Setup script failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});