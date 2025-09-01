import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { errorLogger } from '../../utils/errorLogger';
import { startupLogger } from '../../utils/startupLogger';

// Get Supabase configuration with multiple fallbacks
const getSupabaseConfig = () => {
  const sources = [
    {
      url: Constants.expoConfig?.extra?.supabaseUrl,
      key: Constants.expoConfig?.extra?.supabaseAnonKey,
      source: 'expo.extra',
    },
    {
      url: process.env.EXPO_PUBLIC_SUPABASE_URL,
      key: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      source: 'env',
    },
  ];

  for (const config of sources) {
    if (config.url && config.key) {
      startupLogger.log(`Using Supabase config from ${config.source}`, 'info');
      return { url: String(config.url), key: String(config.key) };
    }
  }

  return { url: '', key: '' };
};

const { url: supabaseUrl, key: supabaseAnonKey } = getSupabaseConfig();

// Validate configuration
const isConfigValid =
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey.length > 50;

if (!isConfigValid) {
  const error = new Error('Invalid Supabase configuration');
  errorLogger.log(error, { supabaseUrl: !!supabaseUrl, supabaseAnonKey: !!supabaseAnonKey });
  startupLogger.log('Supabase configuration invalid', 'error', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlValid: supabaseUrl?.startsWith('https://'),
    keyLength: supabaseAnonKey?.length,
  });
} else {
  startupLogger.log('Supabase configuration validated', 'info', {
    url: supabaseUrl.slice(0, 30) + '...',
    keyPreview: supabaseAnonKey.slice(0, 20) + '...',
  });
}

// Create Supabase client with error handling
let supabase: SupabaseClient;

try {
  if (!isConfigValid) {
    throw new Error('Invalid Supabase configuration - using dummy client');
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'x-client-info': 'andfriends-app/1.0.0',
      },
    },
    db: {
      schema: 'public',
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  startupLogger.log('Supabase client created successfully', 'info');
} catch (error) {
  const err = error as Error;
  errorLogger.log(err, { context: 'supabase client creation' });
  startupLogger.log('Failed to create Supabase client', 'error', err);

  // Create a dummy client that will fail gracefully
  supabase = {
    auth: {
      getSession: async () => ({
        data: { session: null },
        error: new Error('Supabase not initialized'),
      }),
      signInWithOtp: async () => ({ data: null, error: new Error('Supabase not initialized') }),
      verifyOtp: async () => ({ data: null, error: new Error('Supabase not initialized') }),
      signOut: async () => ({ error: new Error('Supabase not initialized') }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: async () => ({ data: null, error: new Error('Supabase not initialized') }),
      insert: async () => ({ data: null, error: new Error('Supabase not initialized') }),
      update: async () => ({ data: null, error: new Error('Supabase not initialized') }),
      delete: async () => ({ data: null, error: new Error('Supabase not initialized') }),
    }),
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: new Error('Supabase not initialized') }),
        download: async () => ({ data: null, error: new Error('Supabase not initialized') }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  } as any;
}

export { supabase };

// Test connection only if properly initialized
if (isConfigValid) {
  // Delay test to avoid blocking startup
  setTimeout(async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        errorLogger.log(error, { context: 'supabase session test' });
        startupLogger.log('Supabase session test failed', 'warning', error);
      } else {
        startupLogger.log('Supabase connection test successful', 'info', {
          hasSession: !!data.session,
          userId: data.session?.user?.id,
        });
      }
    } catch (err) {
      const error = err as Error;
      errorLogger.log(error, { context: 'supabase connection test' });
      startupLogger.log('Supabase connection test error', 'error', error);
    }
  }, 1000);
}

// Export validation status
export const isSupabaseConfigured = isConfigValid;
