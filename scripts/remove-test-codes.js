#!/usr/bin/env node

/**
 * Script pour supprimer automatiquement les codes de test OTP
 * Usage: node scripts/remove-test-codes.js
 */

const fs = require('fs').promises;
const path = require('path');

const FILES_TO_CHECK = [
  'src/features/auth/screens/PhoneVerificationScreen.tsx',
  'src/features/auth/screens/CodeVerificationScreen.tsx',
];

const TEST_PATTERNS = [
  // Pattern pour le numéro de test
  /\+33612345678/g,
  // Pattern pour le code de test
  /['"]123456['"]/g,
  // Pattern pour les blocs de code de test complets
  /\/\/\s*Mode test.*?(?=\n(?!\s*\/\/))/gs,
  // Pattern pour les conditions de test
  /if\s*\([^)]*\+33612345678[^)]*\)\s*{[^}]*}/gs,
];

async function removeTestCodes() {
  console.log('🔍 Recherche et suppression des codes de test OTP...\n');

  for (const filePath of FILES_TO_CHECK) {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      const content = await fs.readFile(fullPath, 'utf8');
      let modifiedContent = content;
      let hasChanges = false;

      // Vérifier si le fichier contient des codes de test
      const hasTestCode = TEST_PATTERNS.some(pattern => pattern.test(content));

      if (hasTestCode) {
        console.log(`📄 Fichier: ${filePath}`);
        console.log('   ⚠️  Codes de test trouvés');

        // Créer une sauvegarde
        const backupPath = `${fullPath}.backup.${Date.now()}`;
        await fs.writeFile(backupPath, content);
        console.log(`   ✅ Sauvegarde créée: ${path.basename(backupPath)}`);

        // Appliquer les suppressions
        TEST_PATTERNS.forEach(pattern => {
          const matches = content.match(pattern);
          if (matches) {
            modifiedContent = modifiedContent.replace(pattern, '');
            hasChanges = true;
            console.log(`   🔧 Suppression de: ${matches.length} occurrence(s)`);
          }
        });

        if (hasChanges) {
          // Nettoyer les lignes vides multiples
          modifiedContent = modifiedContent.replace(/\n\s*\n\s*\n/g, '\n\n');
          
          // Écrire le fichier modifié
          await fs.writeFile(fullPath, modifiedContent);
          console.log('   ✅ Fichier nettoyé avec succès\n');
        }
      } else {
        console.log(`✅ ${filePath} - Aucun code de test trouvé\n`);
      }
    } catch (error) {
      console.error(`❌ Erreur avec ${filePath}: ${error.message}\n`);
    }
  }

  console.log('\n📋 Résumé:');
  console.log('- Les codes de test ont été recherchés dans tous les fichiers');
  console.log('- Des sauvegardes ont été créées pour les fichiers modifiés');
  console.log('- Vérifiez les modifications avant de commiter');
  console.log('\n⚠️  IMPORTANT: Testez l\'application après ces modifications!');
}

// Exécuter le script
removeTestCodes().catch(console.error);