#!/usr/bin/env node

const https = require('https');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase connectivity...\n');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

// Parse URL
const url = new URL(supabaseUrl);

// Test basic HTTPS connection
console.log('Testing HTTPS connection to:', url.hostname);

const options = {
  hostname: url.hostname,
  port: 443,
  path: '/storage/v1/bucket',
  method: 'GET',
  headers: {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`
  }
};

const req = https.request(options, (res) => {
  console.log('✅ HTTPS connection successful');
  console.log('  Status:', res.statusCode);
  console.log('  Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse body:');
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ HTTPS connection failed:', e.message);
});

req.end();

// Test with curl command
console.log('\n\nYou can also test with curl:');
console.log(`curl -H "apikey: ${supabaseAnonKey}" \\`);
console.log(`     -H "Authorization: Bearer ${supabaseAnonKey}" \\`);
console.log(`     ${supabaseUrl}/storage/v1/bucket`);