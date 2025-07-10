const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRatingFunctions() {
  console.log('🔍 Testing rating functions...\n');

  // Test user ID (you might need to replace this with a real user ID from your database)
  const testUserId = 'e940d90b-2a0f-4b2a-b2a0-5c5a1e6a9a9a';

  try {
    // Test 1: get_user_rating_stats with positional parameter
    console.log('1. Testing get_user_rating_stats (positional)...');
    const { data: stats1, error: error1 } = await supabase
      .rpc('get_user_rating_stats', testUserId);
    
    if (error1) {
      console.log('❌ Positional parameter failed:', error1.message);
      
      // Try with named parameter
      console.log('   Trying with named parameter...');
      const { data: stats2, error: error2 } = await supabase
        .rpc('get_user_rating_stats', { p_user_id: testUserId });
      
      if (error2) {
        console.log('❌ Named parameter also failed:', error2.message);
      } else {
        console.log('✅ Named parameter works!');
        console.log('   Result:', stats2);
      }
    } else {
      console.log('✅ Positional parameter works!');
      console.log('   Result:', stats1);
    }

    console.log('\n---\n');

    // Test 2: get_user_given_ratings
    console.log('2. Testing get_user_given_ratings...');
    const { data: given1, error: givenError1 } = await supabase
      .rpc('get_user_given_ratings', {
        p_user_id: testUserId,
        p_limit: 10,
        p_offset: 0
      });
    
    if (givenError1) {
      console.log('❌ Named parameters failed:', givenError1.message);
      
      // Try positional (not likely to work for multiple params)
      console.log('   Trying positional parameters...');
      const { data: given2, error: givenError2 } = await supabase
        .rpc('get_user_given_ratings', testUserId, 10, 0);
      
      if (givenError2) {
        console.log('❌ Positional parameters also failed:', givenError2.message);
      } else {
        console.log('✅ Positional parameters work!');
      }
    } else {
      console.log('✅ Named parameters work!');
      console.log('   Result count:', given1?.length || 0);
    }

    console.log('\n---\n');

    // Test 3: List all functions in public schema
    console.log('3. Listing all functions in public schema...');
    const { data: functions, error: functionsError } = await supabase
      .rpc('get_schema_functions');

    if (functionsError) {
      // Try a direct query
      const { data: routines, error: routinesError } = await supabase
        .from('information_schema.routines')
        .select('routine_name, routine_type')
        .eq('routine_schema', 'public')
        .eq('routine_type', 'FUNCTION')
        .like('routine_name', '%rating%');

      if (routinesError) {
        console.log('❌ Could not list functions:', routinesError.message);
      } else {
        console.log('✅ Rating-related functions found:');
        routines?.forEach(r => console.log(`   - ${r.routine_name}`));
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testRatingFunctions();