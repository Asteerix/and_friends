const fs = require('fs');
const path = require('path');

// Liste des fichiers à vérifier
const filesToFix = [
  '/Users/asteerix/Desktop/and_friends/src/features/profile/screens/EditProfileScreen.tsx',
  '/Users/asteerix/Desktop/and_friends/src/features/settings/screens/SettingsScreen.tsx',
  '/Users/asteerix/Desktop/and_friends/src/features/settings/screens/PreferencesScreen.tsx',
  '/Users/asteerix/Desktop/and_friends/src/app/screens/activities.tsx',
];

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Supprimer les imports React dupliqués
    content = content.replace(/import React[^;]*;\s*\nimport React[^;]*;/g, (match) => {
      const lines = match.split('\n');
      return lines[0] + ';';
    });
    
    // Supprimer les imports de react-native-safe-area-context dupliqués
    content = content.replace(/import\s*{\s*SafeAreaView\s*}\s*from\s*'react-native-safe-area-context';\s*\nimport\s*{\s*SafeAreaView\s*}\s*from\s*'react-native-safe-area-context';/g, 
      "import { SafeAreaView } from 'react-native-safe-area-context';");
    
    // Supprimer les imports dupliqués de hooks et composants locaux
    const importRegex = /^import\s+.*$/gm;
    const imports = content.match(importRegex) || [];
    const uniqueImports = [];
    const seenImports = new Set();
    
    imports.forEach(imp => {
      const key = imp.replace(/\s+/g, ' ').trim();
      if (!seenImports.has(key)) {
        seenImports.add(key);
        uniqueImports.push(imp);
      }
    });
    
    // Supprimer les lignes d'import orphelines (} from 'react-native';)
    content = content.replace(/^\s*}\s*from\s*['"][^'"]+['"];\s*$/gm, '');
    
    // Corriger les imports React Native mal formés
    content = content.replace(/^\s*(\w+,?\s*)+\s*}\s*from\s*'react-native';\s*$/gm, (match) => {
      const components = match.match(/(\w+)/g) || [];
      const filtered = components.filter(c => c !== 'from' && c !== 'react' && c !== 'native');
      if (filtered.length > 0) {
        return `import {\n  ${filtered.join(',\n  ')}\n} from 'react-native';`;
      }
      return '';
    });
    
    // Supprimer les doubles void
    content = content.replace(/void\s+void\s+/g, 'void ');
    
    // Supprimer les points-virgules en trop après les interfaces
    content = content.replace(/}\s*;\s*;/g, '}');
    content = content.replace(/interface\s+(\w+)\s*{([^}]+)}\s*;/g, 'interface $1 {$2}');
    
    // Corriger les lignes "No newline at end of file" qui se retrouvent dans le code
    content = content.replace(/^.*No newline at end of file.*$/gm, '');
    
    // S'assurer qu'il n'y a pas de lignes vides multiples
    content = content.replace(/\n\n\n+/g, '\n\n');
    
    // Ajouter une nouvelle ligne à la fin si nécessaire
    if (!content.endsWith('\n')) {
      content += '\n';
    }
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Corrigé: ${path.basename(filePath)}`);
    
  } catch (error) {
    console.error(`❌ Erreur lors du traitement de ${filePath}:`, error.message);
  }
}

// Corriger chaque fichier
filesToFix.forEach(fixFile);

console.log('\n✨ Correction finale terminée!');