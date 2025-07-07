const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Debug: Story Upload Test');
console.log('==========================');
console.log('Supabase URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING ❌');
console.log('Supabase Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING ❌');
console.log('');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testStorageUpload() {
  try {
    // 1. Test authentication
    console.log('1️⃣ Testing authentication...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com', // Replace with a test user
      password: 'testpassword123' // Replace with test password
    });

    if (authError) {
      console.error('❌ Auth error:', authError.message);
      return;
    }
    console.log('✅ Authenticated as:', authData.user.email);
    console.log('');

    // 2. Check storage buckets
    console.log('2️⃣ Checking storage buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError);
    } else {
      console.log('✅ Available buckets:', buckets.map(b => b.name).join(', '));
    }
    console.log('');

    // 3. Create a test image
    console.log('3️⃣ Creating test image...');
    const testImagePath = path.join(__dirname, 'test-story.jpg');
    
    // Create a simple 1x1 pixel JPEG
    const jpegData = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
      0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
      0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
      0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
      0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0x35, 0x10, 0x00, 0x02, 0x01, 0x03,
      0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
      0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
      0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
      0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
      0x82, 0x09, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00,
      0xFB, 0xD0, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xD9
    ]);
    
    fs.writeFileSync(testImagePath, jpegData);
    console.log('✅ Test image created:', testImagePath);
    console.log('');

    // 4. Test direct upload
    console.log('4️⃣ Testing direct upload to stories bucket...');
    const fileName = `test-${Date.now()}.jpg`;
    const fileBuffer = fs.readFileSync(testImagePath);
    
    console.log('   - File size:', fileBuffer.length, 'bytes');
    console.log('   - File name:', fileName);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('stories')
      .upload(fileName, fileBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      console.error('   - Error code:', uploadError.statusCode);
      console.error('   - Error details:', JSON.stringify(uploadError, null, 2));
    } else {
      console.log('✅ Upload successful!');
      console.log('   - Path:', uploadData.path);
      console.log('   - ID:', uploadData.id);
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('stories')
        .getPublicUrl(fileName);
      
      console.log('   - Public URL:', urlData.publicUrl);
    }
    console.log('');

    // 5. Test storage policies
    console.log('5️⃣ Testing storage policies...');
    
    // Try to list files in the bucket
    const { data: listData, error: listError } = await supabase.storage
      .from('stories')
      .list('', { limit: 10 });
    
    if (listError) {
      console.error('❌ Cannot list files:', listError.message);
    } else {
      console.log('✅ Can list files. Found:', listData.length, 'files');
    }
    
    // Clean up test file
    fs.unlinkSync(testImagePath);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testStorageUpload();