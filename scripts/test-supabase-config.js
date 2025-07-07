#!/usr/bin/env node

require('dotenv').config();

console.log('🔍 Checking Supabase configuration...\n');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('Environment variables:');
console.log('  EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('  EXPO_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing');

if (supabaseUrl) {
  console.log('\nSupabase URL:', supabaseUrl);
  
  // Check if URL is valid
  try {
    const url = new URL(supabaseUrl);
    console.log('  Protocol:', url.protocol);
    console.log('  Host:', url.host);
    console.log('  Valid URL: ✅');
  } catch (error) {
    console.error('  Valid URL: ❌', error.message);
  }
}

if (supabaseAnonKey) {
  console.log('\nSupabase Anon Key:');
  console.log('  First 20 chars:', supabaseAnonKey.substring(0, 20) + '...');
  console.log('  Length:', supabaseAnonKey.length);
  console.log('  Looks like JWT:', supabaseAnonKey.includes('.') ? '✅' : '❌');
}

// Test storage endpoint
if (supabaseUrl && supabaseAnonKey) {
  console.log('\n🧪 Testing storage endpoint...');
  
  const fetch = require('node-fetch');
  const storageUrl = `${supabaseUrl}/storage/v1/bucket`;
  
  fetch(storageUrl, {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    }
  })
  .then(response => {
    console.log('  Storage endpoint status:', response.status);
    console.log('  Content-Type:', response.headers.get('content-type'));
    
    if (response.headers.get('content-type')?.includes('text/html')) {
      console.error('  ⚠️  Warning: Storage endpoint returning HTML instead of JSON');
      console.error('  This might indicate an incorrect URL or configuration issue');
    }
    
    return response.text();
  })
  .then(text => {
    if (text.startsWith('<')) {
      console.error('\n❌ Storage endpoint returned HTML:');
      console.error(text.substring(0, 200) + '...');
    } else {
      try {
        const json = JSON.parse(text);
        console.log('\n✅ Storage endpoint returned valid JSON');
      } catch (e) {
        console.error('\n❌ Storage endpoint returned invalid response:', text.substring(0, 200));
      }
    }
  })
  .catch(error => {
    console.error('\n❌ Error testing storage endpoint:', error.message);
  });
}