import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomModal from './BottomModal';

interface CoHost {
  id: string;
  name: string;
  avatar: string;
  username?: string;
}

interface ManageCoHostsModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (coHosts: CoHost[]) => void;
  currentCoHosts: CoHost[];
}

export default function ManageCoHostsModal({
  visible,
  onClose,
  onSave,
  currentCoHosts = [],
}: ManageCoHostsModalProps) {
  const [coHosts, setCoHosts] = useState<CoHost[]>(currentCoHosts);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CoHost[]>([]);

  // Demo users for search
  const demoUsers: CoHost[] = [
    {
      id: '1',
      name: 'Ana Garcia',
      avatar: 'https://i.pravatar.cc/150?img=5',
      username: '@anagarcia',
    },
    {
      id: '2',
      name: 'Mike Johnson',
      avatar: 'https://i.pravatar.cc/150?img=8',
      username: '@mikej',
    },
    {
      id: '3',
      name: 'Sarah Williams',
      avatar: 'https://i.pravatar.cc/150?img=9',
      username: '@sarahw',
    },
    {
      id: '4',
      name: 'David Brown',
      avatar: 'https://i.pravatar.cc/150?img=7',
      username: '@davidb',
    },
    { id: '5', name: 'Emma Davis', avatar: 'https://i.pravatar.cc/150?img=10', username: '@emmad' },
    {
      id: '6',
      name: 'James Wilson',
      avatar: 'https://i.pravatar.cc/150?img=11',
      username: '@jamesw',
    },
  ];

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = demoUsers
        .filter(
          (user) =>
            user.name.toLowerCase().includes(query.toLowerCase()) ||
            user.username?.toLowerCase().includes(query.toLowerCase()) ||
            false
        )
        .filter((user) => !coHosts.find((ch) => ch.id === user.id));
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const addCoHost = (user: CoHost) => {
    if (!coHosts.find((ch) => ch.id === user.id)) {
      setCoHosts([...coHosts, user]);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const removeCoHost = (id: string) => {
    Alert.alert('Remove Co-Host', 'Are you sure you want to remove this co-host?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setCoHosts(coHosts.filter((ch) => ch.id !== id)),
      },
    ]);
  };

  const handleSave = () => {
    onSave(coHosts);
    onClose();
  };

  return (
    <BottomModal
      visible={visible}
      onClose={onClose}
      title="Manage Co-Hosts"
      height={700}
      onSave={handleSave}
      saveButtonText="Save Co-Hosts"
    >
      <View style={styles.container}>
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Search friends to add as co-hosts"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {searchResults.length > 0 && (
            <View style={styles.searchResults}>
              {searchResults.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={styles.searchResultItem}
                  onPress={() => addCoHost(user)}
                >
                  <Image source={{ uri: user.avatar }} style={styles.avatar} />
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.name}</Text>
                    {user.username && <Text style={styles.username}>{user.username}</Text>}
                  </View>
                  <TouchableOpacity style={styles.addButton} onPress={() => addCoHost(user)}>
                    <Ionicons name="add" size={20} color="#007AFF" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.coHostsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Current Co-Hosts</Text>
            <Text style={styles.coHostCount}>
              {coHosts.length} co-host{coHosts.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {coHosts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#C7C7CC" />
              <Text style={styles.emptyStateText}>No co-hosts added yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Search for friends to add them as co-hosts
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {coHosts.map((coHost) => (
                <View key={coHost.id} style={styles.coHostItem}>
                  <Image source={{ uri: coHost.avatar }} style={styles.avatar} />
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{coHost.name}</Text>
                    {coHost.username && <Text style={styles.username}>{coHost.username}</Text>}
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeCoHost(coHost.id)}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
          <Text style={styles.infoText}>
            Co-hosts can help manage the event, send invites, and moderate content
          </Text>
        </View>
      </View>
    </BottomModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 20,
  },
  searchSection: {
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  searchResults: {
    marginTop: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  coHostsSection: {
    flex: 1,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  coHostCount: {
    fontSize: 14,
    color: '#8E8E93',
  },
  coHostItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E5EA',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  username: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 4,
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#007AFF',
    lineHeight: 20,
  },
});
