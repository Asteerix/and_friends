import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixStoragePolicies() {
  try {
    console.log('🔧 Checking storage buckets...');
    
    // Check if stories bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError);
      return;
    }
    
    console.log('📦 Found buckets:', buckets.map(b => b.name));
    
    const storiesBucket = buckets.find(b => b.name === 'stories');
    if (!storiesBucket) {
      console.log('❌ Stories bucket not found. Please create it in Supabase dashboard.');
      console.log('Go to: Storage > New bucket > Name: "stories" > Make it public');
      return;
    }
    
    if (!storiesBucket.public) {
      console.log('⚠️ Stories bucket is not public. Please make it public in Supabase dashboard.');
      console.log('Go to: Storage > stories > Settings > Make bucket public');
    } else {
      console.log('✅ Stories bucket is public');
    }
    
    // Test authenticated upload
    console.log('\n🔐 Testing authenticated upload...');
    
    // Sign in with test user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: process.env.EXPO_PUBLIC_TEST_EMAIL || 'test@example.com',
      password: 'testpassword123'
    });
    
    if (authError) {
      console.error('❌ Auth error:', authError.message);
      console.log('Make sure you have a test user with these credentials');
      return;
    }
    
    console.log('✅ Authenticated as:', authData.user.email);
    
    // Try upload with authenticated user
    const testData = Buffer.from('test content');
    const fileName = `auth-test-${Date.now()}.txt`;
    
    const { error: uploadError, data: uploadData } = await supabase.storage
      .from('stories')
      .upload(fileName, testData, {
        contentType: 'text/plain',
        cacheControl: '3600',
        upsert: false,
      });
    
    if (uploadError) {
      console.error('❌ Authenticated upload error:', uploadError);
      console.log('\n📋 Please check your RLS policies for the storage.objects table:');
      console.log('1. Go to Supabase Dashboard > Database > Tables > storage.objects');
      console.log('2. Click on "RLS enabled/disabled" toggle to enable RLS');
      console.log('3. Add these policies if they don\'t exist:');
      console.log('   - INSERT policy: auth.uid() IS NOT NULL');
      console.log('   - SELECT policy: bucket_id = \'stories\'');
      console.log('   - UPDATE policy: auth.uid() = owner');
      console.log('   - DELETE policy: auth.uid() = owner');
    } else {
      console.log('✅ Authenticated upload successful:', uploadData);
      
      // Clean up test file
      await supabase.storage.from('stories').remove([fileName]);
    }
    
    // Sign out
    await supabase.auth.signOut();
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the fix
fixStoragePolicies();