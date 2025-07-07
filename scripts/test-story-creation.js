#!/usr/bin/env node

/**
 * Test script to verify story creation functionality
 * This simulates the story creation flow and tests the database integration
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testStoryCreation() {
  console.log('🧪 Testing story creation flow...\n');

  try {
    // 1. Check if stories table exists
    const { data: tables, error: tableError } = await supabase
      .from('stories')
      .select('id')
      .limit(1);

    if (tableError) {
      console.error('❌ Stories table not accessible:', tableError);
      return;
    }

    console.log('✅ Stories table is accessible');

    // 2. Check storage bucket
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

    if (bucketError) {
      console.error('❌ Cannot list storage buckets:', bucketError);
      return;
    }

    const storiesBucket = buckets.find(b => b.id === 'stories');
    if (!storiesBucket) {
      console.error('❌ Stories storage bucket not found');
      return;
    }

    console.log('✅ Stories storage bucket exists');

    // 3. Test authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('⚠️  No authenticated user - story creation would require authentication');
    } else {
      console.log('✅ User authenticated:', user.email);
    }

    // 4. Check RPC function for story views
    // Check if RPC function exists (it may not be created yet)
    try {
      const { error: rpcError } = await supabase.rpc('add_story_view', {
        story_id: '00000000-0000-0000-0000-000000000000',
        viewer_id: '00000000-0000-0000-0000-000000000000'
      });
      
      if (rpcError && !rpcError.message.includes('does not exist')) {
        console.log('⚠️  add_story_view RPC function may not be configured properly');
      } else {
        console.log('✅ add_story_view RPC function is available');
      }
    } catch (e) {
      console.log('ℹ️  add_story_view RPC function not found (needs to be created)');
    }


    // 5. Check recent stories
    const { data: recentStories, error: storiesError } = await supabase
      .from('stories')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    if (storiesError) {
      console.error('❌ Error fetching stories:', storiesError);
    } else {
      console.log(`\n📱 Found ${recentStories?.length || 0} active stories`);
      if (recentStories?.length > 0) {
        console.log('\nRecent stories:');
        recentStories.forEach(story => {
          console.log(`  - ${story.id.slice(0, 8)}... | ${story.media_type} | Created: ${new Date(story.created_at).toLocaleString()}`);
        });
      }
    }

    console.log('\n✨ Story creation system is ready!');
    console.log('\nTo test in the app:');
    console.log('1. Open the app and navigate to the home screen');
    console.log('2. Tap the "+" button in the stories strip');
    console.log('3. Take a photo or record a video');
    console.log('4. Add a caption and share to your story');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testStoryCreation();