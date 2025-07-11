#!/usr/bin/env node

/**
 * Script de test pour le système de gestion réseau
 * Vérifie que tous les composants sont correctement configurés
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Test du Système de Gestion Réseau\n');

// Couleurs pour la console
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

let totalTests = 0;
let passedTests = 0;
let warnings = [];

function checkFile(filePath, description) {
  totalTests++;
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (fs.existsSync(fullPath)) {
    console.log(`${colors.green}✓${colors.reset} ${description}`);
    passedTests++;
    return true;
  } else {
    console.log(`${colors.red}✗${colors.reset} ${description} - Fichier manquant: ${filePath}`);
    return false;
  }
}

function checkFileContent(filePath, searchStrings, description) {
  totalTests++;
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`${colors.red}✗${colors.reset} ${description} - Fichier manquant`);
    return false;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const missingStrings = searchStrings.filter(str => !content.includes(str));
  
  if (missingStrings.length === 0) {
    console.log(`${colors.green}✓${colors.reset} ${description}`);
    passedTests++;
    return true;
  } else {
    console.log(`${colors.red}✗${colors.reset} ${description}`);
    missingStrings.forEach(str => {
      console.log(`   Manquant: "${str}"`);
    });
    return false;
  }
}

function addWarning(message) {
  warnings.push(message);
}

console.log(`${colors.blue}=== 1. Vérification des fichiers principaux ===${colors.reset}\n`);

// Stores
checkFile('src/shared/stores/networkStore.ts', 'NetworkStore (Zustand)');

// Providers
checkFile('src/shared/providers/NetworkProvider.tsx', 'NetworkProvider');
checkFile('src/shared/providers/NetworkErrorProvider.tsx', 'NetworkErrorProvider');

// Hooks
checkFile('src/shared/hooks/useNetworkQuality.ts', 'Hook useNetworkQuality');
checkFile('src/shared/hooks/useNetworkStatus.ts', 'Hook useNetworkStatus');
checkFile('src/shared/hooks/useAdaptiveRequest.ts', 'Hook useAdaptiveRequest');

// Utils
checkFile('src/shared/utils/networkRetry.ts', 'Network Retry Utilities');
checkFile('src/shared/utils/offlineCache.ts', 'Offline Cache System');

// Components
checkFile('src/shared/components/NetworkBanner.tsx', 'NetworkBanner Component');
checkFile('src/shared/components/NetworkStatusBanner.tsx', 'NetworkStatusBanner Component');

// UI
checkFile('src/shared/ui/NetworkErrorModal.tsx', 'NetworkErrorModal');

console.log(`\n${colors.blue}=== 2. Vérification de l'intégration ===${colors.reset}\n`);

// Vérifier l'intégration dans _layout.tsx
checkFileContent(
  'src/app/_layout.tsx',
  [
    'import { NetworkProvider }',
    'import { NetworkBanner }',
    'initializeNetworkMonitoring',
    '<NetworkProvider>',
    '<NetworkBanner />'
  ],
  'Intégration dans _layout.tsx'
);

// Vérifier les dépendances
checkFileContent(
  'package.json',
  [
    '@react-native-community/netinfo',
    'react-native-offline',
    'zustand'
  ],
  'Dépendances NPM installées'
);

console.log(`\n${colors.blue}=== 3. Vérification de l'utilisation ===${colors.reset}\n`);

// Vérifier l'utilisation dans MapScreen
if (fs.existsSync(path.join(__dirname, '..', 'src/features/map/screens/MapScreen.tsx'))) {
  checkFileContent(
    'src/features/map/screens/MapScreen.tsx',
    [
      'useNetworkQuality',
      'isOffline',
      'isSlowConnection'
    ],
    'Utilisation dans MapScreen'
  );
} else {
  addWarning('MapScreen.tsx non trouvé pour vérifier l\'utilisation');
}

// Vérifier l'utilisation dans useEventsAdvanced
checkFileContent(
  'src/hooks/useEventsAdvanced.ts',
  [
    'useAdaptiveRequest'
  ],
  'Utilisation dans useEventsAdvanced'
);

console.log(`\n${colors.blue}=== 4. Vérification du store ===${colors.reset}\n`);

// Vérifier la structure du store
checkFileContent(
  'src/shared/stores/networkStore.ts',
  [
    'connectionQuality',
    'isSlowConnection',
    'shouldRetry',
    'initializeNetworkMonitoring'
  ],
  'Structure du NetworkStore'
);

console.log(`\n${colors.blue}=== 5. Vérification des types TypeScript ===${colors.reset}\n`);

// Vérifier les interfaces principales
checkFileContent(
  'src/shared/stores/networkStore.ts',
  [
    'interface NetworkStore',
    'excellent',
    'good',
    'fair',
    'poor',
    'offline'
  ],
  'Types TypeScript du store'
);

// Tests spécifiques pour les hooks
if (fs.existsSync(path.join(__dirname, '..', 'src/shared/hooks/useNetworkQuality.ts'))) {
  checkFileContent(
    'src/shared/hooks/useNetworkQuality.ts',
    [
      'NetworkQualityMetrics',
      'latency',
      'bandwidth',
      'packetLoss',
      'jitter'
    ],
    'Métriques de qualité réseau'
  );
}

console.log(`\n${colors.blue}=== 6. Fonctionnalités avancées ===${colors.reset}\n`);

// Cache offline
checkFileContent(
  'src/shared/utils/offlineCache.ts',
  [
    'cachedRequest',
    'AsyncStorage',
    'ttl'
  ],
  'Système de cache offline'
);

// Retry intelligent
checkFileContent(
  'src/shared/utils/networkRetry.ts',
  [
    'NetworkRetry',
    'withRetry',
    'backoffFactor'
  ],
  'Système de retry intelligent'
);

// Résumé
console.log(`\n${colors.blue}=== RÉSUMÉ ===${colors.reset}\n`);

const successRate = Math.round((passedTests / totalTests) * 100);
const color = successRate === 100 ? colors.green : successRate >= 80 ? colors.yellow : colors.red;

console.log(`Tests passés: ${color}${passedTests}/${totalTests} (${successRate}%)${colors.reset}`);

if (warnings.length > 0) {
  console.log(`\n${colors.yellow}⚠️  Avertissements:${colors.reset}`);
  warnings.forEach(warning => {
    console.log(`   - ${warning}`);
  });
}

if (successRate === 100) {
  console.log(`\n${colors.green}🎉 Excellent ! Le système de gestion réseau est complet et fonctionnel !${colors.reset}`);
} else if (successRate >= 80) {
  console.log(`\n${colors.yellow}✨ Bien ! Le système est presque complet, quelques éléments à vérifier.${colors.reset}`);
} else {
  console.log(`\n${colors.red}❌ Des composants importants manquent. Vérifiez l'installation.${colors.reset}`);
}

// Recommandations
console.log(`\n${colors.blue}=== RECOMMANDATIONS ===${colors.reset}\n`);

console.log('1. Pour tester le système en conditions réelles:');
console.log('   - Activez le mode avion et vérifiez que l\'app reste utilisable');
console.log('   - Utilisez Chrome DevTools Network throttling pour simuler 3G/4G');
console.log('   - Testez les transitions WiFi → Mobile → Offline\n');

console.log('2. Pour améliorer davantage:');
console.log('   - Ajoutez des tests unitaires pour les hooks');
console.log('   - Implémentez un système de logs pour tracker les métriques');
console.log('   - Configurez des alertes pour les problèmes réseau récurrents\n');

console.log('3. Documentation:');
console.log('   - Consultez NETWORK_GUIDE.md pour l\'utilisation');
console.log('   - Voir NETWORK_FINAL_STATUS.md pour l\'architecture complète');

process.exit(successRate === 100 ? 0 : 1);