const fs = require('fs');
const path = require('path');

// Liste des fichiers à corriger
const filesToFix = [
  '/Users/asteerix/Desktop/and_friends/src/app/screens/activities.tsx',
  '/Users/asteerix/Desktop/and_friends/src/app/screens/calendar-month.tsx',
  '/Users/asteerix/Desktop/and_friends/src/app/screens/chat.tsx',
  '/Users/asteerix/Desktop/and_friends/src/app/screens/conversation.tsx',
  '/Users/asteerix/Desktop/and_friends/src/app/screens/conversations-list.tsx',
  '/Users/asteerix/Desktop/and_friends/src/app/screens/create-event-advanced.tsx',
  '/Users/asteerix/Desktop/and_friends/src/app/screens/create-event.tsx',
  '/Users/asteerix/Desktop/and_friends/src/app/screens/create-story.tsx',
  '/Users/asteerix/Desktop/and_friends/src/app/screens/edit-cover.tsx',
  '/Users/asteerix/Desktop/and_friends/src/app/screens/event-details.tsx',
  '/Users/asteerix/Desktop/and_friends/src/app/screens/friends.tsx',
  '/Users/asteerix/Desktop/and_friends/src/app/screens/invite-friends.tsx',
  '/Users/asteerix/Desktop/and_friends/src/app/screens/map-ar.tsx',
  '/Users/asteerix/Desktop/and_friends/src/app/screens/map.tsx',
  '/Users/asteerix/Desktop/and_friends/src/app/screens/notifications-full.tsx',
  '/Users/asteerix/Desktop/and_friends/src/app/screens/notifications.tsx',
  '/Users/asteerix/Desktop/and_friends/src/app/screens/person-card.tsx',
  '/Users/asteerix/Desktop/and_friends/src/app/screens/poll.tsx',
  '/Users/asteerix/Desktop/and_friends/src/app/screens/rsvp-confirmation.tsx',
  '/Users/asteerix/Desktop/and_friends/src/app/screens/rsvp-management.tsx',
  '/Users/asteerix/Desktop/and_friends/src/app/screens/search-users.tsx',
  '/Users/asteerix/Desktop/and_friends/src/app/screens/stories.tsx',
];

// Fonction pour détecter les composants React Native utilisés dans le fichier
function detectUsedComponents(content) {
  const components = [
    'View',
    'Text',
    'ScrollView',
    'TouchableOpacity',
    'TextInput',
    'Image',
    'FlatList',
    'StyleSheet',
    'Alert',
    'ActivityIndicator',
    'RefreshControl',
    'KeyboardAvoidingView',
    'Platform',
    'Dimensions',
    'Modal',
    'Switch',
    'Pressable',
    'StatusBar',
  ];

  const usedComponents = [];
  
  components.forEach(comp => {
    // Recherche de l'utilisation du composant
    const regex = new RegExp(`<${comp}|${comp}\\.`, 'g');
    if (regex.test(content)) {
      usedComponents.push(comp);
    }
  });

  return usedComponents;
}

