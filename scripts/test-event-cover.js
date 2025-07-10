const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEventCoverData() {
  console.log('🎨 Testing Event Cover Data...\n');

  try {
    // 1. Récupérer quelques événements avec cover_data
    console.log('1. Fetching events with cover_data...');
    const { data: events, error } = await supabase
      .from('events')
      .select('id, title, subtitle, image_url, cover_data')
      .limit(5);
    
    if (error) {
      console.error('❌ Error fetching events:', error.message);
      return;
    }

    console.log(`✅ Found ${events?.length || 0} events\n`);

    // 2. Analyser les cover_data
    events?.forEach((event, index) => {
      console.log(`\n📅 Event ${index + 1}: ${event.title}`);
      console.log('   ID:', event.id);
      console.log('   Subtitle:', event.subtitle || '(none)');
      console.log('   Image URL:', event.image_url || '(none)');
      
      if (event.cover_data) {
        console.log('   Cover Data:');
        console.log('     - Background:', event.cover_data.selectedBackground || '(none)');
        console.log('     - Template:', event.cover_data.selectedTemplate ? 'Yes' : 'No');
        console.log('     - Cover Image:', event.cover_data.coverImage || event.cover_data.uploadedImage || '(none)');
        console.log('     - Title Font:', event.cover_data.selectedTitleFont || 'default');
        console.log('     - Subtitle Font:', event.cover_data.selectedSubtitleFont || 'default');
        console.log('     - Stickers:', event.cover_data.placedStickers?.length || 0);
        
        if (event.cover_data.placedStickers?.length > 0) {
          event.cover_data.placedStickers.forEach((sticker, i) => {
            console.log(`       Sticker ${i + 1}: ${sticker.emoji} at (${sticker.x}%, ${sticker.y}%)`);
          });
        }
      } else {
        console.log('   Cover Data: (none)');
      }
    });

    // 3. Créer un événement test avec cover_data
    console.log('\n\n3. Creating test event with cover data...');
    
    const testCoverData = {
      selectedBackground: '3', // Blue gradient
      selectedTitleFont: '3', // AFTERPARTY
      selectedSubtitleFont: '5', // Elegant
      placedStickers: [
        { id: '1', emoji: '🎉', x: 20, y: 20, scale: 1.5, rotation: 15 },
        { id: '2', emoji: '🎂', x: 80, y: 30, scale: 1.2, rotation: -10 },
        { id: '3', emoji: '🎈', x: 50, y: 70, scale: 1, rotation: 0 }
      ]
    };

    const { data: newEvent, error: createError } = await supabase
      .from('events')
      .insert([{
        title: 'Test Event with Cover',
        subtitle: 'Amazing party!',
        description: 'This is a test event with custom cover',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
        location: 'Test Location',
        cover_data: testCoverData,
        created_by: 'e940d90b-2a0f-4b2a-b2a0-5c5a1e6a9a9a' // Replace with a real user ID
      }])
      .select()
      .single();

    if (createError) {
      console.log('❌ Error creating test event:', createError.message);
    } else {
      console.log('✅ Test event created successfully!');
      console.log('   ID:', newEvent.id);
      console.log('   Title:', newEvent.title);
      console.log('   Cover Data:', JSON.stringify(newEvent.cover_data, null, 2));
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testEventCoverData();