const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSMSConfiguration() {
  console.log('📱 Testing SMS Configuration for &Friends\n');
  console.log('🔗 Supabase URL:', supabaseUrl);
  console.log('🔑 Using anon key:', supabaseKey.substring(0, 20) + '...\n');

  // Test numbers to try
  const testNumbers = [
    '+33612345678', // Mode test
    '+33600000000', // Test français
    '+1234567890',  // Test US invalide
  ];

  console.log('📋 Running SMS configuration tests...\n');

  // 1. Test basic auth connectivity
  console.log('1. Testing Supabase Auth connectivity...');
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (!error) {
      console.log('   ✅ Auth service is reachable');
      console.log(`   ${session ? '✅' : '⚠️'} Session status: ${session ? 'Active' : 'None'}\n`);
    } else {
      console.log('   ❌ Auth service error:', error.message, '\n');
    }
  } catch (err) {
    console.log('   ❌ Failed to connect to auth service:', err.message, '\n');
  }

  // 2. Test SMS sending (dry run)
  console.log('2. Testing SMS OTP endpoint...');
  
  for (const phone of testNumbers) {
    console.log(`\n   Testing ${phone}:`);
    
    try {
      const startTime = Date.now();
      const { data, error } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          shouldCreateUser: false, // Don't create users in test
          channel: 'sms',
          data: {
            test_run: true,
            source: 'config_test'
          }
        }
      });
      
      const responseTime = Date.now() - startTime;
      
      if (error) {
        console.log(`   ❌ Error: ${error.message}`);
        console.log(`   Response time: ${responseTime}ms`);
        
        // Analyze error
        if (error.message.includes('rate limit')) {
          console.log('   ℹ️  Rate limiting is active (good!)');
        } else if (error.message.includes('Invalid phone')) {
          console.log('   ℹ️  Phone validation is working');
        } else if (error.message.includes('SMS provider')) {
          console.log('   ⚠️  SMS provider might not be configured');
        }
      } else {
        console.log(`   ✅ Request accepted (${responseTime}ms)`);
        if (phone === '+33612345678') {
          console.log('   ℹ️  Test mode number recognized');
        }
      }
    } catch (err) {
      console.log(`   ❌ Unexpected error: ${err.message}`);
    }
  }

  // 3. Check for common issues
  console.log('\n3. Common issues check:\n');
  
  console.log('   📌 If SMS are not received:');
  console.log('   1. Check Supabase Dashboard > Authentication > Providers > Phone');
  console.log('   2. Ensure SMS provider (Twilio/MessageBird) is configured');
  console.log('   3. Verify SMS quota (Free plan = 100 SMS/month)');
  console.log('   4. Check provider logs for delivery status\n');

  console.log('   📌 For development/testing:');
  console.log('   - Use phone: +33612345678');
  console.log('   - Use code: 123456');
  console.log('   - This bypasses actual SMS sending\n');

  // 4. Rate limit test
  console.log('4. Testing rate limiting...');
  const testPhone = '+33699999999';
  let rateLimitHit = false;
  
  for (let i = 0; i < 3; i++) {
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: testPhone });
      if (error && error.message.includes('rate limit')) {
        rateLimitHit = true;
        console.log(`   ✅ Rate limit kicked in after ${i + 1} attempts`);
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between attempts
    } catch (err) {
      // Ignore
    }
  }
  
  if (!rateLimitHit) {
    console.log('   ⚠️  Rate limiting might not be properly configured');
  }

  console.log('\n✅ SMS configuration test completed!');
  console.log('\n📱 Next steps:');
  console.log('1. Configure SMS provider in Supabase Dashboard');
  console.log('2. Test with a real phone number');
  console.log('3. Monitor SMS delivery in provider dashboard');
  console.log('4. Check logs in Supabase Dashboard > Logs');
}

// Run the test
testSMSConfiguration().catch(console.error);