import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomModal from './BottomModal';

interface BringersModalProps {
  visible: boolean;
  onClose: () => void;
  itemName: string;
  bringers: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
}

export default function WhosBringingModal({
  visible,
  onClose,
  itemName,
  bringers,
}: BringersModalProps) {
  const renderBringer = ({ item }: { item: any }) => (
    <View style={styles.bringerRow}>
      <View style={styles.bringerInfo}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.bringerName}>{item.name}</Text>
      </View>
      <Ionicons name="checkmark-circle" size={24} color="#34C759" />
    </View>
  );

  return (
    <BottomModal
      visible={visible}
      onClose={onClose}
      title={`Who's bringing`}
      height={400}
      scrollable={false}
    >
      <View style={styles.container}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{itemName}</Text>
          <Text style={styles.countText}>
            {bringers.length} {bringers.length === 1 ? 'person' : 'people'}
          </Text>
        </View>

        {bringers.length > 0 ? (
          <FlatList
            data={bringers}
            renderItem={renderBringer}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="basket-outline" size={48} color="#C7C7CC" />
            <Text style={styles.emptyText}>No one has claimed this item yet</Text>
          </View>
        )}
      </View>
    </BottomModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  itemHeader: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  countText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  bringerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    marginBottom: 8,
  },
  bringerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  bringerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
    textAlign: 'center',
  },
});