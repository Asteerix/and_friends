import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Log de test Supabase au démarrage
console.log('🚀 [SUPABASE INIT] Configuration de Supabase:');
console.log('  - URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MANQUANTE ❌');
console.log('  - Anon Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MANQUANTE ❌');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ [SUPABASE INIT] Configuration Supabase manquante! Vérifiez vos variables d\'environnement.');
  console.error('  - EXPO_PUBLIC_SUPABASE_URL:', !!process.env.EXPO_PUBLIC_SUPABASE_URL);
  console.error('  - EXPO_PUBLIC_SUPABASE_ANON_KEY:', !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
} else {
  console.log('✅ [SUPABASE INIT] Configuration Supabase trouvée!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Test de connexion Supabase au démarrage
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('❌ [SUPABASE TEST] Erreur lors de la récupération de la session:', error);
  } else {
    console.log('✅ [SUPABASE TEST] Connexion réussie!');
    console.log('  - Session existante:', !!data.session);
    if (data.session) {
      console.log('  - User ID:', data.session.user.id);
    }
  }
}).catch((err) => {
  console.error('❌ [SUPABASE TEST] Erreur critique:', err);
});