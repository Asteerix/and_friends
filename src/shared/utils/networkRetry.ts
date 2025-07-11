import NetInfo from '@react-native-community/netinfo';

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  timeout?: number;
  onRetry?: (attempt: number, error: any) => void;
  shouldRetry?: (error: Error) => boolean;
}

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
}

interface RetryResult<T> {
  data?: T;
  error?: Error;
  attempts: number;
  success: boolean;
}

/**
 * Smart retry logic with network awareness
 */
export class NetworkRetry {
  /**
   * Check current network status
   */
  static async checkNetwork(): Promise<NetworkState> {
    const state = await NetInfo.fetch();
    return {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? false,
      type: state.type
    };
  }
  
  /**
   * Wait for network to be available
   */
  static async waitForNetwork(timeoutMs: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const network = await this.checkNetwork();
      
      if (network.isConnected && network.isInternetReachable) {
        return true;
      }
      
      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return false;
  }
  
  /**
   * Execute function with smart retry logic
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      backoffFactor = 2,
      timeout = 30000,
      onRetry
    } = options;
    
    let lastError: any;
    let delay = initialDelay;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Check network before attempting
        const network = await this.checkNetwork();
        
        if (!network.isConnected) {
          console.log('🔄 [NetworkRetry] Waiting for network...');
          const networkAvailable = await this.waitForNetwork(10000);
          
          if (!networkAvailable) {
            throw new Error('No network connection available');
          }
        }
        
        // Execute function with timeout
        const result = await Promise.race([
          fn(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          )
        ]);
        
        return result;
        
      } catch (error: any) {
        lastError = error;
        
        console.log(`❌ [NetworkRetry] Attempt ${attempt + 1} failed:`, error.message);
        
        if (attempt < maxRetries) {
          // Check if error is retryable
          if (this.isRetryableError(error)) {
            if (onRetry) {
              onRetry(attempt + 1, error);
            }
            
            console.log(`⏳ [NetworkRetry] Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Exponential backoff
            delay = Math.min(delay * backoffFactor, maxDelay);
          } else {
            // Non-retryable error, fail immediately
            throw error;
          }
        }
      }
    }
    
    throw lastError;
  }
  
  /**
   * Check if error is retryable
   */
  private static isRetryableError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    
    // Network errors
    if (message.includes('network') || 
        message.includes('fetch') ||
        message.includes('timeout') ||
        message.includes('connection')) {
      return true;
    }
    
    // Server errors (5xx)
    if (error.status >= 500 && error.status < 600) {
      return true;
    }
    
    // Rate limiting (429)
    if (error.status === 429) {
      return true;
    }
    
    // Don't retry client errors (4xx except 429)
    if (error.status >= 400 && error.status < 500) {
      return false;
    }
    
    // Don't retry validation errors
    if (message.includes('invalid') || 
        message.includes('validation') ||
        message.includes('format')) {
      return false;
    }
    
    // Default to retry for unknown errors
    return true;
  }
  
  /**
   * Create a network-aware promise
   */
  static async networkAwarePromise<T>(
    promise: Promise<T>,
    timeoutMs: number = 30000
  ): Promise<T> {
    const network = await this.checkNetwork();
    
    if (!network.isConnected) {
      throw new Error('No network connection');
    }
    
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Network request timeout'));
        }, timeoutMs);
      })
    ]);
  }
}

/**
 * Fonction utilitaire pour retry avec backoff exponentiel
 * @example
 * const result = await networkRetry(
 *   () => supabase.from('users').select(),
 *   { maxRetries: 3, onRetry: (attempt) => console.log(`Retry ${attempt}`) }
 * );
 */
export async function networkRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    onRetry,
    shouldRetry = defaultShouldRetry
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const data = await fn();
      return {
        data,
        attempts: attempt,
        success: true
      };
    } catch (error) {
      lastError = error as Error;

      // Vérifier si on doit réessayer
      if (!shouldRetry(lastError)) {
        break;
      }

      // Si c'est la dernière tentative, on ne fait pas de délai
      if (attempt > maxRetries) {
        break;
      }

      // Callback de retry
      if (onRetry) {
        onRetry(attempt, lastError);
      }

      // Attendre avec backoff exponentiel
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Augmenter le délai pour la prochaine tentative
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  return {
    error: lastError!,
    attempts: maxRetries + 1,
    success: false
  };
}

/**
 * Détermine si une erreur doit déclencher un retry
 */
function defaultShouldRetry(error: Error): boolean {
  // Erreurs réseau
  if (error.message.includes('Network') || 
      error.message.includes('fetch') ||
      error.message.includes('Failed to fetch')) {
    return true;
  }

  // Erreurs de timeout
  if (error.message.includes('timeout') || 
      error.message.includes('Timeout')) {
    return true;
  }

  // Erreurs serveur temporaires (5xx)
  if ('status' in error && typeof error.status === 'number') {
    return error.status >= 500 && error.status < 600;
  }

  // Erreur 429 (Too Many Requests)
  if ('status' in error && error.status === 429) {
    return true;
  }

  return false;
}

/**
 * Wrapper pour requêtes avec retry automatique et gestion réseau
 * @example
 * const data = await withNetworkRetry(
 *   () => supabase.from('users').select(),
 *   { maxRetries: 5 }
 * );
 */
export async function withNetworkRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const result = await networkRetry(fn, options);
  
  if (result.success && result.data !== undefined) {
    return result.data;
  }
  
  throw result.error || new Error('Unknown error');
}

/**
 * Créer une fonction avec retry intégré
 * @example
 * const fetchUsers = createRetryableFunction(
 *   () => supabase.from('users').select(),
 *   { maxRetries: 3 }
 * );
 * 
 * const users = await fetchUsers();
 */
export function createRetryableFunction<T>(
  fn: () => Promise<T>,
  defaultOptions?: RetryOptions
): (overrideOptions?: RetryOptions) => Promise<T> {
  return (overrideOptions?: RetryOptions) => {
    const options = { ...defaultOptions, ...overrideOptions };
    return withNetworkRetry(fn, options);
  };
}