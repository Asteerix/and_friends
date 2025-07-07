#!/usr/bin/env node

// Script pour créer un utilisateur de test dans Supabase
// Usage: node scripts/create-test-user.js

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Clé de service avec privilèges admin

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes:');
  console.error('  - EXPO_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('  - SUPABASE_SERVICE_KEY:', !!supabaseServiceKey);
  console.error('\nPour obtenir la clé de service:');
  console.error('1. Allez sur https://app.supabase.com/project/rmwgfiwngqciixbgluuq/settings/api');
  console.error('2. Copiez la clé "service_role" (secret)');
  console.error('3. Exécutez: export SUPABASE_SERVICE_KEY="votre-clé-ici"');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestUser() {
  const testEmail = process.env.EXPO_PUBLIC_TEST_EMAIL || 'poltavtseefamaury@gmail.com';
  const testPassword = 'test123456!';
  
  console.log('🚀 Création d\'un utilisateur de test...');
  console.log('  Email:', testEmail);
  
  try {
    // Vérifier si l'utilisateur existe déjà
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', testEmail)
      .single();
    
    if (existingUser) {
      console.log('✅ L\'utilisateur de test existe déjà');
      console.log('  ID:', existingUser.id);
      return;
    }
    
    // Créer l'utilisateur avec l'API Admin
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        phone: '+33633954893',
        is_test_user: true
      }
    });
    
    if (createError) {
      console.error('❌ Erreur création utilisateur:', createError);
      return;
    }
    
    console.log('✅ Utilisateur créé avec succès!');
    console.log('  ID:', user.user.id);
    
    // Créer le profil
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.user.id,
        phone: '+33633954893',
        username: 'test_user',
        full_name: 'Test User',
        birth_date: '2000-01-01',
        hobbies: ['Cooking', 'Gaming'],
        selected_path: 'Explorer',
        selected_restaurants: ['Restaurant Test 1', 'Restaurant Test 2'],
        jams: ['Electronic', 'Rock'],
        location_permission_granted: true,
        contacts_permission_granted: true,
        hide_birth_date: false,
        onboarding_completed: true
      });
    
    if (profileError) {
      console.error('⚠️ Erreur création profil:', profileError);
    } else {
      console.log('✅ Profil créé avec succès!');
    }
    
    console.log('\n📝 Instructions:');
    console.log('1. Dans l\'app, entrez n\'importe quel numéro de téléphone');
    console.log('2. Utilisez le code: 123456');
    console.log('3. Connexion avec:', testEmail, '/', testPassword);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

createTestUser();