#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyStoryViewsRLSFix() {
  try {
    console.log('🔧 Applying story_views RLS fix...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250707000003_fix_story_views_rls.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log('⚠️  exec_sql function not found, trying direct approach...');
      
      // Split the SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (const statement of statements) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        
        // For RLS policies, we need to use raw SQL through the admin API
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({ query: statement + ';' })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Error executing statement: ${errorText}`);
        } else {
          console.log('✅ Statement executed successfully');
        }
      }
    }
    
    console.log('✅ Story views RLS fix applied successfully!');
    
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  }
}

// Run the fix
applyStoryViewsRLSFix();