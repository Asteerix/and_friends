import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ChatService } from '@/features/chats/services/chatService';
import { useSession } from '@/shared/providers/SessionContext';
import { supabase } from '@/shared/lib/supabase/client';

interface UserItem {
  id: string;
  full_name: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  selected?: boolean;
}

const UserListItem: React.FC<{
  user: UserItem;
  onToggle: () => void;
  isSelected: boolean;
}> = ({ user, onToggle, isSelected }) => {
  return (
    <TouchableOpacity style={styles.userItem} onPress={onToggle}>
      <View style={styles.userInfo}>
        {user.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.defaultAvatar]}>
            <Text style={styles.avatarText}>{user.full_name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{user.full_name}</Text>
          {user.username && <Text style={styles.userUsername}>@{user.username}</Text>}
        </View>
      </View>
      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
        {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
      </View>
    </TouchableOpacity>
  );
};

export default function NewChatScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (searchQuery.length > 0) {
      searchUsers();
    } else {
      loadFriends();
    }
  }, [searchQuery]);

  const loadFriends = async () => {
    setLoading(true);
    try {
      // Get user's friends/followers
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, bio')
        .neq('id', session?.user?.id)
        .limit(50);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
    setLoading(false);
  };

  const searchUsers = async () => {
    setLoading(true);
    const { data } = await ChatService.searchUsers(searchQuery);
    setUsers(data.filter((u) => u.id !== session?.user?.id));
    setLoading(false);
  };

  const toggleUserSelection = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setSelectedUsers((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const handleCreateChat = async () => {
    if (selectedUsers.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un utilisateur');
      return;
    }

    if (isGroup && !groupName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour le groupe');
      return;
    }

    setCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let chatData;

      if (selectedUsers.length === 1 && !isGroup) {
        // Direct chat
        const result = await ChatService.getOrCreateDirectChat(selectedUsers[0]);
        chatData = result.data;
        if (result.error) throw result.error;
      } else {
        // Group chat
        const result = await ChatService.createChat({
          name: groupName,
          is_group: true,
          participant_ids: selectedUsers,
        });
        chatData = result.data;
        if (result.error) throw result.error;
      }

      if (chatData) {
        router.replace(`/chat/conversation/${chatData.id}`);
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      Alert.alert('Erreur', 'Impossible de créer la conversation');
    }

    setCreating(false);
  };

  const renderUser = ({ item }: { item: UserItem }) => (
    <UserListItem
      user={item}
      onToggle={() => toggleUserSelection(item.id)}
      isSelected={selectedUsers.includes(item.id)}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouvelle conversation</Text>
        <TouchableOpacity
          onPress={handleCreateChat}
          disabled={creating || selectedUsers.length === 0}
        >
          <Text
            style={[
              styles.createButton,
              (creating || selectedUsers.length === 0) && styles.createButtonDisabled,
            ]}
          >
            {creating ? 'Création...' : 'Créer'}
          </Text>
        </TouchableOpacity>
      </View>

      {selectedUsers.length > 1 && (
        <View style={styles.groupOptions}>
          <View style={styles.groupToggle}>
            <Text style={styles.groupToggleLabel}>Créer un groupe</Text>
            <Switch
              value={isGroup}
              onValueChange={setIsGroup}
              trackColor={{ false: '#ccc', true: '#007AFF' }}
            />
          </View>
          {isGroup && (
            <TextInput
              style={styles.groupNameInput}
              placeholder="Nom du groupe"
              value={groupName}
              onChangeText={setGroupName}
              placeholderTextColor="#999"
            />
          )}
        </View>
      )}

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher des utilisateurs..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      {selectedUsers.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedTitle}>
            {selectedUsers.length} utilisateur{selectedUsers.length > 1 ? 's' : ''} sélectionné
            {selectedUsers.length > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.userList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'Aucun utilisateur trouvé' : 'Aucun ami à afficher'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  createButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  createButtonDisabled: {
    color: '#ccc',
  },
  groupOptions: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  groupToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  groupToggleLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  groupNameInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f8f8',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 36,
    fontSize: 16,
    color: '#000',
  },
  selectedContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
  },
  selectedTitle: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userList: {
    paddingVertical: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  defaultAvatar: {
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    color: '#666',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
