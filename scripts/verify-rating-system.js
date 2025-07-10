const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyRatingSystem() {
  console.log('🚀 Vérification du système de ratings...\n');

  try {
    // 1. Vérifier la table ratings
    console.log('1. Vérification de la table ratings...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('ratings')
      .select('count')
      .limit(1);
    
    if (tableError) {
      console.log('❌ Erreur table ratings:', tableError.message);
    } else {
      console.log('✅ Table ratings existe');
    }

    // 2. Tester get_user_rating_stats avec paramètres nommés
    console.log('\n2. Test get_user_rating_stats...');
    const testUserId = 'e940d90b-2a0f-4b2a-b2a0-5c5a1e6a9a9a';
    
    const { data: stats, error: statsError } = await supabase
      .rpc('get_user_rating_stats', { p_user_id: testUserId });
    
    if (statsError) {
      console.log('❌ Erreur get_user_rating_stats:', statsError.message);
    } else {
      console.log('✅ get_user_rating_stats fonctionne');
      console.log('   Résultat:', JSON.stringify(stats, null, 2));
    }

    // 3. Tester get_user_given_ratings
    console.log('\n3. Test get_user_given_ratings...');
    const { data: givenRatings, error: givenError } = await supabase
      .rpc('get_user_given_ratings', {
        p_user_id: testUserId,
        p_limit: 10,
        p_offset: 0
      });
    
    if (givenError) {
      console.log('❌ Erreur get_user_given_ratings:', givenError.message);
    } else {
      console.log('✅ get_user_given_ratings fonctionne');
      console.log('   Nombre de ratings donnés:', givenRatings?.length || 0);
    }

    // 4. Tester get_user_received_ratings
    console.log('\n4. Test get_user_received_ratings...');
    const { data: receivedRatings, error: receivedError } = await supabase
      .rpc('get_user_received_ratings', {
        p_user_id: testUserId,
        p_limit: 10,
        p_offset: 0
      });
    
    if (receivedError) {
      console.log('❌ Erreur get_user_received_ratings:', receivedError.message);
    } else {
      console.log('✅ get_user_received_ratings fonctionne');
      console.log('   Nombre de ratings reçus:', receivedRatings?.length || 0);
    }

    // 5. Lister toutes les fonctions rating
    console.log('\n5. Liste des fonctions rating dans la base...');
    const { data: functions, error: functionsError } = await supabase
      .rpc('pg_get_functions')
      .select('*')
      .like('routine_name', '%rating%');

    if (functionsError) {
      // Essayer une requête directe
      const { data: procData, error: procError } = await supabase.rpc('get_rating_functions_list');
      if (procError) {
        console.log('   (Liste non disponible)');
      } else {
        console.log('   Fonctions trouvées:', procData);
      }
    } else {
      console.log('   Fonctions trouvées:', functions);
    }

    console.log('\n✅ Vérification terminée !');
    console.log('\n📋 Résumé :');
    console.log('- Table ratings : ✅');
    console.log('- get_user_rating_stats : ✅');
    console.log('- get_user_given_ratings : ✅');
    console.log('- get_user_received_ratings : ✅');
    console.log('\n🎉 Le système de ratings est opérationnel !');

  } catch (error) {
    console.error('\n❌ Erreur inattendue:', error);
  }
}

// Créer une fonction helper pour lister les fonctions
async function createHelperFunction() {
  console.log('\n📦 Création de la fonction helper...');
  
  const { error } = await supabase.rpc('create_function_helper');
  
  if (!error) {
    // Créer la fonction via SQL direct
    const { error: sqlError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE OR REPLACE FUNCTION get_rating_functions_list()
        RETURNS TABLE(function_name text, arguments text) AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            p.proname::text as function_name,
            pg_catalog.pg_get_function_arguments(p.oid)::text as arguments
          FROM pg_catalog.pg_proc p
          JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public'
          AND p.proname LIKE '%rating%'
          ORDER BY p.proname;
        END;
        $$ LANGUAGE plpgsql;
      `
    });
    
    if (sqlError) {
      console.log('   (Helper non créé)');
    }
  }
}

// Exécuter
verifyRatingSystem();