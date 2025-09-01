import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useNetworkStore } from '@/shared/stores/networkStore';
import { useNetworkQuality } from '@/shared/hooks/useNetworkQuality';
import { useAdaptiveRequest } from '@/shared/hooks/useAdaptiveRequest';
import { NetworkRetry } from '@/shared/utils/networkRetry';
import { cleanExpiredCache, getCacheSize } from '@/shared/utils/offlineCache';
import { supabase } from '@/shared/lib/supabase/client';

/**
 * Demo screen to showcase all network management features
 * This screen demonstrates:
 * - Network status monitoring
 * - Network quality testing
 * - Adaptive requests with retry
 * - Offline cache management
 * - Network-aware data fetching
 */
export function NetworkDemoScreen() {
  const router = useRouter();
  const { isConnected, connectionQuality, networkType } = useNetworkStore();
  const {
    quality,
    metrics,
    isTestingQuality,
    testQuality,
    isSlowConnection,
    isOffline,
    networkType,
  } = useNetworkQuality();

  const [cacheSize, setCacheSize] = useState<number>(0);
  const [testResults, setTestResults] = useState<string[]>([]);

  // Adaptive request example
  const { execute, loading, error, progress, retry } = useAdaptiveRequest({
    baseTimeout: 10000,
    maxRetries: 3,
    enableCache: true,
    cacheKey: 'demo-data',
  });

  // Load cache size
  React.useEffect(() => {
    getCacheSize().then(setCacheSize);
  }, []);

  // Test adaptive request
  const testAdaptiveRequest = async () => {
    const result = await execute(async () => {
      const { data } = await supabase.from('profiles').select('*').limit(5);
      return data;
    });

    if (result) {
      Alert.alert('Success', `Fetched ${result.length} profiles`);
    }
  };

  // Test network retry
  const testNetworkRetry = async () => {
    setTestResults((prev) => [...prev, 'Starting network retry test...']);

    const result = await NetworkRetry.withRetry(
      async () => {
        // Simulate a flaky API call
        if (Math.random() > 0.7) {
          throw new Error('Simulated network error');
        }
        return { success: true, timestamp: Date.now() };
      },
      {
        maxRetries: 3,
        onRetry: (attempt, error) => {
          setTestResults((prev) => [...prev, `Retry attempt ${attempt}: ${error.message}`]);
        },
      }
    );

    setTestResults((prev) => [...prev, `Test completed: ${JSON.stringify(result)}`]);
  };

  // Clean cache
  const handleCleanCache = async () => {
    const removed = await cleanExpiredCache();
    const newSize = await getCacheSize();
    setCacheSize(newSize);
    Alert.alert('Cache cleaned', `Removed ${removed} expired entries`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Network Management Demo</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Network Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📡 Network Status</Text>
          <View style={styles.statusCard}>
            <StatusRow label="Connected" value={isConnected ? '✅ Yes' : '❌ No'} />
            <StatusRow label="Connection Quality" value={connectionQuality} />
            <StatusRow label="Connection Type" value={networkType || 'unknown'} />
            <StatusRow label="Network Type" value={networkType?.toString() || 'unknown'} />
            <StatusRow label="Slow Connection" value={isSlowConnection ? '⚠️ Yes' : '✅ No'} />
            <StatusRow label="Offline" value={isOffline ? '❌ Yes' : '✅ No'} />
          </View>
        </View>

        {/* Network Quality Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Network Quality</Text>
          <View style={styles.statusCard}>
            <StatusRow label="Overall Quality" value={quality} />
            {metrics && (
              <>
                <StatusRow label="Latency" value={`${metrics.latency}ms`} />
                <StatusRow label="Bandwidth" value={`${metrics.bandwidth.toFixed(2)} KB/s`} />
                <StatusRow label="Packet Loss" value={`${metrics.packetLoss.toFixed(1)}%`} />
                <StatusRow label="Jitter" value={`${metrics.jitter.toFixed(1)}ms`} />
              </>
            )}
            <TouchableOpacity
              style={styles.button}
              onPress={testQuality}
              disabled={isTestingQuality}
            >
              {isTestingQuality ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>Test Network Quality</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Adaptive Request Test */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔄 Adaptive Requests</Text>
          <View style={styles.statusCard}>
            {loading && (
              <View style={styles.progressContainer}>
                <Text>Loading... {progress}%</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
              </View>
            )}
            {error && <Text style={styles.errorText}>{error}</Text>}
            <TouchableOpacity
              style={styles.button}
              onPress={testAdaptiveRequest}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Test Adaptive Request</Text>
            </TouchableOpacity>
            {error && (
              <TouchableOpacity style={[styles.button, styles.retryButton]} onPress={retry}>
                <Text style={styles.buttonText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Network Retry Test */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔁 Network Retry</Text>
          <View style={styles.statusCard}>
            <TouchableOpacity style={styles.button} onPress={testNetworkRetry}>
              <Text style={styles.buttonText}>Test Network Retry</Text>
            </TouchableOpacity>
            {testResults.length > 0 && (
              <View style={styles.logContainer}>
                {testResults.map((result, index) => (
                  <Text key={index} style={styles.logText}>
                    {result}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Cache Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💾 Cache Management</Text>
          <View style={styles.statusCard}>
            <StatusRow label="Cache Size" value={`${(cacheSize / 1024).toFixed(2)} KB`} />
            <TouchableOpacity style={styles.button} onPress={handleCleanCache}>
              <Text style={styles.buttonText}>Clean Expired Cache</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper component for status rows
function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statusRow}>
      <Text style={styles.statusLabel}>{label}:</Text>
      <Text style={styles.statusValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  button: {
    backgroundColor: '#FF6B00',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#666',
    marginTop: 8,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B00',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 14,
    marginBottom: 8,
  },
  logContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  logText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});
