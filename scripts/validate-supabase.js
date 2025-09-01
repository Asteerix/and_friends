#!/usr/bin/env node

/**
 * Supabase Configuration Validation Script
 * 
 * This script validates the Supabase configuration and database schema.
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

// Load configuration
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

// Validate environment variables
const { supabaseUrl, supabaseAnonKey } = config;

if (!supabaseUrl || !supabaseAnonKey) {
  log('❌ Missing Supabase configuration in app.config.js', 'red');
  log('   Required: supabaseUrl, supabaseAnonKey', 'yellow');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function validateSupabaseConnection() {
  log('\n🔍 Validating Supabase Configuration...', 'blue');
  
  try {
    // Test connection
    log('1. Testing connection...', 'cyan');
    const { data, error } = await supabase.auth.getSession();
    
    if (error && error.message !== 'No session found') {
      log(`❌ Connection failed: ${error.message}`, 'red');
      return false;
    }
    
    log('✅ Connection successful', 'green');
    
    // Test database access
    log('2. Testing database access...', 'cyan');
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (profilesError) {
      log(`❌ Database access failed: ${profilesError.message}`, 'red');
      return false;
    }
    
    log('✅ Database access successful', 'green');
    
    return true;
  } catch (error) {
    log(`❌ Validation failed: ${error.message}`, 'red');
    return false;
  }
}

async function validateDatabaseSchema() {
  log('\n🗄️  Validating Database Schema...', 'blue');
  
  const requiredTables = [
    'profiles',
    'events',
    'chats',
    'messages',
    'event_participants',
    'chat_participants',
    'stories',
    'notifications',
    'friendships'
  ];
  
  let allTablesExist = true;
  
  for (const table of requiredTables) {
    try {
      log(`   Checking table: ${table}...`, 'cyan');
      
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        log(`   ❌ Table '${table}' error: ${error.message}`, 'red');
        allTablesExist = false;
      } else {
        log(`   ✅ Table '${table}' exists`, 'green');
      }
    } catch (error) {
      log(`   ❌ Table '${table}' validation failed: ${error.message}`, 'red');
      allTablesExist = false;
    }
  }
  
  return allTablesExist;
}

async function validateStorageBuckets() {
  log('\n🗂️  Validating Storage Buckets...', 'blue');
  
  const requiredBuckets = [
    'avatars',
    'stories',
    'event-covers',
    'chat-media'
  ];
  
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      log(`❌ Failed to list buckets: ${error.message}`, 'red');
      return false;
    }
    
    const bucketNames = buckets.map(bucket => bucket.name);
    let allBucketsExist = true;
    
    for (const bucketName of requiredBuckets) {
      if (bucketNames.includes(bucketName)) {
        log(`   ✅ Bucket '${bucketName}' exists`, 'green');
      } else {
        log(`   ❌ Bucket '${bucketName}' missing`, 'red');
        allBucketsExist = false;
      }
    }
    
    return allBucketsExist;
  } catch (error) {
    log(`❌ Storage validation failed: ${error.message}`, 'red');
    return false;
  }
}

async function validateAuthConfiguration() {
  log('\n🔐 Validating Auth Configuration...', 'blue');
  
  try {
    // Test OTP functionality
    log('   Testing OTP configuration...', 'cyan');
    
    // Try to send OTP to a test number (this will fail but we check the error type)
    const { error } = await supabase.auth.signInWithOtp({
      phone: '+33612345678', // Test number
    });
    
    if (error) {
      // Expected errors that indicate OTP is configured
      if (error.message.includes('Rate limit') || 
          error.message.includes('SMS') ||
          error.message.includes('quota') ||
          error.message.includes('provider')) {
        log('   ✅ OTP configuration appears to be set up', 'green');
        return true;
      } else if (error.message.includes('disabled') || 
                 error.message.includes('not configured')) {
        log(`   ❌ OTP not configured: ${error.message}`, 'red');
        return false;
      }
    }
    
    log('   ✅ Auth configuration appears valid', 'green');
    return true;
  } catch (error) {
    log(`   ❌ Auth validation failed: ${error.message}`, 'red');
    return false;
  }
}

async function validateRLSPolicies() {
  log('\n🛡️  Validating RLS Policies...', 'blue');
  
  const tables = ['profiles', 'events', 'chats', 'messages'];
  let allPoliciesValid = true;
  
  for (const table of tables) {
    try {
      log(`   Checking RLS for ${table}...`, 'cyan');
      
      // Try to access the table without authentication
      // This should fail if RLS is properly configured
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      // If we get a permission error, RLS is working
      if (error && error.message.includes('permission denied')) {
        log(`   ✅ RLS enabled for '${table}'`, 'green');
      } else if (!error) {
        // No error means either no RLS or permissive policy
        log(`   ⚠️  '${table}' accessible without auth - check RLS policies`, 'yellow');
        allPoliciesValid = false;
      }
    } catch (error) {
      log(`   ❌ RLS check failed for '${table}': ${error.message}`, 'red');
      allPoliciesValid = false;
    }
  }
  
  return allPoliciesValid;
}

async function main() {
  log('🚀 Supabase Configuration Validator', 'bold');
  log('=====================================', 'bold');
  
  const results = {
    connection: false,
    schema: false,
    storage: false,
    auth: false,
    rls: false
  };
  
  // Run all validations
  results.connection = await validateSupabaseConnection();
  
  if (results.connection) {
    results.schema = await validateDatabaseSchema();
    results.storage = await validateStorageBuckets();
    results.auth = await validateAuthConfiguration();
    results.rls = await validateRLSPolicies();
  }
  
  // Summary
  log('\n📊 Validation Summary', 'bold');
  log('=====================', 'bold');
  
  const checks = [
    ['Connection', results.connection],
    ['Database Schema', results.schema],
    ['Storage Buckets', results.storage],
    ['Auth Configuration', results.auth],
    ['RLS Policies', results.rls]
  ];
  
  for (const [check, passed] of checks) {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const color = passed ? 'green' : 'red';
    log(`${status} ${check}`, color);
  }
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    log('\n🎉 All validations passed! Supabase is ready for production.', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  Some validations failed. Please check the issues above.', 'yellow');
    process.exit(1);
  }
}

// Run the validator
main().catch(error => {
  log(`\n💥 Validation script failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});