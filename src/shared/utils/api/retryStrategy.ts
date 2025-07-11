import { NetworkRetry } from '../networkRetry';
import { Alert } from 'react-native';

interface ResilientFetchOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  timeout?: number;
  showAlert?: boolean;
  alertTitle?: string;
  alertMessage?: string;
  onRetry?: (attempt: number, error: any) => void;
}

/**
 * Fetch resilient qui gère automatiquement les retry et les erreurs réseau
 */
export async function resilientFetch<T>(
  fn: () => Promise<T>,
  options: ResilientFetchOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    timeout = 30000,
    showAlert = true,
    alertTitle = 'Erreur de connexion',
    alertMessage = 'Vérifiez votre connexion internet et réessayez.',
    onRetry
  } = options;

  try {
    const result = await NetworkRetry.withRetry(fn, {
      maxRetries,
      initialDelay,
      maxDelay,
      backoffFactor,
      timeout,
      onRetry
    });

    return result;
  } catch (error: any) {
    // Si on doit afficher une alerte
    if (showAlert) {
      const isNetworkError = error.message?.includes('Network') || 
                           error.message?.includes('fetch') ||
                           error.message?.includes('timeout');

      if (isNetworkError) {
        Alert.alert(
          alertTitle,
          alertMessage,
          [{ text: 'OK' }]
        );
      }
    }

    throw error;
  }
}

/**
 * Créer une fonction fetch résiliente avec configuration par défaut
 */
export function createResilientFetch<T>(
  defaultOptions?: ResilientFetchOptions
): (fn: () => Promise<T>, overrideOptions?: ResilientFetchOptions) => Promise<T> {
  return (fn: () => Promise<T>, overrideOptions?: ResilientFetchOptions) => {
    const options = { ...defaultOptions, ...overrideOptions };
    return resilientFetch(fn, options);
  };
}

/**
 * Hook pour utiliser resilientFetch avec des options par défaut selon le contexte
 */
export function useResilientFetch(contextOptions?: ResilientFetchOptions) {
  return <T>(fn: () => Promise<T>, options?: ResilientFetchOptions) => {
    return resilientFetch(fn, { ...contextOptions, ...options });
  };
}
