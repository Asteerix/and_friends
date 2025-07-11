import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { generalCache, userCache, eventCache } from '@/shared/utils/cache/cacheManager';
import { imageCacheManager } from '@/shared/utils/cache/imageCache';
import { useClearCache } from '@/shared/hooks/useCache';
import { useOfflineSync } from '@/shared/hooks/useOfflineSync';
import { useOfflineQueue } from '@/shared/hooks/useOfflineQueue';

export const CacheDebugPanel: React.FC = () => {
  const [cacheInfo, setCacheInfo] = useState({
    general: { totalSize: 0, itemCount: 0, maxSize: 0 },
    user: { totalSize: 0, itemCount: 0, maxSize: 0 },
    event: { totalSize: 0, itemCount: 0, maxSize: 0 },
    image: { totalSize: 0, fileCount: 0, maxSize: 0 },
  });

  const { clearAll } = useClearCache();
  const syncStatus = useOfflineSync();
  const { pendingCount, failedCount, clearQueue, retryFailedActions } = useOfflineQueue();

  useEffect(() => {
    const updateCacheInfo = async () => {
      const [imageInfo] = await Promise.all([
        imageCacheManager.getCacheInfo(),
      ]);

      setCacheInfo({
        general: generalCache.getCacheInfo(),
        user: userCache.getCacheInfo(),
        event: eventCache.getCacheInfo(),
        image: imageInfo,
      });
    };

    updateCacheInfo();
    const interval = setInterval(updateCacheInfo, 2000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const clearAllCaches = () => {
    Alert.alert(
      'Clear All Caches',
      'This will remove all cached data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            clearAll();
            await imageCacheManager.clearCache();
            Alert.alert('Success', 'All caches cleared');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Cache Debug Panel</Text>

      {/* Network Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Network Status</Text>
        <View style={styles.row}>
          <Text>Status:</Text>
          <Text style={[
            styles.status,
            { color: syncStatus.isOnline ? '#4CAF50' : '#F44336' }
          ]}>
            {syncStatus.isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      {/* Offline Queue */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Offline Queue</Text>
        <View style={styles.row}>
          <Text>Pending Operations:</Text>
          <Text style={styles.value}>{pendingCount}</Text>
        </View>
        <View style={styles.row}>
          <Text>Failed Operations:</Text>
          <Text style={[styles.value, failedCount > 0 && styles.error]}>
            {failedCount}
          </Text>
        </View>
        {syncStatus.isSyncing && (
          <Text style={styles.syncing}>Syncing...</Text>
        )}
        <View style={styles.actions}>
          {failedCount > 0 && (
            <TouchableOpacity
              style={[styles.button, styles.retryButton]}
              onPress={retryFailedActions}
            >
              <Text style={styles.buttonText}>Retry Failed</Text>
            </TouchableOpacity>
          )}
          {(pendingCount > 0 || failedCount > 0) && (
            <TouchableOpacity
              style={[styles.button, styles.clearButton]}
              onPress={() => {
                Alert.alert(
                  'Clear Queue',
                  'This will remove all pending operations. Are you sure?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Clear', style: 'destructive', onPress: clearQueue },
                  ]
                );
              }}
            >
              <Text style={styles.buttonText}>Clear Queue</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Cache Sizes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cache Sizes</Text>
        
        <View style={styles.cacheItem}>
          <Text style={styles.cacheName}>General Cache</Text>
          <Text>{cacheInfo.general.itemCount} items</Text>
          <Text>{formatBytes(cacheInfo.general.totalSize)} / {formatBytes(cacheInfo.general.maxSize)}</Text>
        </View>

        <View style={styles.cacheItem}>
          <Text style={styles.cacheName}>User Cache</Text>
          <Text>{cacheInfo.user.itemCount} items</Text>
          <Text>{formatBytes(cacheInfo.user.totalSize)} / {formatBytes(cacheInfo.user.maxSize)}</Text>
        </View>

        <View style={styles.cacheItem}>
          <Text style={styles.cacheName}>Event Cache</Text>
          <Text>{cacheInfo.event.itemCount} items</Text>
          <Text>{formatBytes(cacheInfo.event.totalSize)} / {formatBytes(cacheInfo.event.maxSize)}</Text>
        </View>

        <View style={styles.cacheItem}>
          <Text style={styles.cacheName}>Image Cache</Text>
          <Text>{cacheInfo.image.fileCount} files</Text>
          <Text>{formatBytes(cacheInfo.image.totalSize)} / {formatBytes(cacheInfo.image.maxSize)}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.button, styles.clearAllButton]}
          onPress={clearAllCaches}
        >
          <Text style={styles.buttonText}>Clear All Caches</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  status: {
    fontWeight: '600',
  },
  value: {
    fontWeight: '600',
  },
  error: {
    color: '#F44336',
  },
  syncing: {
    color: '#2196F3',
    fontStyle: 'italic',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  cacheItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cacheName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#2196F3',
  },
  clearButton: {
    backgroundColor: '#FF9800',
  },
  clearAllButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});