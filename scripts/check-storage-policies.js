#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const SUPABASE_URL = 'https://rmwgfiwngqciixbgluuq.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY non définie');
  console.log('💡 Exportez votre clé de service: export SUPABASE_SERVICE_KEY="votre-clé"');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkStoragePolicies() {
  console.log('🔍 Vérification des policies de storage...\n');

  try {
    // Vérifier les buckets
    const { data: buckets, error: bucketsError } = await supabase
      .rpc('query_raw', {
        query: `
          SELECT id, name, public, allowed_mime_types, file_size_limit
          FROM storage.buckets
          ORDER BY name
        `
      });

    if (bucketsError) {
      console.error('❌ Erreur lors de la récupération des buckets:', bucketsError);
      return;
    }

    console.log('📦 Buckets de storage:');
    buckets.forEach(bucket => {
      console.log(`\n  ${bucket.name}:`);
      console.log(`    - Public: ${bucket.public ? '✅' : '❌'}`);
      console.log(`    - Types autorisés: ${bucket.allowed_mime_types || 'Tous'}`);
      console.log(`    - Taille max: ${bucket.file_size_limit ? (bucket.file_size_limit / 1024 / 1024) + ' MB' : 'Illimitée'}`);
    });

    // Vérifier les policies RLS
    console.log('\n\n🔐 Policies RLS pour storage.objects:');
    
    const { data: policies, error: policiesError } = await supabase
      .rpc('query_raw', {
        query: `
          SELECT 
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
          FROM pg_policies
          WHERE schemaname = 'storage' 
            AND tablename = 'objects'
            AND policyname LIKE '%stories%'
          ORDER BY policyname
        `
      });

    if (policiesError) {
      console.error('❌ Erreur lors de la récupération des policies:', policiesError);
      return;
    }

    console.log('\n📋 Policies pour le bucket stories:');
    policies.forEach(policy => {
      console.log(`\n  ${policy.policyname}:`);
      console.log(`    - Commande: ${policy.cmd}`);
      console.log(`    - Rôles: ${policy.roles}`);
      console.log(`    - Condition: ${policy.qual || policy.with_check || 'Aucune'}`);
    });

    // Recommandations
    console.log('\n\n💡 Recommandations:');
    console.log('1. Le bucket "stories" doit être public pour la lecture');
    console.log('2. Les utilisateurs authentifiés doivent pouvoir INSERT');
    console.log('3. Les utilisateurs doivent pouvoir UPDATE/DELETE leurs propres stories');
    console.log('4. Vérifiez que auth.uid() est utilisé dans les policies');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// Exécuter la vérification
checkStoragePolicies();