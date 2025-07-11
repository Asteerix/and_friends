import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import NetInfo from '@react-native-community/netinfo';

interface NetworkStore {
  isConnected: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  networkType: string | null;
  isInternetReachable: boolean | null;
  lastChecked: number;
  
  // Actions
  setConnected: (connected: boolean) => void;
  setConnectionQuality: (quality: NetworkStore['connectionQuality']) => void;
  setNetworkType: (type: string | null) => void;
  setInternetReachable: (reachable: boolean | null) => void;
  updateLastChecked: () => void;
  updateNetworkState: (state: any) => void;
  
  // Helpers
  isSlowConnection: () => boolean;
  shouldRetry: () => boolean;
}

export const useNetworkStore = create<NetworkStore>()(
  subscribeWithSelector((set, get) => ({
    isConnected: true,
    connectionQuality: 'good',
    networkType: null,
    isInternetReachable: true,
    lastChecked: Date.now(),
    
    setConnected: (connected) => set({ isConnected: connected }),
    setConnectionQuality: (quality) => set({ connectionQuality: quality }),
    setNetworkType: (type) => set({ networkType: type }),
    setInternetReachable: (reachable) => set({ isInternetReachable: reachable }),
    updateLastChecked: () => set({ lastChecked: Date.now() }),
    
    updateNetworkState: (state) => {
      const store = get();
      store.setConnected(state.isConnected ?? false);
      store.setNetworkType(state.type);
      store.setInternetReachable(state.isInternetReachable);
      store.updateLastChecked();
      
      // Determine connection quality
      let quality: NetworkStore['connectionQuality'] = 'good';
      
      if (!state.isConnected) {
        quality = 'offline';
      } else if (state.type === 'cellular') {
        const cellularGeneration = state.details?.cellularGeneration;
        
        switch (cellularGeneration?.toLowerCase()) {
          case '2g':
          case 'slow-2g':
            quality = 'poor';
            break;
          case '3g':
            quality = 'fair';
            break;
          case '4g':
            quality = 'good';
            break;
          case '5g':
            quality = 'excellent';
            break;
          default:
            quality = 'fair';
        }
      } else if (state.type === 'wifi') {
        quality = 'excellent';
      } else if (state.type === 'ethernet') {
        quality = 'excellent';
      }
      
      store.setConnectionQuality(quality);
    },
    
    isSlowConnection: () => {
      const state = get();
      return state.connectionQuality === 'poor' || state.connectionQuality === 'fair';
    },
    
    shouldRetry: () => {
      const state = get();
      return state.isConnected && state.isInternetReachable !== false;
    }
  }))
);

// Initialize network monitoring
let unsubscribe: (() => void) | null = null;

export function initializeNetworkMonitoring() {
  if (unsubscribe) return;
  
  unsubscribe = NetInfo.addEventListener(state => {
    const store = useNetworkStore.getState();
    
    store.setConnected(state.isConnected ?? false);
    store.setNetworkType(state.type);
    store.setInternetReachable(state.isInternetReachable);
    store.updateLastChecked();
    
    // Determine connection quality based on network type and details
    let quality: NetworkStore['connectionQuality'] = 'good';
    
    if (!state.isConnected) {
      quality = 'offline';
    } else if (state.type === 'cellular') {
      const cellularGeneration = (state.details as any)?.cellularGeneration;
      
      switch (cellularGeneration?.toLowerCase()) {
        case '2g':
        case 'slow-2g':
          quality = 'poor';
          break;
        case '3g':
          quality = 'fair';
          break;
        case '4g':
          quality = 'good';
          break;
        case '5g':
          quality = 'excellent';
          break;
        default:
          quality = 'fair'; // Unknown cellular
      }
    } else if (state.type === 'wifi') {
      quality = 'excellent';
    } else if (state.type === 'ethernet') {
      quality = 'excellent';
    }
    
    store.setConnectionQuality(quality);
  });
}

export function stopNetworkMonitoring() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}