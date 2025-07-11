import { useEffect, ReactNode } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useNetworkStore } from '../stores/networkStore';

interface NetworkProviderProps {
  children: ReactNode;
}

/**
 * Provider qui monitore l'état réseau en temps réel
 * @example
 * <NetworkProvider>
 *   <App />
 * </NetworkProvider>
 */
export function NetworkProvider({ children }: NetworkProviderProps) {
  const updateNetworkState = useNetworkStore(s => s.updateNetworkState);
  
  useEffect(() => {
    // Check initial
    NetInfo.fetch().then(updateNetworkState);
    
    // Listener pour changements
    const unsubscribe = NetInfo.addEventListener(updateNetworkState);
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [updateNetworkState]);
  
  return <>{children}</>;
}