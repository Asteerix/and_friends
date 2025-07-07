#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration Supabase
const SUPABASE_URL = 'https://rmwgfiwngqciixbgluuq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtd2dmaXduZ3FjaWl4YmdsdXVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTU2Mzc4NjMsImV4cCI6MjAzMTIxMzg2M30.VjZGx0ZbYJGdgKiqJIpzoiaDOLUb2dY6xMOMuy-GEMI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testStoryUpload() {
  console.log('🧪 Test du système de stories...\n');

  try {
    // 1. Se connecter avec un utilisateur de test
    console.log('1️⃣ Connexion...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'Test123!',
    });

    if (authError) {
      console.error('❌ Erreur de connexion:', authError.message);
      console.log('💡 Créez un utilisateur de test avec: npm run create-test-user');
      return;
    }

    console.log('✅ Connecté en tant que:', authData.user.email);
    console.log('   User ID:', authData.user.id);

    // 2. Créer un fichier de test
    console.log('\n2️⃣ Création d\'un fichier de test...');
    const testImageData = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    const fileName = `test-story-${Date.now()}.gif`;
    
    // 3. Tester l'upload dans le bucket stories
    console.log('\n3️⃣ Test d\'upload dans le bucket stories...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('stories')
      .upload(fileName, testImageData, {
        contentType: 'image/gif',
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('❌ Erreur d\'upload:', uploadError);
      return;
    }

    console.log('✅ Upload réussi:', uploadData);

    // 4. Obtenir l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from('stories')
      .getPublicUrl(fileName);

    console.log('🔗 URL publique:', publicUrl);

    // 5. Vérifier la taille du fichier uploadé
    console.log('\n4️⃣ Vérification du fichier uploadé...');
    const { data: fileData, error: fileError } = await supabase.storage
      .from('stories')
      .list('', {
        limit: 100,
        search: fileName
      });

    if (fileError) {
      console.error('❌ Erreur lors de la récupération:', fileError);
    } else {
      const uploadedFile = fileData.find(f => f.name === fileName);
      if (uploadedFile) {
        console.log('✅ Fichier trouvé:');
        console.log('   - Nom:', uploadedFile.name);
        console.log('   - Taille:', uploadedFile.metadata?.size || 'Non disponible', 'bytes');
        console.log('   - Type:', uploadedFile.metadata?.mimetype || 'Non disponible');
        
        if (uploadedFile.metadata?.size === 0) {
          console.error('⚠️  ATTENTION: Le fichier a une taille de 0 bytes!');
        }
      } else {
        console.error('❌ Fichier non trouvé dans le bucket');
      }
    }

    // 6. Créer une story dans la base de données
    console.log('\n5️⃣ Création d\'une story dans la base de données...');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { data: storyData, error: storyError } = await supabase
      .from('stories')
      .insert({
        user_id: authData.user.id,
        media_url: publicUrl,
        type: 'photo',
        caption: 'Test story upload',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (storyError) {
      console.error('❌ Erreur création story:', storyError);
    } else {
      console.log('✅ Story créée avec succès:');
      console.log('   - ID:', storyData.id);
      console.log('   - Media URL:', storyData.media_url);
      console.log('   - Type:', storyData.type);
    }

    // 7. Nettoyer - supprimer le fichier de test
    console.log('\n6️⃣ Nettoyage...');
    const { error: deleteError } = await supabase.storage
      .from('stories')
      .remove([fileName]);

    if (deleteError) {
      console.error('⚠️  Impossible de supprimer le fichier de test:', deleteError);
    } else {
      console.log('✅ Fichier de test supprimé');
    }

    // Supprimer la story de test
    if (storyData) {
      const { error: deleteStoryError } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyData.id);

      if (deleteStoryError) {
        console.error('⚠️  Impossible de supprimer la story de test:', deleteStoryError);
      } else {
        console.log('✅ Story de test supprimée');
      }
    }

    console.log('\n✨ Test terminé avec succès!');

  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
  }
}

// Exécuter le test
testStoryUpload();