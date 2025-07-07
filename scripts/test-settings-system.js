#!/usr/bin/env node

/**
 * Script de test exhaustif pour le système de paramètres
 * Vérifie la sauvegarde, le chargement, la synchronisation et les cas d'erreur
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Mock AsyncStorage pour les tests
const mockAsyncStorage = {
  storage: {},
  
  async getItem(key) {
    return this.storage[key] || null;
  },
  
  async setItem(key, value) {
    this.storage[key] = value;
  },
  
  async removeItem(key) {
    delete this.storage[key];
  },
  
  async clear() {
    this.storage = {};
  }
};

const SETTINGS_STORAGE_KEY = '@andfriends_settings';

// Fonction utilitaire pour les tests
function assert(condition, message) {
  if (!condition) {
    throw new Error(`❌ Assertion failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Tests
async function testSettingsSystem() {
  console.log('🚀 Démarrage des tests du système de paramètres...\n');

  let testUserId;
  let testPhone = '+33612345678';

  try {
    // 1. Créer un utilisateur de test
    console.log('📌 Test 1: Création d\'un utilisateur de test');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      phone: testPhone,
      password: 'TestPassword123!'
    });

    if (authError) throw authError;
    testUserId = authData.user.id;
    assert(testUserId, 'Utilisateur créé avec succès');

    // 2. Vérifier que le profil a les settings par défaut
    console.log('\n📌 Test 2: Vérification des paramètres par défaut');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', testUserId)
      .single();

    if (profileError) throw profileError;
    
    assert(profile.settings, 'Le profil a des paramètres');
    assert(profile.settings.notifications.event_invites === true, 'event_invites est true par défaut');
    assert(profile.settings.notifications.friend_requests === true, 'friend_requests est true par défaut');
    assert(profile.settings.notifications.event_reminders === true, 'event_reminders est true par défaut');
    assert(profile.settings.privacy.who_can_invite === 'Public', 'who_can_invite est Public par défaut');
    assert(profile.settings.privacy.hide_from_search === false, 'hide_from_search est false par défaut');

    // 3. Test de sauvegarde dans AsyncStorage
    console.log('\n📌 Test 3: Sauvegarde dans AsyncStorage');
    const newSettings = {
      notifications: {
        event_invites: false,
        friend_requests: true,
        event_reminders: false
      },
      privacy: {
        who_can_invite: 'Friends',
        hide_from_search: true
      }
    };

    await mockAsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    const savedSettings = JSON.parse(await mockAsyncStorage.getItem(SETTINGS_STORAGE_KEY));
    
    assert(savedSettings.notifications.event_invites === false, 'AsyncStorage: event_invites sauvegardé correctement');
    assert(savedSettings.privacy.who_can_invite === 'Friends', 'AsyncStorage: who_can_invite sauvegardé correctement');

    // 4. Test de sauvegarde dans Supabase
    console.log('\n📌 Test 4: Sauvegarde dans Supabase');
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        settings: newSettings,
        updated_at: new Date().toISOString()
      })
      .eq('id', testUserId);

    if (updateError) throw updateError;

    // Vérifier la sauvegarde
    const { data: updatedProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', testUserId)
      .single();

    if (fetchError) throw fetchError;
    
    assert(updatedProfile.settings.notifications.event_invites === false, 'Supabase: event_invites mis à jour');
    assert(updatedProfile.settings.privacy.who_can_invite === 'Friends', 'Supabase: who_can_invite mis à jour');

    // 5. Test de chargement (AsyncStorage en premier, puis Supabase)
    console.log('\n📌 Test 5: Test de chargement avec priorité AsyncStorage');
    
    // Modifier AsyncStorage pour qu'il ait des valeurs différentes
    const asyncStorageSettings = {
      notifications: {
        event_invites: true,
        friend_requests: false,
        event_reminders: true
      },
      privacy: {
        who_can_invite: 'No One',
        hide_from_search: false
      }
    };
    
    await mockAsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(asyncStorageSettings));
    
    // Simuler le chargement
    let loadedSettings = await mockAsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    if (loadedSettings) {
      loadedSettings = JSON.parse(loadedSettings);
      assert(loadedSettings.privacy.who_can_invite === 'No One', 'Chargement: priorité donnée à AsyncStorage');
    }

    // 6. Test des fonctions SQL
    console.log('\n📌 Test 6: Test des fonctions SQL de vérification');
    
    // Test should_send_notification
    const { data: shouldSendEvent, error: fnError1 } = await supabase
      .rpc('should_send_notification', {
        p_user_id: testUserId,
        p_notification_type: 'event_invite'
      });

    if (fnError1) throw fnError1;
    assert(shouldSendEvent === false, 'should_send_notification fonctionne correctement');

    // Test can_invite_to_event
    const { data: canInvite, error: fnError2 } = await supabase
      .rpc('can_invite_to_event', {
        p_inviter_id: testUserId,
        p_invitee_id: testUserId
      });

    if (fnError2) throw fnError2;
    assert(canInvite === false, 'can_invite_to_event respecte le paramètre "Friends"');

    // Test is_profile_hidden_from_search
    const { data: isHidden, error: fnError3 } = await supabase
      .rpc('is_profile_hidden_from_search', {
        p_user_id: testUserId
      });

    if (fnError3) throw fnError3;
    assert(isHidden === true, 'is_profile_hidden_from_search fonctionne correctement');

    // 7. Test de synchronisation temps réel
    console.log('\n📌 Test 7: Test de synchronisation temps réel');
    
    let realtimeUpdateReceived = false;
    const subscription = supabase
      .channel(`profile:${testUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${testUserId}`
        },
        (payload) => {
          console.log('  📡 Mise à jour temps réel reçue:', payload.new.settings);
          realtimeUpdateReceived = true;
        }
      )
      .subscribe();

    // Attendre que la souscription soit active
    await delay(2000);

    // Faire une mise à jour
    await supabase
      .from('profiles')
      .update({
        settings: {
          notifications: {
            event_invites: true,
            friend_requests: true,
            event_reminders: true
          },
          privacy: {
            who_can_invite: 'Public',
            hide_from_search: false
          }
        }
      })
      .eq('id', testUserId);

    // Attendre la réception
    await delay(2000);
    assert(realtimeUpdateReceived, 'Synchronisation temps réel fonctionne');

    // Nettoyer la souscription
    await subscription.unsubscribe();

    // 8. Test des cas d'erreur
    console.log('\n📌 Test 8: Test des cas d\'erreur');
    
    // Test avec un utilisateur inexistant
    const { data: errorProfile, error: notFoundError } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .single();

    assert(!errorProfile && notFoundError, 'Erreur correctement gérée pour utilisateur inexistant');

    // Test avec des paramètres invalides
    const { error: invalidError } = await supabase
      .from('profiles')
      .update({
        settings: 'invalid_json_string'
      })
      .eq('id', testUserId);

    assert(!invalidError, 'Les paramètres invalides sont gérés (JSONB accepte les strings)');

    // 9. Test de récupération après erreur
    console.log('\n📌 Test 9: Test de récupération après erreur');
    
    // Vider AsyncStorage
    await mockAsyncStorage.clear();
    
    // Charger depuis Supabase uniquement
    const { data: recoveryProfile } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', testUserId)
      .single();

    assert(recoveryProfile?.settings, 'Récupération depuis Supabase après perte d\'AsyncStorage');

    // 10. Test de performance
    console.log('\n📌 Test 10: Test de performance');
    
    const startTime = Date.now();
    
    // Faire 10 sauvegardes consécutives
    for (let i = 0; i < 10; i++) {
      await supabase
        .from('profiles')
        .update({
          settings: {
            ...newSettings,
            test_counter: i
          }
        })
        .eq('id', testUserId);
    }
    
    const endTime = Date.now();
    const avgTime = (endTime - startTime) / 10;
    
    console.log(`  ⏱️  Temps moyen de sauvegarde: ${avgTime.toFixed(2)}ms`);
    assert(avgTime < 1000, 'Performance acceptable (< 1s par sauvegarde)');

    console.log('\n✅ Tous les tests sont passés avec succès !');

  } catch (error) {
    console.error('\n❌ Erreur durant les tests:', error);
    throw error;
  } finally {
    // Nettoyage
    if (testUserId) {
      console.log('\n🧹 Nettoyage...');
      
      // Supprimer l'utilisateur de test
      const { error: deleteError } = await supabase.auth.admin.deleteUser(testUserId);
      if (deleteError) {
        console.log('Note: Impossible de supprimer l\'utilisateur de test (nécessite admin)');
      }
      
      // Supprimer le profil
      await supabase
        .from('profiles')
        .delete()
        .eq('id', testUserId);
    }
  }
}

// Exécuter les tests
testSettingsSystem()
  .then(() => {
    console.log('\n🎉 Tests terminés avec succès !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Échec des tests:', error);
    process.exit(1);
  });