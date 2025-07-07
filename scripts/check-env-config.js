const fs = require('fs');
const path = require('path');

console.log('🔍 Checking environment configuration...\n');

// Check for .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  console.log('✅ .env.local file found');
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  const requiredVars = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY'
  ];
  
  requiredVars.forEach(varName => {
    const line = lines.find(l => l.startsWith(varName));
    if (line && line.includes('=') && line.split('=')[1].trim()) {
      const value = line.split('=')[1].trim();
      console.log(`✅ ${varName}: ${value.substring(0, 30)}...`);
    } else {
      console.log(`❌ ${varName}: NOT FOUND or EMPTY`);
    }
  });
} else {
  console.log('❌ .env.local file NOT FOUND');
  console.log('   Create it by copying .env.example and filling in your values');
}

console.log('\n📱 Environment check complete!');
console.log('Make sure to restart the app after setting environment variables.');