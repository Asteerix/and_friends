#!/usr/bin/env node

/**
 * Script to ensure all storage buckets are properly configured
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupStorageBuckets() {
  console.log('🗄️  Setting up storage buckets...\n');

  const bucketsToCreate = [
    {
      id: 'stories',
      name: 'stories',
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime']
    },
    {
      id: 'events',
      name: 'events',
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    },
    {
      id: 'profiles',
      name: 'profiles',
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    },
    {
      id: 'messages',
      name: 'messages',
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'audio/mpeg', 'audio/mp4']
    }
  ];

  try {
    // List existing buckets
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      console.log('\n⚠️  Note: This script needs to be run with service role key for bucket creation.');
      console.log('   You may need to create buckets manually in the Supabase dashboard.');
      return;
    }

    console.log(`Found ${existingBuckets?.length || 0} existing buckets\n`);

    // Check each bucket
    for (const bucketConfig of bucketsToCreate) {
      const exists = existingBuckets?.find(b => b.id === bucketConfig.id);
      
      if (exists) {
        console.log(`✅ Bucket '${bucketConfig.id}' already exists`);
      } else {
        console.log(`❌ Bucket '${bucketConfig.id}' is missing`);
        console.log(`   Please create it in the Supabase dashboard with these settings:`);
        console.log(`   - Public: ${bucketConfig.public}`);
        console.log(`   - File size limit: ${bucketConfig.fileSizeLimit / 1024 / 1024}MB`);
        console.log(`   - Allowed MIME types: ${bucketConfig.allowedMimeTypes.join(', ')}\n`);
      }
    }

    console.log('\n📝 To create missing buckets:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to Storage');
    console.log('3. Click "New bucket" for each missing bucket');
    console.log('4. Use the settings shown above');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the setup
setupStorageBuckets();