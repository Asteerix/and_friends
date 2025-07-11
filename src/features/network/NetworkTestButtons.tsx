import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useNetworkStore } from '@/shared/stores/networkStore';
import { cleanExpiredCache, getCacheSize } from '@/shared/utils/offlineCache';

/**
 * Composant de test pour simuler différentes conditions réseau
 * À utiliser uniquement en développement
 */
export function NetworkTestButtons() {
  const store = useNetworkStore();
  
  // Simuler différentes qualités de connexion
  const simulateNetworkQuality = (quality: typeof store.connectionQuality) => {
    store.setConnectionQuality(quality);
    store.updateLastChecked();
    Alert.alert('Test', `Connexion simulée: ${quality}`);
  };
  
  // Simuler offline
  const simulateOffline = () => {
    store.setConnected(false);
    store.setInternetReachable(false);
    store.setConnectionQuality('offline');
    Alert.alert('Test', 'Mode offline activé');
  };
  
  // Restaurer connexion
  const restoreConnection = () => {
    NetInfo.fetch().then(state => {
      store.setConnected(state.isConnected ?? true);
      store.setInternetReachable(state.isInternetReachable ?? true);
      store.setConnectionQuality('good');
    });
    Alert.alert('Test', 'Connexion restaurée');
  };
  
  // Nettoyer le cache
  const handleCleanCache = async () => {
    const sizeBefore = await getCacheSize();
    const removed = await cleanExpiredCache();
    const sizeAfter = await getCacheSize();
    
    Alert.alert(
      'Cache nettoyé',
      `Entrées supprimées: ${removed}\nTaille avant: ${(sizeBefore / 1024).toFixed(2)} KB\nTaille après: ${(sizeAfter / 1024).toFixed(2)} KB`
    );
  };
  
  if (__DEV__) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🧪 Tests Réseau (Dev)</Text>
        
        <View style={styles.row}>
          <TouchableOpacity 
            style={[styles.button, styles.excellentButton]}
            onPress={() => simulateNetworkQuality('excellent')}
          >
            <Text style={styles.buttonText}>5G/WiFi</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.goodButton]}
            onPress={() => simulateNetworkQuality('good')}
          >
            <Text style={styles.buttonText}>4G</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.fairButton]}
            onPress={() => simulateNetworkQuality('fair')}
          >
            <Text style={styles.buttonText}>3G</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.row}>
          <TouchableOpacity 
            style={[styles.button, styles.poorButton]}
            onPress={() => simulateNetworkQuality('poor')}
          >
            <Text style={styles.buttonText}>2G</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.offlineButton]}
            onPress={simulateOffline}
          >
            <Text style={styles.buttonText}>Offline</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.restoreButton]}
            onPress={restoreConnection}
          >
            <Text style={styles.buttonText}>Restore</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={[styles.button, styles.cacheButton]}
          onPress={handleCleanCache}
        >
          <Text style={styles.buttonText}>Nettoyer Cache</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return null; // Ne rien afficher en production
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 12,
    padding: 16,
    zIndex: 9999,
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  excellentButton: {
    backgroundColor: '#10B981',
  },
  goodButton: {
    backgroundColor: '#3B82F6',
  },
  fairButton: {
    backgroundColor: '#F59E0B',
  },
  poorButton: {
    backgroundColor: '#EF4444',
  },
  offlineButton: {
    backgroundColor: '#6B7280',
  },
  restoreButton: {
    backgroundColor: '#8B5CF6',
  },
  cacheButton: {
    backgroundColor: '#EC4899',
    marginTop: 8,
  },
});