import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSession } from '@/shared/providers/SessionContext';
import { ChatService } from '@/features/chats/services/chatService';
import { supabase } from '@/shared/lib/supabase/client';

interface User {
  id: string;
  full_name: string;
  avatar_url: string | null;
  username: string | null;
}

export default function InstagramNewChatScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [showGroupNameInput, setShowGroupNameInput] = useState(false);

  const currentUserId = session?.user?.id;

  useEffect(() => {
    if (searchQuery.trim()) {
      searchUsers();
    } else {
      // Load recent/suggested users
      loadSuggestedUsers();
    }
  }, [searchQuery]);

  useEffect(() => {
    // Show group name input when 2+ users are selected
    setShowGroupNameInput(selectedUsers.length >= 2);
  }, [selectedUsers]);

  const loadSuggestedUsers = async () => {
    setLoading(true);
    try {
      // Load all users except current user (in a real app, this would be friends/contacts)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUserId)
        .limit(20);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await ChatService.searchUsers(searchQuery);
      if (error) throw error;

      // Filter out current user
      const filteredUsers = data?.filter((u) => u.id !== currentUserId) || [];
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (user: User) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setSelectedUsers((prev) => {
      const isSelected = prev.some((u) => u.id === user.id);
      if (isSelected) {
        return prev.filter((u) => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleCreateChat = async () => {
    if (selectedUsers.length === 0) return;

    setCreatingChat(true);
    try {
      if (selectedUsers.length === 1) {
        // Create direct chat
        const { data, error } = await ChatService.getOrCreateDirectChat(selectedUsers[0].id);
        if (error) throw error;

        router.replace(`/chat/conversation/${data.id}`);
      } else {
        // Create group chat
        if (!groupName.trim() && showGroupNameInput) {
          Alert.alert('Nom requis', 'Veuillez entrer un nom pour le groupe');
          setCreatingChat(false);
          return;
        }

        const { data, error } = await ChatService.createChat({
          name: groupName.trim() || `Groupe de ${selectedUsers[0].full_name}`,
          is_group: true,
          participant_ids: selectedUsers.map((u) => u.id),
        });

        if (error) throw error;
        router.replace(`/chat/conversation/${data.id}`);
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      Alert.alert('Erreur', 'Impossible de créer la conversation');
    } finally {
      setCreatingChat(false);
    }
  };

  const renderUser = ({ item }: { item: User }) => {
    const isSelected = selectedUsers.some((u) => u.id === item.id);

    return (
      <TouchableOpacity style={styles.userItem} onPress={() => toggleUserSelection(item)}>
        <View style={styles.userAvatar}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.defaultAvatar]}>
              <Text style={styles.avatarText}>{item.full_name?.charAt(0) || '?'}</Text>
            </View>
          )}
          {isSelected && (
            <View style={styles.selectedIndicator}>
              <Ionicons name="checkmark-circle" size={24} color="#3797F0" />
            </View>
          )}
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.full_name}</Text>
          {item.username && <Text style={styles.userUsername}>@{item.username}</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSelectedUser = ({ item }: { item: User }) => (
    <TouchableOpacity style={styles.selectedUser} onPress={() => toggleUserSelection(item)}>
      <View style={styles.selectedUserAvatar}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.selectedAvatar} />
        ) : (
          <View style={[styles.selectedAvatar, styles.defaultAvatar]}>
            <Text style={styles.selectedAvatarText}>{item.full_name?.charAt(0) || '?'}</Text>
          </View>
        )}
        <View style={styles.removeIndicator}>
          <Ionicons name="close-circle" size={20} color="#3797F0" />
        </View>
      </View>
      <Text style={styles.selectedUserName} numberOfLines={1}>
        {item.full_name?.split(' ')[0]}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Nouveau message</Text>

        <TouchableOpacity
          onPress={handleCreateChat}
          disabled={selectedUsers.length === 0 || creatingChat}
        >
          <Text
            style={[
              styles.nextButton,
              (selectedUsers.length === 0 || creatingChat) && styles.nextButtonDisabled,
            ]}
          >
            {creatingChat ? 'Création...' : 'Suivant'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* To Section */}
      <View style={styles.toSection}>
        <Text style={styles.toLabel}>À :</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
          autoFocus
        />
      </View>

      {/* Selected Users */}
      {selectedUsers.length > 0 && (
        <View style={styles.selectedSection}>
          <FlatList
            data={selectedUsers}
            renderItem={renderSelectedUser}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectedList}
          />
        </View>
      )}

      {/* Group Name Input */}
      {showGroupNameInput && (
        <View style={styles.groupNameSection}>
          <TextInput
            style={styles.groupNameInput}
            placeholder="Nom du groupe (optionnel)"
            value={groupName}
            onChangeText={setGroupName}
            placeholderTextColor="#999"
          />
        </View>
      )}

      {/* Suggested/Search Results */}
      <View style={styles.suggestedSection}>
        <Text style={styles.sectionTitle}>
          {searchQuery ? 'Résultats de recherche' : 'Suggestions'}
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        ) : (
          <FlatList
            data={users}
            renderItem={renderUser}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.usersList}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'Aucun utilisateur trouvé' : 'Aucune suggestion'}
                </Text>
              </View>
            }
          />
        )}
      </View>
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
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  nextButton: {
    fontSize: 16,
    color: '#3797F0',
    fontWeight: '600',
  },
  nextButtonDisabled: {
    color: '#999',
  },
  toSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  toLabel: {
    fontSize: 16,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  selectedSection: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  selectedList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectedUser: {
    alignItems: 'center',
    marginRight: 16,
  },
  selectedUserAvatar: {
    position: 'relative',
  },
  selectedAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  selectedAvatarText: {
    fontSize: 20,
    fontWeight: '500',
  },
  removeIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  selectedUserName: {
    fontSize: 12,
    marginTop: 4,
    width: 60,
    textAlign: 'center',
  },
  groupNameSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  groupNameInput: {
    fontSize: 16,
  },
  suggestedSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  usersList: {
    paddingBottom: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userAvatar: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  defaultAvatar: {
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '500',
  },
  selectedIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
  },
  userUsername: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
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
