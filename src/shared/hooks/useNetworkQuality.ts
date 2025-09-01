import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import { useNetworkStore } from '../stores/networkStore';

interface NetworkQuality {
  isSlowConnection: boolean;
  isOffline: boolean;
  networkType: NetInfoStateType;
  isConnectionExpensive: boolean;
  effectiveType?: string;
}

interface NetworkQualityMetrics {
  latency: number;
  bandwidth: number;
  packetLoss: number;
  jitter: number;
}

interface UseNetworkQualityResult extends NetworkQuality {
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  metrics: NetworkQualityMetrics | null;
  isTestingQuality: boolean;
  testQuality: () => Promise<void>;
}

/**
 * Hook pour monitorer la qualité réseau avec tests de performance
 * @returns {UseNetworkQualityResult} État complet de la connexion réseau
 * @example
 * const { isSlowConnection, isOffline, quality, testQuality } = useNetworkQuality();
 */
export function useNetworkQuality(): UseNetworkQualityResult {
  const { isConnected, connectionQuality } = useNetworkStore();
  const [networkState, setNetworkState] = useState<NetworkQuality>({
    isSlowConnection: false,
    isOffline: false,
    networkType: NetInfoStateType.unknown,
    isConnectionExpensive: false,
  });
  const [metrics, setMetrics] = useState<NetworkQualityMetrics | null>(null);
  const [isTestingQuality, setIsTestingQuality] = useState(false);
  const [quality, setQuality] = useState<UseNetworkQualityResult['quality']>('good');

  const testQuality = async () => {
    if (!isConnected) {
      setQuality('offline');
      return;
    }

    setIsTestingQuality(true);

    try {
      // Test de latence (ping)
      const latency = await testLatency();

      // Test de bande passante
      const bandwidth = await testBandwidth();

      // Estimation du packet loss et jitter
      const { packetLoss, jitter } = await testNetworkStability();

      const newMetrics: NetworkQualityMetrics = {
        latency,
        bandwidth,
        packetLoss,
        jitter,
      };

      setMetrics(newMetrics);

      // Calcul de la qualité globale
      const calculatedQuality = calculateQuality(newMetrics);
      setQuality(calculatedQuality);
    } catch (error) {
      console.error('Network quality test failed:', error);
      setQuality('poor');
    } finally {
      setIsTestingQuality(false);
    }
  };

  useEffect(() => {
    const handleNetworkChange = (state: NetInfoState) => {
      const slowTypes = ['2g', '3g', 'slow-2g'];
      const cellularGeneration = (state.details as any)?.cellularGeneration;
      const isConnectionExpensive = (state.details as any)?.isConnectionExpensive || false;

      setNetworkState({
        isSlowConnection:
          (cellularGeneration && slowTypes.includes(cellularGeneration.toLowerCase())) ||
          isConnectionExpensive ||
          (state.type === NetInfoStateType.cellular && !cellularGeneration),
        isOffline: !state.isConnected,
        networkType: state.type,
        isConnectionExpensive,
        effectiveType: cellularGeneration,
      });
    };

    // Obtenir l'état initial
    NetInfo.fetch().then(handleNetworkChange);

    // S'abonner aux changements
    const unsubscribe = NetInfo.addEventListener(handleNetworkChange);

    return () => {
      unsubscribe();
    };
  }, []);

  // Test initial au montage
  useEffect(() => {
    testQuality();
  }, [isConnected]);

  // Mise à jour de la qualité basée sur le store
  useEffect(() => {
    if (connectionQuality === 'offline') {
      setQuality('offline');
    }
  }, [connectionQuality]);

  return {
    ...networkState,
    quality,
    metrics,
    isTestingQuality,
    testQuality,
  };
}

async function testLatency(): Promise<number> {
  const startTime = Date.now();

  try {
    // Ping vers un serveur rapide (ex: Cloudflare DNS)
    await fetch('https://1.1.1.1/dns-query', {
      method: 'HEAD',
      mode: 'no-cors',
    });

    return Date.now() - startTime;
  } catch {
    // Fallback: test avec un autre serveur
    const fallbackStart = Date.now();
    await fetch('https://www.google.com/generate_204', {
      method: 'HEAD',
      mode: 'no-cors',
    });
    return Date.now() - fallbackStart;
  }
}

async function testBandwidth(): Promise<number> {
  const testImageUrl =
    'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png';
  const startTime = Date.now();

  try {
    const response = await fetch(testImageUrl);
    const blob = await response.blob();
    const duration = (Date.now() - startTime) / 1000; // en secondes
    const sizeInKB = blob.size / 1024;

    // Bande passante en KB/s
    return sizeInKB / duration;
  } catch {
    return 0;
  }
}

async function testNetworkStability(): Promise<{ packetLoss: number; jitter: number }> {
  const pingCount = 5;
  const latencies: number[] = [];
  let failures = 0;

  for (let i = 0; i < pingCount; i++) {
    try {
      const start = Date.now();
      await fetch('https://1.1.1.1/dns-query', {
        method: 'HEAD',
        mode: 'no-cors',
      });
      latencies.push(Date.now() - start);
    } catch {
      failures++;
    }

    // Petit délai entre les pings
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const packetLoss = (failures / pingCount) * 100;

  // Calcul du jitter (variation de latence)
  let jitter = 0;
  if (latencies.length > 1) {
    for (let i = 1; i < latencies.length; i++) {
      jitter += Math.abs(latencies[i] - latencies[i - 1]);
    }
    jitter = jitter / (latencies.length - 1);
  }

  return { packetLoss, jitter };
}

function calculateQuality(metrics: NetworkQualityMetrics): UseNetworkQualityResult['quality'] {
  const { latency, bandwidth, packetLoss, jitter } = metrics;

  // Critères de qualité
  if (latency < 50 && bandwidth > 1000 && packetLoss < 1 && jitter < 30) {
    return 'excellent';
  } else if (latency < 150 && bandwidth > 500 && packetLoss < 5 && jitter < 50) {
    return 'good';
  } else if (latency < 300 && bandwidth > 100 && packetLoss < 10 && jitter < 100) {
    return 'fair';
  } else {
    return 'poor';
  }
}
