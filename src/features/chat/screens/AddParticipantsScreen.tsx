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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ChatService } from '@/features/chats/services/chatService';
import { useSession } from '@/shared/providers/SessionContext';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/shared/lib/supabase/client';

interface UserItem {
  id: string;
  full_name: string;
  username?: string;
  avatar_url?: string;
  isParticipant?: boolean;
}

export default function AddParticipantsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ chatId: string }>();
  const chatId = params?.chatId;
  const { session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [existingParticipants, setExistingParticipants] = useState<string[]>([]);

  useEffect(() => {
    loadExistingParticipants();
  }, [chatId]);

  useEffect(() => {
    if (searchQuery.length > 0) {
      searchUsers();
    } else {
      loadFriends();
    }
  }, [searchQuery, existingParticipants]);

  const loadExistingParticipants = async () => {
    if (!chatId) return;
    
    const { data } = await ChatService.getChatParticipants(chatId);
    setExistingParticipants(data.map(p => p.user_id));
  };

  const loadFriends = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .neq('id', session?.user?.id)
        .limit(50);

      if (error) throw error;
      
      // Mark existing participants
      const usersWithStatus = (data || []).map(user => ({
        ...user,
        isParticipant: existingParticipants.includes(user.id),
      }));
      
      setUsers(usersWithStatus);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
    setLoading(false);
  };

  const searchUsers = async () => {
    setLoading(true);
    const { data } = await ChatService.searchUsers(searchQuery);
    
    // Mark existing participants and filter out current user
    const usersWithStatus = data
      .filter(u => u.id !== session?.user?.id)
      .map(user => ({
        ...user,
        isParticipant: existingParticipants.includes(user.id),
      }));
    
    setUsers(usersWithStatus);
    setLoading(false);
  };

  const toggleUserSelection = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const handleAddParticipants = async () => {
    if (selectedUsers.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un utilisateur');
      return;
    }

    setAdding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await ChatService.addParticipants({
        chat_id: chatId!,
        user_ids: selectedUsers,
      });

      if (result.success) {
        router.back();
      } else {
        throw result.error;
      }
    } catch (error) {
      console.error('Error adding participants:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter les participants');
    }
    
    setAdding(false);
  };

  const renderUser = ({ item }: { item: UserItem }) => {
    const isDisabled = item.isParticipant;
    const isSelected = selectedUsers.includes(item.id);

    return (
      <TouchableOpacity 
        style={[styles.userItem, isDisabled && styles.userItemDisabled]}
        onPress={() => !isDisabled && toggleUserSelection(item.id)}
        disabled={isDisabled}
      >
        <View style={styles.userInfo}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.defaultAvatar]}>
              <Text style={styles.avatarText}>
                {item.full_name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={[styles.userName, isDisabled && styles.disabledText]}>
              {item.full_name}
            </Text>
            {item.username && (
              <Text style={[styles.userUsername, isDisabled && styles.disabledText]}>
                @{item.username}
              </Text>
            )}
            {isDisabled && (
              <Text style={styles.participantLabel}>Déjà dans le groupe</Text>
            )}
          </View>
        </View>
        {!isDisabled && (
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ajouter des participants</Text>
        <TouchableOpacity
          onPress={handleAddParticipants}
          disabled={adding || selectedUsers.length === 0}
        >
          <Text style={[
            styles.addButton,
            (adding || selectedUsers.length === 0) && styles.addButtonDisabled
          ]}>
            {adding ? 'Ajout...' : 'Ajouter'}
          </Text>
        </TouchableOpacity>
      </View>

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
            {selectedUsers.length} utilisateur{selectedUsers.length > 1 ? 's' : ''} sélectionné{selectedUsers.length > 1 ? 's' : ''}
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
  addButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  addButtonDisabled: {
    color: '#ccc',
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
  userItemDisabled: {
    opacity: 0.6,
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
  disabledText: {
    color: '#999',
  },
  participantLabel: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 2,
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