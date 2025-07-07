import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetRegistrationStep() {
  try {
    // First, get the current user's session
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    if (users && users.length > 0) {
      // Get the most recent user (assuming that's you)
      const latestUser = users[users.length - 1];
      console.log('👤 Found user:', latestUser.email || latestUser.phone);

      // Update the registration step to phone_verification
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          current_registration_step: 'phone_verification',
          manual_registration_step: null 
        })
        .eq('id', latestUser.id);

      if (updateError) {
        console.error('❌ Error updating registration step:', updateError);
      } else {
        console.log('✅ Registration step reset to phone_verification');
      }
    } else {
      console.log('❌ No users found');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

resetRegistrationStep();