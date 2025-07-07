import { PostgrestError } from '@supabase/supabase-js';

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
};

const NETWORK_ERROR_MESSAGES = [
  'Network request failed',
  'Failed to fetch',
  'NetworkError',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND',
];

function isNetworkError(error: any): boolean {
  const errorMessage = error?.message || error?.toString() || '';
  return NETWORK_ERROR_MESSAGES.some(msg => 
    errorMessage.toLowerCase().includes(msg.toLowerCase())
  );
}

export async function withNetworkRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries, retryDelay, exponentialBackoff } = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options,
  };

  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries!; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Only retry network errors
      if (!isNetworkError(error)) {
        throw error;
      }
      
      // Don't retry after the last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff if enabled
      const delay = exponentialBackoff 
        ? retryDelay! * Math.pow(2, attempt)
        : retryDelay!;
      
      console.log(`Network error, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // If we get here, all retries failed
  throw lastError;
}

// Wrapper for Supabase queries with network retry
export async function supabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  options?: RetryOptions
): Promise<{ data: T | null; error: PostgrestError | null }> {
  try {
    return await withNetworkRetry(queryFn, options);
  } catch (error) {
    // If it's a network error after all retries, return it in Supabase format
    if (isNetworkError(error)) {
      return {
        data: null,
        error: {
          message: 'Connexion au serveur impossible. Vérifie ta connexion internet.',
          details: (error as Error).message,
          hint: 'Network error',
          code: 'NETWORK_ERROR',
        } as unknown as PostgrestError,
      };
    }
    throw error;
  }
}