// Fonction pour corriger les imports
function fixImports(content) {
  // Détecter les composants utilisés
  const usedComponents = detectUsedComponents(content);
  
  // Vérifier si il y a déjà un import de react-native
  const hasReactNativeImport = /import\s+{[^}]+}\s+from\s+['"]react-native['"]/.test(content);
  
  if (usedComponents.length > 0 && !hasReactNativeImport) {
    // Trouver la position pour insérer l'import
    const reactImportMatch = content.match(/import\s+React[^;]*;/);
    if (reactImportMatch) {
      const insertPosition = reactImportMatch.index + reactImportMatch[0].length;
      const importStatement = `\nimport {\n  ${usedComponents.join(',\n  ')},\n} from 'react-native';`;
      
      content = content.slice(0, insertPosition) + importStatement + content.slice(insertPosition);
    }
  } else if (hasReactNativeImport && usedComponents.length > 0) {
    // Mettre à jour l'import existant
    content = content.replace(
      /import\s+{([^}]+)}\s+from\s+['"]react-native['"];?/,
      (match, imports) => {
        const existingImports = imports.split(',').map(i => i.trim()).filter(Boolean);
        const allImports = [...new Set([...existingImports, ...usedComponents])];
        return `import {\n  ${allImports.join(',\n  ')},\n} from 'react-native';`;
      }
    );
  }

  // Corriger les imports duplicatas ou mal formés
  content = content.replace(/import\s+{\s*\n\s*import\s+{/, 'import {');
  
  // S'assurer que les imports sont correctement ordonnés selon ESLint
  const lines = content.split('\n');
  const importGroups = {
    react: [],
    reactNative: [],
    externalPackages: [],
    expoPackages: [],
    localPackages: [],
    relativeImports: [],
  };

  let inImportSection = false;
  let importSectionStart = -1;
  let importSectionEnd = -1;

  lines.forEach((line, index) => {
    if (line.startsWith('import ')) {
      if (!inImportSection) {
        inImportSection = true;
        importSectionStart = index;
      }
      
      if (line.includes('from \'react\'') || line.includes('from "react"')) {
        importGroups.react.push(line);
      } else if (line.includes('from \'react-native') || line.includes('from "react-native')) {
        importGroups.reactNative.push(line);
      } else if (line.includes('from \'expo') || line.includes('from "expo') || line.includes('from \'@expo')) {
        importGroups.expoPackages.push(line);
      } else if (line.includes('from \'@/') || line.includes('from "@/')) {
        importGroups.localPackages.push(line);
      } else if (line.includes('from \'./') || line.includes('from "../') || line.includes('from "..') || line.includes('from "./')) {
        importGroups.relativeImports.push(line);
      } else {
        importGroups.externalPackages.push(line);
      }
    } else if (inImportSection && !line.trim().startsWith('//') && line.trim() !== '') {
      inImportSection = false;
      importSectionEnd = index - 1;
    }
  });

  if (importSectionEnd === -1 && inImportSection) {
    // Trouver la fin de la section d'import
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].startsWith('import ')) {
        importSectionEnd = i;
        break;
      }
    }
  }

  // Reconstruire les imports dans le bon ordre
  const orderedImports = [
    ...importGroups.react,
    ...importGroups.reactNative,
    '',
    ...importGroups.externalPackages.sort(),
    '',
    ...importGroups.expoPackages.sort(),
    '',
    ...importGroups.localPackages.sort(),
    ...importGroups.relativeImports.sort(),
  ].filter((line, index, arr) => {
    // Éviter les lignes vides multiples
    if (line === '') {
      return index === 0 || arr[index - 1] !== '';
    }
    return true;
  });

  // Remplacer la section d'import
  if (importSectionStart !== -1 && importSectionEnd !== -1) {
    lines.splice(importSectionStart, importSectionEnd - importSectionStart + 1, ...orderedImports);
    content = lines.join('\n');
  }

  return content;
}

// Fonction pour corriger les problèmes courants
function fixCommonIssues(content) {
  // Ajouter les points-virgules manquants à la fin des imports
  content = content.replace(/^(import\s+.*from\s+['"][^'"]+['"])$/gm, '$1;');
  
  // Corriger les espaces doubles
  content = content.replace(/\n\n\n+/g, '\n\n');
  
  // S'assurer que les guillemets sont simples pour les imports
  content = content.replace(/from\s+"([^"]+)"/g, "from '$1'");
  
  // Corriger l'indentation (2 espaces)
  const lines = content.split('\n');
  let indentLevel = 0;
  const fixedLines = lines.map(line => {
    const trimmed = line.trim();
    
    if (trimmed.endsWith('{') && !trimmed.startsWith('//')) {
      const result = '  '.repeat(indentLevel) + trimmed;
      indentLevel++;
      return result;
    } else if (trimmed.startsWith('}')) {
      indentLevel = Math.max(0, indentLevel - 1);
      return '  '.repeat(indentLevel) + trimmed;
    } else if (trimmed) {
      return '  '.repeat(indentLevel) + trimmed;
    }
    return line;
  });
  
  return fixedLines.join('\n');
}

// Traiter chaque fichier
filesToFix.forEach(filePath => {
  try {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Appliquer les corrections
      content = fixImports(content);
      content = fixCommonIssues(content);
      
      // Écrire le fichier corrigé
      fs.writeFileSync(filePath, content);
      console.log(`✅ Corrigé: ${path.basename(filePath)}`);
    } else {
      console.log(`❌ Fichier non trouvé: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Erreur lors du traitement de ${filePath}:`, error.message);
  }
});

console.log('\n✨ Correction des erreurs de linting terminée!');