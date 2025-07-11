import { useNetworkQuality } from '../../hooks/useNetworkQuality';
import { useNetworkStore } from '../../stores/networkStore';

export interface TimeoutConfig {
  base: number;
  slowMultiplier: number;
  maxTimeout: number;
}

const DEFAULT_CONFIG: TimeoutConfig = {
  base: 10000, // 10 secondes
  slowMultiplier: 3,
  maxTimeout: 60000, // 1 minute max
};

/**
 * Calcule un timeout adaptatif basé sur la qualité de la connexion
 * @param config Configuration du timeout
 * @returns Timeout en millisecondes
 */
export function getAdaptiveTimeout(config: Partial<TimeoutConfig> = {}): number {
  const { base, slowMultiplier, maxTimeout } = { ...DEFAULT_CONFIG, ...config };
  const { connectionQuality } = useNetworkStore.getState();
  const isSlowConnection = connectionQuality === 'poor';
  
  const timeout = isSlowConnection ? base * slowMultiplier : base;
  return Math.min(timeout, maxTimeout);
}

/**
 * Hook pour obtenir un timeout adaptatif
 * @param baseTimeout Timeout de base en millisecondes
 * @returns Timeout adapté à la connexion
 */
export function useAdaptiveTimeout(baseTimeout: number = 10000): number {
  const { isSlowConnection } = useNetworkQuality();
  return isSlowConnection ? baseTimeout * 3 : baseTimeout;
}

/**
 * Crée des headers avec timeout adaptatif pour Supabase Edge Functions
 * @param baseTimeout Timeout de base
 * @param isSlowConnection Optional: passer manuellement l'état de connexion
 * @returns Headers avec timeout
 */
export function createTimeoutHeaders(baseTimeout: number = 15000, isSlowConnection?: boolean): Record<string, string> {
  const timeout = isSlowConnection !== undefined 
    ? (isSlowConnection ? baseTimeout * 3 : baseTimeout)
    : getAdaptiveTimeout({ base: baseTimeout });
  return {
    'x-timeout': timeout.toString(),
    'x-connection-quality': timeout > baseTimeout ? 'slow' : 'normal',
  };
}