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
  '/Users/asteerix/Desktop/and_friends/src/features/profile/screens/EditProfileScreen.tsx',
  '/Users/asteerix/Desktop/and_friends/src/features/settings/screens/SettingsScreen.tsx',
  '/Users/asteerix/Desktop/and_friends/src/features/settings/screens/PreferencesScreen.tsx',
];

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Détecter les hooks React utilisés
    const reactHooks = [];
    const hookPatterns = [
      'useState',
      'useEffect',
      'useCallback',
      'useMemo',
      'useRef',
      'useReducer',
      'useContext',
      'useLayoutEffect',
    ];
    
    hookPatterns.forEach(hook => {
      const regex = new RegExp(`\\b${hook}\\b`, 'g');
      if (regex.test(content)) {
        reactHooks.push(hook);
      }
    });
    
    // Supprimer tous les imports React existants
    content = content.replace(/^import\s+React[^;]*;?\s*$/gm, '');
    content = content.replace(/^import\s+{\s*[^}]*\s*}\s*from\s+['"]react['"];?\s*$/gm, '');
    content = content.replace(/^import\s+\*\s+as\s+React\s+from\s+['"]react['"];?\s*$/gm, '');
    
    // Supprimer les lignes vides multiples
    content = content.replace(/\n\n\n+/g, '\n\n');
    
    // Ajouter l'import React correct au début
    let reactImport = '';
    if (reactHooks.length > 0) {
      reactImport = `import React, { ${reactHooks.join(', ')} } from 'react';\n`;
    } else {
      reactImport = `import React from 'react';\n`;
    }
    
    // Trouver où insérer l'import React
    const lines = content.split('\n');
    let insertIndex = 0;
    
    // Si le fichier commence par des imports, insérer après la première ligne vide
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ') || lines[i].trim() === '') {
        continue;
      } else {
        insertIndex = i;
        break;
      }
    }
    
    // Insérer l'import React au bon endroit
    lines.splice(0, 0, reactImport);
    content = lines.join('\n');
    
    // Nettoyer les problèmes d'imports mal formés
    content = content.replace(/import\s+{\s*\n\s*import/g, 'import');
    content = content.replace(/^import\s+{[^}]*$/gm, (match) => {
      // Si une ligne d'import est incomplète, essayer de la compléter
      const nextLineMatch = content.match(new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^;]*;'));
      if (nextLineMatch) {
        return '';
      }
      return match;
    });
    
    // Supprimer les imports dupliqués
    const importRegex = /^import\s+.*$/gm;
    const imports = content.match(importRegex) || [];
    const uniqueImports = [...new Set(imports)];
    
    let contentWithoutImports = content.replace(importRegex, '');
    contentWithoutImports = contentWithoutImports.replace(/^\n+/, '');
    
    // Réorganiser les imports par catégories
    const reactImports = uniqueImports.filter(imp => imp.includes('from \'react\'') || imp.includes('from "react"'));
    const reactNativeImports = uniqueImports.filter(imp => imp.includes('react-native'));
    const expoImports = uniqueImports.filter(imp => imp.includes('expo'));
    const externalImports = uniqueImports.filter(imp => 
      !imp.includes('react') && 
      !imp.includes('expo') && 
      !imp.includes('@/') && 
      !imp.includes('./') && 
      !imp.includes('../')
    );
    const localImports = uniqueImports.filter(imp => imp.includes('@/'));
    const relativeImports = uniqueImports.filter(imp => imp.includes('./') || imp.includes('../'));
    
    // Reconstruire le fichier avec les imports organisés
    const organizedImports = [
      ...reactImports,
      ...reactNativeImports,
      '',
      ...externalImports.sort(),
      '',
      ...expoImports.sort(),
      '',
      ...localImports.sort(),
      ...relativeImports.sort(),
    ].filter((line, index, arr) => {
      // Éviter les lignes vides multiples
      if (line === '') {
        return index === 0 || arr[index - 1] !== '';
      }
      return true;
    });
    
    const finalContent = [
      ...organizedImports,
      '',
      contentWithoutImports
    ].join('\n');
    
    fs.writeFileSync(filePath, finalContent);
    console.log(`✅ Corrigé: ${path.basename(filePath)}`);
    
  } catch (error) {
    console.error(`❌ Erreur lors du traitement de ${filePath}:`, error.message);
  }
}

// Traiter chaque fichier
filesToFix.forEach(fixFile);

console.log('\n✨ Correction des imports React terminée!');