import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addCaptionPositionColumn() {
  try {
    console.log('🔄 Adding caption_position column to stories table...');
    
    // Add the column if it doesn't exist
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE stories 
        ADD COLUMN IF NOT EXISTS caption_position float DEFAULT NULL;
      `
    });

    if (error) {
      // Try direct query if RPC doesn't exist
      const { error: directError } = await supabase
        .from('stories')
        .select('caption_position')
        .limit(1);
      
      if (directError?.message?.includes('column "caption_position" does not exist')) {
        console.error('❌ Column does not exist and cannot be added via API');
        console.log('Please run this SQL in Supabase dashboard:');
        console.log('ALTER TABLE stories ADD COLUMN IF NOT EXISTS caption_position float DEFAULT NULL;');
      } else {
        console.log('✅ Column might already exist or was added');
      }
    } else {
      console.log('✅ caption_position column added successfully');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

addCaptionPositionColumn();