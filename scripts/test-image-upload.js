import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testImageUpload() {
  try {
    // Create a test image buffer
    const testImagePath = path.join(__dirname, '..', 'assets', 'images', 'background.png');
    const imageBuffer = await fs.readFile(testImagePath);
    
    console.log('📸 Test image loaded, size:', imageBuffer.length, 'bytes');
    
    // Try different upload methods
    const fileName = `test-${Date.now()}.png`;
    
    // Method 1: Direct buffer upload
    console.log('\n🔄 Testing Method 1: Direct buffer upload...');
    const { error: bufferError, data: bufferData } = await supabase.storage
      .from('stories')
      .upload(`test1-${fileName}`, imageBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false,
      });
    
    if (bufferError) {
      console.error('❌ Buffer upload error:', bufferError);
    } else {
      console.log('✅ Buffer upload success:', bufferData);
      
      // Check if file exists and has content
      const { data: listData } = await supabase.storage
        .from('stories')
        .list('', { search: `test1-${fileName}` });
      
      console.log('📁 File info:', listData?.[0]);
    }
    
    // Method 2: Blob upload
    console.log('\n🔄 Testing Method 2: Blob upload...');
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    console.log('📦 Blob created, size:', blob.size, 'type:', blob.type);
    
    const { error: blobError, data: blobData } = await supabase.storage
      .from('stories')
      .upload(`test2-${fileName}`, blob, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false,
      });
    
    if (blobError) {
      console.error('❌ Blob upload error:', blobError);
    } else {
      console.log('✅ Blob upload success:', blobData);
    }
    
    // Method 3: ArrayBuffer upload
    console.log('\n🔄 Testing Method 3: ArrayBuffer upload...');
    const arrayBuffer = imageBuffer.buffer.slice(
      imageBuffer.byteOffset,
      imageBuffer.byteOffset + imageBuffer.byteLength
    );
    
    const { error: arrayError, data: arrayData } = await supabase.storage
      .from('stories')
      .upload(`test3-${fileName}`, arrayBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false,
      });
    
    if (arrayError) {
      console.error('❌ ArrayBuffer upload error:', arrayError);
    } else {
      console.log('✅ ArrayBuffer upload success:', arrayData);
    }
    
    // List all uploaded files
    console.log('\n📋 Listing all test files...');
    const { data: allFiles } = await supabase.storage
      .from('stories')
      .list('', { search: 'test' });
    
    console.log('Files found:', allFiles?.map(f => ({
      name: f.name,
      size: f.metadata?.size || 'unknown'
    })));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testImageUpload();