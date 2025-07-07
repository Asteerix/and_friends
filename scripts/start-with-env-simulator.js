#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement depuis .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value && !line.startsWith('#')) {
      process.env[key.trim()] = value.trim().replace(/["']/g, '');
    }
  });
}

const simulatorName = process.env.DEFAULT_IOS_SIMULATOR || 'iPhone 16 Pro';

try {
  // Obtenir la liste des simulateurs
  const output = execSync('xcrun simctl list devices available', { encoding: 'utf8' });
  
  // Trouver l'UUID du simulateur
  const lines = output.split('\n');
  let simulatorUUID = null;
  
  for (const line of lines) {
    if (line.includes(simulatorName)) {
      const match = line.match(/([0-9A-F-]{36})/);
      if (match) {
        simulatorUUID = match[1];
        break;
      }
    }
  }
  
  if (!simulatorUUID) {
    console.error(`Simulateur '${simulatorName}' non trouvé`);
    console.log('Simulateurs disponibles:');
    console.log(execSync('xcrun simctl list devices available | grep iPhone', { encoding: 'utf8' }));
    process.exit(1);
  }
  
  console.log(`Démarrage du simulateur ${simulatorName}...`);
  
  // Démarrer le simulateur
  try {
    execSync(`xcrun simctl boot "${simulatorUUID}"`, { stdio: 'ignore' });
  } catch (e) {
    // Le simulateur est peut-être déjà démarré
  }
  
  // Ouvrir le simulateur
  execSync(`open -a Simulator --args -CurrentDeviceUDID "${simulatorUUID}"`);
  
  // Attendre un peu
  setTimeout(() => {
    // Lancer Expo
    const expo = spawn('pnpm', ['expo', 'start', '-c', '--reset-cache', '--ios'], {
      stdio: 'inherit',
      shell: true
    });
    
    expo.on('close', (code) => {
      process.exit(code);
    });
  }, 3000);
  
} catch (error) {
  console.error('Erreur:', error.message);
  process.exit(1);
}