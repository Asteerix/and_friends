#!/usr/bin/env node

/**
 * Script de vérification de l'intégration du système de paramètres
 * Vérifie que tous les composants sont correctement connectés
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = join(__dirname, '..');

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return null;
  }
}

// Vérifications à effectuer
const checks = [
  {
    name: 'Migration SQL pour la colonne settings',
    check: () => {
      const migrationPath = join(rootDir, 'supabase/migrations/20250707190000_add_settings_to_profiles.sql');
      const content = readFile(migrationPath);
      
      if (!content) {
        return { success: false, message: 'Migration manquante' };
      }
      
      const hasSettingsColumn = content.includes('ADD COLUMN settings JSONB');
      const hasDefaultValues = content.includes('"event_invites": true');
      
      if (!hasSettingsColumn || !hasDefaultValues) {
        return { success: false, message: 'Migration incomplète' };
      }
      
      return { success: true, message: 'Migration correcte' };
    }
  },
  
  {
    name: 'Types TypeScript dans user/types.ts',
    check: () => {
      const typesPath = join(rootDir, 'src/entities/user/types.ts');
      const content = readFile(typesPath);
      
      if (!content) {
        return { success: false, message: 'Fichier types.ts manquant' };
      }
      
      const hasSettingsType = content.includes('settings?:') || content.includes('settings:');
      
      if (!hasSettingsType) {
        return { success: false, message: 'Type settings manquant dans UserProfile' };
      }
      
      return { success: true, message: 'Types correctement définis' };
    }
  },
  
  {
    name: 'Hook useProfile gère les settings',
    check: () => {
      const hookPath = join(rootDir, 'src/hooks/useProfile.ts');
      const content = readFile(hookPath);
      
      if (!content) {
        return { success: false, message: 'Hook useProfile manquant' };
      }
      
      const fetchesSettings = content.includes('settings: data.settings');
      const updatesSettings = content.includes('settings: updates.settings');
      
      if (!fetchesSettings || !updatesSettings) {
        return { success: false, message: 'useProfile ne gère pas correctement les settings' };
      }
      
      return { success: true, message: 'useProfile gère correctement les settings' };
    }
  },
  
  {
    name: 'SettingsScreen utilise AsyncStorage',
    check: () => {
      const screenPath = join(rootDir, 'src/features/settings/screens/SettingsScreen.tsx');
      const content = readFile(screenPath);
      
      if (!content) {
        return { success: false, message: 'SettingsScreen manquant' };
      }
      
      const importsAsyncStorage = content.includes("import AsyncStorage from '@react-native-async-storage/async-storage'");
      const savesToAsyncStorage = content.includes('AsyncStorage.setItem(SETTINGS_STORAGE_KEY');
      const loadsFromAsyncStorage = content.includes('AsyncStorage.getItem(SETTINGS_STORAGE_KEY');
      
      if (!importsAsyncStorage || !savesToAsyncStorage || !loadsFromAsyncStorage) {
        return { success: false, message: 'AsyncStorage non utilisé correctement' };
      }
      
      return { success: true, message: 'AsyncStorage correctement intégré' };
    }
  },
  
  {
    name: 'SettingsScreen sauvegarde dans Supabase',
    check: () => {
      const screenPath = join(rootDir, 'src/features/settings/screens/SettingsScreen.tsx');
      const content = readFile(screenPath);
      
      if (!content) {
        return { success: false, message: 'SettingsScreen manquant' };
      }
      
      const updatesSupabase = content.includes("supabase\n        .from('profiles')\n        .update({");
      const callsUpdateProfile = content.includes('updateProfile({ settings: updatedSettings })');
      
      if (!updatesSupabase || !callsUpdateProfile) {
        return { success: false, message: 'Sauvegarde Supabase incomplète' };
      }
      
      return { success: true, message: 'Sauvegarde Supabase correcte' };
    }
  },
  
  {
    name: 'Fonctions SQL de vérification des paramètres',
    check: () => {
      const migrationPath = join(rootDir, 'supabase/migrations/20250707180000_add_notification_settings_check.sql');
      const content = readFile(migrationPath);
      
      if (!content) {
        return { success: false, message: 'Migration des fonctions SQL manquante' };
      }
      
      const hasShouldSend = content.includes('CREATE OR REPLACE FUNCTION should_send_notification');
      const hasCanInvite = content.includes('CREATE OR REPLACE FUNCTION can_invite_to_event');
      const hasIsHidden = content.includes('CREATE OR REPLACE FUNCTION is_profile_hidden_from_search');
      
      if (!hasShouldSend || !hasCanInvite || !hasIsHidden) {
        return { success: false, message: 'Fonctions SQL incomplètes' };
      }
      
      return { success: true, message: 'Fonctions SQL correctement définies' };
    }
  },
  
  {
    name: 'Synchronisation temps réel dans useProfile',
    check: () => {
      const hookPath = join(rootDir, 'src/hooks/useProfile.ts');
      const content = readFile(hookPath);
      
      if (!content) {
        return { success: false, message: 'Hook useProfile manquant' };
      }
      
      const hasRealtimeSubscription = content.includes('.channel(`profile:${session.user.id}`)');
      const subscribesToUpdates = content.includes("event: 'UPDATE'");
      
      if (!hasRealtimeSubscription || !subscribesToUpdates) {
        return { success: false, message: 'Synchronisation temps réel manquante' };
      }
      
      return { success: true, message: 'Synchronisation temps réel configurée' };
    }
  },
  
  {
    name: 'Gestion des erreurs dans SettingsScreen',
    check: () => {
      const screenPath = join(rootDir, 'src/features/settings/screens/SettingsScreen.tsx');
      const content = readFile(screenPath);
      
      if (!content) {
        return { success: false, message: 'SettingsScreen manquant' };
      }
      
      const hasTryCatch = content.includes('try {') && content.includes('} catch (error)');
      const showsErrorAlert = content.includes("Alert.alert('Error'");
      const logsErrors = content.includes("console.error('Error");
      
      if (!hasTryCatch || !showsErrorAlert || !logsErrors) {
        return { success: false, message: 'Gestion des erreurs incomplète' };
      }
      
      return { success: true, message: 'Gestion des erreurs correcte' };
    }
  },
  
  {
    name: 'Valeurs par défaut cohérentes',
    check: () => {
      const screenPath = join(rootDir, 'src/features/settings/screens/SettingsScreen.tsx');
      const migrationPath = join(rootDir, 'supabase/migrations/20250707190000_add_settings_to_profiles.sql');
      
      const screenContent = readFile(screenPath);
      const migrationContent = readFile(migrationPath);
      
      if (!screenContent || !migrationContent) {
        return { success: false, message: 'Fichiers manquants' };
      }
      
      // Vérifier que les valeurs par défaut sont les mêmes
      const screenDefaults = {
        event_invites: screenContent.includes('event_invites ?? true'),
        friend_requests: screenContent.includes('friend_requests ?? false'),
        who_can_invite: screenContent.includes("who_can_invite ?? 'Public'")
      };
      
      const migrationDefaults = {
        event_invites: migrationContent.includes('"event_invites": true'),
        friend_requests: migrationContent.includes('"friend_requests": true'), // Note: différent !
        who_can_invite: migrationContent.includes('"who_can_invite": "Public"')
      };
      
      if (screenDefaults.friend_requests !== migrationDefaults.friend_requests) {
        return { 
          success: false, 
          message: 'Incohérence: friend_requests par défaut différent entre l\'app et la DB' 
        };
      }
      
      return { success: true, message: 'Valeurs par défaut cohérentes' };
    }
  },
  
  {
    name: 'Package AsyncStorage installé',
    check: () => {
      const packagePath = join(rootDir, 'package.json');
      const content = readFile(packagePath);
      
      if (!content) {
        return { success: false, message: 'package.json manquant' };
      }
      
      const packageJson = JSON.parse(content);
      const hasAsyncStorage = packageJson.dependencies?.['@react-native-async-storage/async-storage'] ||
                            packageJson.devDependencies?.['@react-native-async-storage/async-storage'];
      
      if (!hasAsyncStorage) {
        return { success: false, message: 'Package AsyncStorage non installé' };
      }
      
      return { success: true, message: 'AsyncStorage installé' };
    }
  }
];

// Exécuter toutes les vérifications
async function runChecks() {
  log('\n🔍 Vérification de l\'intégration du système de paramètres\n', 'bright');
  
  let totalChecks = 0;
  let passedChecks = 0;
  const issues = [];
  
  for (const checkItem of checks) {
    totalChecks++;
    process.stdout.write(`  Vérification: ${checkItem.name}... `);
    
    try {
      const result = checkItem.check();
      
      if (result.success) {
        log(`✅ ${result.message}`, 'green');
        passedChecks++;
      } else {
        log(`❌ ${result.message}`, 'red');
        issues.push({
          check: checkItem.name,
          issue: result.message
        });
      }
    } catch (error) {
      log(`❌ Erreur: ${error.message}`, 'red');
      issues.push({
        check: checkItem.name,
        issue: error.message
      });
    }
  }
  
  // Résumé
  log(`\n📊 Résumé: ${passedChecks}/${totalChecks} vérifications réussies\n`, 'bright');
  
  if (issues.length > 0) {
    log('⚠️  Problèmes détectés:', 'yellow');
    issues.forEach(issue => {
      log(`  • ${issue.check}: ${issue.issue}`, 'yellow');
    });
    
    log('\n💡 Recommandations:', 'cyan');
    
    // Recommandations spécifiques
    if (issues.some(i => i.check.includes('Migration SQL'))) {
      log('  1. Exécutez la migration: npx supabase db push', 'cyan');
    }
    
    if (issues.some(i => i.issue.includes('friend_requests par défaut'))) {
      log('  2. Alignez les valeurs par défaut entre l\'app et la DB', 'cyan');
    }
    
    if (issues.some(i => i.check.includes('AsyncStorage non installé'))) {
      log('  3. Installez AsyncStorage: npm install @react-native-async-storage/async-storage', 'cyan');
    }
    
    return false;
  } else {
    log('✨ Tout est correctement configuré !', 'green');
    return true;
  }
}

// Exécuter les vérifications
runChecks()
  .then(success => {
    if (success) {
      log('\n🎉 Le système de paramètres est prêt à l\'emploi !\n', 'green');
      process.exit(0);
    } else {
      log('\n⚠️  Corrigez les problèmes avant d\'utiliser le système de paramètres.\n', 'yellow');
      process.exit(1);
    }
  })
  .catch(error => {
    log(`\n💥 Erreur inattendue: ${error.message}\n`, 'red');
    process.exit(1);
  });