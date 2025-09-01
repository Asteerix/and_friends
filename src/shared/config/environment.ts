import Constants from 'expo-constants';

export interface EnvironmentConfig {
  ENV: 'development' | 'staging' | 'production';
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  ENABLE_DEBUG_FEATURES: boolean;
  ENABLE_TEST_ACCOUNTS: boolean;
  ENABLE_DETAILED_LOGGING: boolean;
  API_TIMEOUT: number;
  SENTRY_DSN?: string;
}

/**
 * Get environment configuration with strict validation
 * SECURITY: No test bypasses or hardcoded credentials in production
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const env = Constants.expoConfig?.extra?.ENV || process.env.NODE_ENV || 'development';

  // Get Supabase configuration
  const supabaseUrl =
    Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  // Validate required configuration
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(`Missing required Supabase configuration for ${env} environment`);
  }

  // Validate Supabase URL format
  if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
    throw new Error(`Invalid Supabase URL format: ${supabaseUrl}`);
  }

  // Validate key length (Supabase anon keys are typically >100 characters)
  if (supabaseKey.length < 50) {
    throw new Error(`Invalid Supabase key length: ${supabaseKey.length}`);
  }

  const config: EnvironmentConfig = {
    ENV: env as 'development' | 'staging' | 'production',
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: supabaseKey,

    // Feature flags based on environment
    ENABLE_DEBUG_FEATURES: env === 'development',
    ENABLE_TEST_ACCOUNTS: env === 'development' || env === 'staging',
    ENABLE_DETAILED_LOGGING: env !== 'production',

    // Environment-specific timeouts
    API_TIMEOUT: env === 'production' ? 10000 : 30000,

    // Optional configuration
    SENTRY_DSN: Constants.expoConfig?.extra?.sentryDsn || process.env.EXPO_PUBLIC_SENTRY_DSN,
  };

  // SECURITY: Log configuration validation (without sensitive data)
  console.log(`🔐 Environment: ${config.ENV}`);
  console.log(`📡 Supabase URL: ${config.SUPABASE_URL.slice(0, 30)}...`);
  console.log(`🔑 Supabase Key Length: ${config.SUPABASE_ANON_KEY.length} chars`);
  console.log(`🚀 Debug Features: ${config.ENABLE_DEBUG_FEATURES}`);
  console.log(`🧪 Test Accounts: ${config.ENABLE_TEST_ACCOUNTS}`);

  // CRITICAL SECURITY: Verify production environment is properly configured
  if (config.ENV === 'production') {
    if (config.ENABLE_DEBUG_FEATURES || config.ENABLE_DETAILED_LOGGING) {
      throw new Error('SECURITY ERROR: Debug features must be disabled in production');
    }

    if (config.SUPABASE_URL.includes('localhost') || config.SUPABASE_URL.includes('test')) {
      throw new Error('SECURITY ERROR: Production cannot use test/localhost Supabase URL');
    }
  }

  return config;
}

// Export singleton instance
export const ENV_CONFIG = getEnvironmentConfig();

// Export environment checkers
export const isDevelopment = () => ENV_CONFIG.ENV === 'development';
export const isStaging = () => ENV_CONFIG.ENV === 'staging';
export const isProduction = () => ENV_CONFIG.ENV === 'production';

// SECURITY: Test account creation helper (only in non-production)
export function canCreateTestAccounts(): boolean {
  return ENV_CONFIG.ENABLE_TEST_ACCOUNTS && !isProduction();
}

// SECURITY: Debug logging helper
export function canLogSensitiveData(): boolean {
  return ENV_CONFIG.ENABLE_DETAILED_LOGGING && !isProduction();
}
