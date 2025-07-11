import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { generalCache, userCache, eventCache, imageCache } from '@/shared/utils/cache/cacheManager';
import { useOfflineSync } from '@/shared/hooks/useOfflineSync';
import { useNetworkStore } from '@/shared/stores/networkStore';

interface CacheStatusWidgetProps {
  style?: any;
  onPress?: () => void;
}

export const CacheStatusWidget: React.FC<CacheStatusWidgetProps> = ({ style, onPress }) => {
  const [cacheSize, setCacheSize] = useState(0);
  const { pendingOperations, isOnline } = useOfflineSync();
  const connectionQuality = useNetworkStore(state => state.connectionQuality);

  useEffect(() => {
    const updateCacheSize = () => {
      const totalSize = 
        generalCache.getCacheSize() +
        userCache.getCacheSize() +
        eventCache.getCacheSize() +
        imageCache.getCacheSize();
      
      setCacheSize(totalSize);
    };

    updateCacheSize();
    const interval = setInterval(updateCacheSize, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getConnectionIcon = () => {
    switch (connectionQuality) {
      case 'excellent':
        return 'wifi';
      case 'good':
        return 'cellular';
      case 'fair':
      case 'poor':
        return 'cellular-outline';
      case 'offline':
        return 'cloud-offline';
      default:
        return 'help-circle';
    }
  };

  const getConnectionColor = () => {
    switch (connectionQuality) {
      case 'excellent':
      case 'good':
        return '#4CAF50';
      case 'fair':
        return '#FF9800';
      case 'poor':
        return '#F44336';
      case 'offline':
        return '#9E9E9E';
      default:
        return '#666';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.row}>
        <View style={styles.item}>
          <Ionicons 
            name={getConnectionIcon()} 
            size={16} 
            color={getConnectionColor()} 
          />
          <Text style={[styles.text, { color: getConnectionColor() }]}>
            {connectionQuality}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.item}>
          <Ionicons name="server" size={16} color="#666" />
          <Text style={styles.text}>
            {formatSize(cacheSize)}
          </Text>
        </View>

        {pendingOperations > 0 && (
          <>
            <View style={styles.divider} />
            <View style={styles.item}>
              <Ionicons name="sync" size={16} color="#FF9800" />
              <Text style={[styles.text, styles.pending]}>
                {pendingOperations}
              </Text>
            </View>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 8,
  },
  pending: {
    color: '#FF9800',
  },
});