const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Map of components to their import sources
const componentMap = {
  // React Native components
  View: 'react-native',
  Text: 'react-native',
  ScrollView: 'react-native',
  TouchableOpacity: 'react-native',
  TextInput: 'react-native',
  ActivityIndicator: 'react-native',
  RefreshControl: 'react-native',
  Image: 'react-native',
  StyleSheet: 'react-native',
  Pressable: 'react-native',
  FlatList: 'react-native',
  KeyboardAvoidingView: 'react-native',
  Modal: 'react-native',
  Alert: 'react-native',
  Platform: 'react-native',
  Dimensions: 'react-native',
  Animated: 'react-native',
  
  // React hooks
  useState: 'react',
  useEffect: 'react',
  useCallback: 'react',
  useMemo: 'react',
  useRef: 'react',
  
  // Expo components
  Audio: 'expo-av',
  Video: 'expo-av',
};

function getUsedComponents(content) {
  const used = new Set();
  
  // Find JSX tags
  const jsxRegex = /<([A-Z][a-zA-Z]*)/g;
  let match;
  while ((match = jsxRegex.exec(content)) !== null) {
    if (componentMap[match[1]]) {
      used.add(match[1]);
    }
  }
  
  // Find direct references
  Object.keys(componentMap).forEach(comp => {
    const regex = new RegExp(`\\b${comp}\\b`, 'g');
    if (regex.test(content)) {
      used.add(comp);
    }
  });
  
  return used;
}

function getExistingImports(content) {
  const imports = {};
  const importRegex = /import\s*{([^}]+)}\s*from\s*['"]([^'"]+)['"]/g;
  const defaultImportRegex = /import\s+(\w+)\s+from\s*['"]([^'"]+)['"]/g;
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const source = match[2];
    const components = match[1].split(',').map(s => s.trim()).filter(Boolean);
    imports[source] = components;
  }
  
  return imports;
}

function fixImportsInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const usedComponents = getUsedComponents(content);
  const existingImports = getExistingImports(content);
  
  // Group components by source
  const neededImports = {};
  usedComponents.forEach(comp => {
    const source = componentMap[comp];
    if (source) {
      if (!neededImports[source]) {
        neededImports[source] = new Set();
      }
      neededImports[source].add(comp);
    }
  });
  
  // Check what's missing
  const missingImports = {};
  Object.entries(neededImports).forEach(([source, comps]) => {
    const existing = new Set(existingImports[source] || []);
    const missing = Array.from(comps).filter(c => !existing.has(c));
    if (missing.length > 0) {
      missingImports[source] = missing;
    }
  });
  
  if (Object.keys(missingImports).length === 0) {
    return false;
  }
  
  // Add missing imports
  let hasChanges = false;
  const newLines = [];
  let importInserted = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (!importInserted && (line.includes('import') || line.trim() === '')) {
      // Find the right place to insert imports
      if (i === 0 || (i > 0 && !lines[i-1].includes('import'))) {
        // Insert missing imports here
        Object.entries(missingImports).forEach(([source, comps]) => {
          if (existingImports[source]) {
            // Update existing import
            const existingLine = lines.findIndex(l => l.includes(`from '${source}'`) || l.includes(`from "${source}"`));
            if (existingLine >= 0) {
              const allComps = [...existingImports[source], ...comps].sort();
              lines[existingLine] = `import { ${allComps.join(', ')} } from '${source}';`;
            }
          } else {
            // Add new import
            newLines.push(`import { ${comps.sort().join(', ')} } from '${source}';`);
            hasChanges = true;
          }
        });
        importInserted = true;
      }
    }
    
    newLines.push(line);
  }
  
  if (hasChanges) {
    fs.writeFileSync(filePath, newLines.join('\n'));
    return true;
  } else if (Object.keys(missingImports).length > 0) {
    // Need to update existing imports
    fs.writeFileSync(filePath, lines.join('\n'));
    return true;
  }
  
  return false;
}

// Main function
function fixAllMissingImports() {
  const files = glob.sync('src/**/*.{ts,tsx}', {
    cwd: path.resolve(__dirname, '..'),
    absolute: true
  });
  
  let fixedCount = 0;
  
  for (const file of files) {
    if (fixImportsInFile(file)) {
      fixedCount++;
      console.log(`Fixed imports in: ${path.relative(process.cwd(), file)}`);
    }
  }
  
  console.log(`\nFixed imports in ${fixedCount} files`);
}

fixAllMissingImports();