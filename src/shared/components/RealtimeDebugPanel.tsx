import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useRealtimeMonitor } from '../utils/realtimeMonitoring';

interface RealtimeDebugPanelProps {
  enabled?: boolean;
}

export function RealtimeDebugPanel({ enabled = __DEV__ }: RealtimeDebugPanelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { metrics, report, reset } = useRealtimeMonitor();

  if (!enabled) return null;

  const activeChannels = Array.from(metrics.channels.values()).filter(
    (c: any) => c.status === 'connected'
  ).length;

  return (
    <>
      {/* Floating Debug Button */}
      <TouchableOpacity style={styles.floatingButton} onPress={() => setIsVisible(true)}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>RT</Text>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: activeChannels > 0 ? '#4CAF50' : '#FF5252' },
            ]}
          />
        </View>
        <Text style={styles.floatingButtonText}>
          {activeChannels}/{metrics.subscriptionCount}
        </Text>
      </TouchableOpacity>

      {/* Debug Modal */}
      <Modal
        visible={isVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Realtime Debug Panel</Text>
              <TouchableOpacity onPress={() => setIsVisible(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Summary Stats */}
            <View style={styles.statsGrid}>
              <StatCard
                label="Active"
                value={`${activeChannels}/${metrics.subscriptionCount}`}
                color="#4CAF50"
              />
              <StatCard
                label="Messages"
                value={metrics.messagesReceived.toString()}
                color="#2196F3"
              />
              <StatCard label="Errors" value={metrics.errors.toString()} color="#FF5252" />
              <StatCard
                label="Reconnects"
                value={metrics.reconnections.toString()}
                color="#FF9800"
              />
            </View>

            {/* Channels List */}
            <ScrollView style={styles.channelsList}>
              <Text style={styles.sectionTitle}>Active Channels</Text>
              {Array.from(metrics.channels.values()).map((channel: any) => (
                <ChannelCard key={channel.name} channel={channel} />
              ))}
            </ScrollView>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  console.log(report);
                  alert('Report logged to console');
                }}
              >
                <Text style={styles.actionButtonText}>Log Report</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.dangerButton]}
                onPress={() => {
                  reset();
                  alert('Metrics reset');
                }}
              >
                <Text style={styles.actionButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

// Sub-components
function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ChannelCard({ channel }: { channel: any }) {
  const statusColors: { [key: string]: string } = {
    connected: '#4CAF50',
    disconnected: '#9E9E9E',
    error: '#FF5252',
  };
  const statusColor = statusColors[channel.status] || '#9E9E9E';

  return (
    <View style={styles.channelCard}>
      <View style={styles.channelHeader}>
        <View style={[styles.channelStatus, { backgroundColor: statusColor }]} />
        <Text style={styles.channelName} numberOfLines={1}>
          {channel.name}
        </Text>
      </View>
      <View style={styles.channelStats}>
        <Text style={styles.channelStat}>Messages: {channel.messagesReceived}</Text>
        <Text style={styles.channelStat}>Errors: {channel.errors}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 9999,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 5,
  },
  badgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 3,
  },
  floatingButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  statCard: {
    width: '25%',
    padding: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  channelsList: {
    flex: 1,
    padding: 20,
  },
  channelCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  channelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  channelStatus: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  channelName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  channelStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  channelStat: {
    fontSize: 12,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
  },
  actionButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  dangerButton: {
    backgroundColor: '#FF5252',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
