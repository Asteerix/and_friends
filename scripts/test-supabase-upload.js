const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpload() {
  console.log('Testing Supabase connection...');
  
  // Test auth
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError) {
    console.error('Auth error:', authError);
    return;
  }
  
  console.log('Session:', session ? 'Active' : 'None');
  
  // Test storage buckets
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (bucketsError) {
    console.error('Buckets error:', bucketsError);
  } else {
    console.log('Available buckets:', buckets.map(b => b.name));
  }
  
  // Test stories bucket
  const { data: files, error: filesError } = await supabase.storage
    .from('stories')
    .list();
    
  if (filesError) {
    console.error('Stories bucket error:', filesError);
  } else {
    console.log('Files in stories bucket:', files.length);
  }
}

testUpload();