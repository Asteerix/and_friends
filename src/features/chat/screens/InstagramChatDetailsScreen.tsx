import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Switch,
  Alert,
  SafeAreaView,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSession } from '@/shared/providers/SessionContext';
import { ChatService } from '@/features/chats/services/chatService';
import { supabase } from '@/shared/lib/supabase/client';
import { usePresence } from '@/hooks/usePresence';

interface Participant {
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    username: string | null;
  };
}

interface ChatDetails {
  id: string;
  name: string | null;
  is_group: boolean;
  created_at: string;
  created_by: string;
  description: string | null;
  avatar_url: string | null;
}

export default function InstagramChatDetailsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const chatId = params?.id;
  const router = useRouter();
  const { session } = useSession();
  const { isUserOnline } = usePresence();

  const [chatDetails, setChatDetails] = useState<ChatDetails | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notificationsMuted, setNotificationsMuted] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const currentUserId = session?.user?.id;

  useEffect(() => {
    if (chatId) {
      loadChatDetails();
      loadPreferences();
    }
  }, [chatId]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_preferences')
        .select('notifications_muted')
        .eq('user_id', currentUserId)
        .eq('chat_id', chatId)
        .single();

      if (data && !error) {
        setNotificationsMuted(data.notifications_muted);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const loadChatDetails = async () => {
    setLoading(true);
    try {
      // Load chat details
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .single();

      if (chatError) throw chatError;
      setChatDetails(chat);
      setNewChatName(chat.name || '');

      // Load participants
      const { data: participantsData, error: participantsError } =
        await ChatService.getChatParticipants(chatId!);
      if (participantsError) throw participantsError;

      setParticipants(participantsData || []);

      // Check if current user is admin
      const currentParticipant = participantsData?.find((p) => p.user_id === currentUserId);
      setIsAdmin(currentParticipant?.role === 'admin');
    } catch (error) {
      console.error('Error loading chat details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChatTitle = () => {
    if (chatDetails?.is_group) {
      return chatDetails.name || 'Groupe';
    }
    const otherParticipant = participants.find((p) => p.user_id !== currentUserId);
    return otherParticipant?.profiles?.full_name || 'Conversation';
  };

  const getSubtitle = () => {
    if (chatDetails?.is_group) {
      return `${participants.length} membres`;
    }
    const otherParticipant = participants.find((p) => p.user_id !== currentUserId);
    return otherParticipant?.profiles?.username ? `@${otherParticipant.profiles.username}` : '';
  };

  const handleEditName = async () => {
    if (!isAdmin || !newChatName.trim()) return;

    try {
      await ChatService.updateChat(chatId!, {
        name: newChatName.trim(),
      });

      setChatDetails((prev) => (prev ? { ...prev, name: newChatName.trim() } : null));
      setShowEditNameModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier le nom du groupe');
    }
  };

  const handleToggleMute = async () => {
    const newMutedState = !notificationsMuted;
    setNotificationsMuted(newMutedState);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Save mute preference to user metadata or a separate table
      await supabase.from('chat_preferences').upsert(
        {
          user_id: currentUserId,
          chat_id: chatId,
          notifications_muted: newMutedState,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,chat_id',
        }
      );
    } catch (error) {
      console.error('Error updating mute preference:', error);
      // Revert on error
      setNotificationsMuted(!newMutedState);
    }
  };

  const handleLeaveChat = () => {
    Alert.alert(
      'Quitter la conversation',
      chatDetails?.is_group
        ? 'Êtes-vous sûr de vouloir quitter ce groupe ?'
        : 'Êtes-vous sûr de vouloir supprimer cette conversation ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Quitter',
          style: 'destructive',
          onPress: async () => {
            try {
              await ChatService.removeParticipants({
                chat_id: chatId!,
                user_ids: [currentUserId!],
              });
              router.back();
              router.back(); // Go back to chat list
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de quitter la conversation');
            }
          },
        },
      ]
    );
  };

  const handleBlockUser = () => {
    if (chatDetails?.is_group) return;

    const otherParticipant = participants.find((p) => p.user_id !== currentUserId);
    if (!otherParticipant) return;

    Alert.alert(
      "Bloquer l'utilisateur",
      `Bloquer ${otherParticipant.profiles.full_name} ? Cette personne ne pourra plus vous envoyer de messages.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Bloquer',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement block functionality
            console.log('Block user:', otherParticipant.user_id);
          },
        },
      ]
    );
  };

  const handleAddParticipants = () => {
    router.push(`/screens/add-participants?chatId=${chatId}`);
  };

  const handleParticipantPress = (participant: Participant) => {
    if (participant.user_id === currentUserId) return;

    // Navigate to participant's profile
    router.push(`/profile/${participant.user_id}`);
  };

  const handleRemoveParticipant = (participant: Participant) => {
    if (!isAdmin || participant.user_id === currentUserId) return;

    Alert.alert('Retirer du groupe', `Retirer ${participant.profiles.full_name} du groupe ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: async () => {
          try {
            await ChatService.removeParticipants({
              chat_id: chatId!,
              user_ids: [participant.user_id],
            });
            loadChatDetails();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error) {
            Alert.alert('Erreur', 'Impossible de retirer ce participant');
          }
        },
      },
    ]);
  };

  const renderParticipant = ({ item }: { item: Participant }) => {
    const isMe = item.user_id === currentUserId;
    const online = isUserOnline(item.user_id);

    return (
      <TouchableOpacity
        style={styles.participantItem}
        onPress={() => handleParticipantPress(item)}
        disabled={isMe}
      >
        <View style={styles.participantAvatar}>
          {item.profiles.avatar_url ? (
            <Image source={{ uri: item.profiles.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.defaultAvatar]}>
              <Text style={styles.avatarText}>{item.profiles.full_name?.charAt(0) || '?'}</Text>
            </View>
          )}
          {online && !isMe && <View style={styles.onlineIndicator} />}
        </View>

        <View style={styles.participantInfo}>
          <Text style={styles.participantName}>
            {item.profiles.full_name} {isMe && '(Vous)'}
          </Text>
          {item.role === 'admin' && <Text style={styles.adminBadge}>Admin</Text>}
        </View>

        {isAdmin && !isMe && chatDetails?.is_group && (
          <TouchableOpacity onPress={() => handleRemoveParticipant(item)}>
            <Ionicons name="remove-circle-outline" size={24} color="#FF3B30" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const filteredParticipants = participants.filter((p) => {
    if (!searchQuery) return true;
    return p.profiles.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Détails</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileAvatar}>
            {chatDetails?.is_group ? (
              <View style={[styles.largeAvatar, styles.groupAvatar]}>
                <Ionicons name="people" size={50} color="#000" />
              </View>
            ) : participants[0]?.profiles?.avatar_url ? (
              <Image
                source={{ uri: participants[0].profiles.avatar_url }}
                style={styles.largeAvatar}
              />
            ) : (
              <View style={[styles.largeAvatar, styles.defaultAvatar]}>
                <Text style={styles.largeAvatarText}>{getChatTitle().charAt(0)}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={() => chatDetails?.is_group && isAdmin && setShowEditNameModal(true)}
            disabled={!chatDetails?.is_group || !isAdmin}
          >
            <View style={styles.profileName}>
              <Text style={styles.profileTitle}>{getChatTitle()}</Text>
              {chatDetails?.is_group && isAdmin && (
                <Ionicons name="pencil" size={16} color="#999" style={styles.editIcon} />
              )}
            </View>
          </TouchableOpacity>

          {getSubtitle() && <Text style={styles.profileSubtitle}>{getSubtitle()}</Text>}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction}>
            <Ionicons name="call-outline" size={28} color="#000" />
            <Text style={styles.quickActionText}>Audio</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction}>
            <Ionicons name="videocam-outline" size={28} color="#000" />
            <Text style={styles.quickActionText}>Vidéo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction}>
            <Ionicons name="person-circle-outline" size={28} color="#000" />
            <Text style={styles.quickActionText}>Profil</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction} onPress={handleToggleMute}>
            <Ionicons
              name={notificationsMuted ? 'notifications-off-outline' : 'notifications-outline'}
              size={28}
              color="#000"
            />
            <Text style={styles.quickActionText}>{notificationsMuted ? 'Activer' : 'Muet'}</Text>
          </TouchableOpacity>
        </View>

        {/* Options Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.option}
            onPress={() => router.push(`/screens/notification-settings?chatId=${chatId}`)}
          >
            <Text style={styles.optionText}>Notifications personnalisées</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.option}>
            <Text style={styles.optionText}>Fond d'écran</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={() => router.push(`/screens/search-messages?chatId=${chatId}`)}
          >
            <Text style={styles.optionText}>Rechercher dans la conversation</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Members Section for Groups */}
        {chatDetails?.is_group && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Membres ({participants.length})</Text>
              {isAdmin && (
                <TouchableOpacity onPress={handleAddParticipants}>
                  <Ionicons name="person-add-outline" size={20} color="#3797F0" />
                </TouchableOpacity>
              )}
            </View>

            {participants.length > 5 && (
              <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher un membre"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#999"
                />
              </View>
            )}

            <FlatList
              data={filteredParticipants}
              renderItem={renderParticipant}
              keyExtractor={(item) => item.user_id}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Confidentialité</Text>

          <TouchableOpacity style={styles.option}>
            <Text style={styles.optionText}>Messages éphémères</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.option}>
            <Text style={styles.optionText}>Chiffrement</Text>
            <View style={styles.encryptionBadge}>
              <Ionicons name="lock-closed" size={14} color="#4CD964" />
              <Text style={styles.encryptionText}>Activé</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Media Section */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.option}>
            <Text style={styles.optionText}>Médias, liens et documents</Text>
            <View style={styles.mediaCount}>
              <Text style={styles.mediaCountText}>0</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          {!chatDetails?.is_group && (
            <TouchableOpacity style={styles.dangerOption} onPress={handleBlockUser}>
              <Text style={styles.dangerText}>Bloquer</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.dangerOption}>
            <Text style={styles.dangerText}>Signaler</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dangerOption} onPress={handleLeaveChat}>
            <Text style={styles.dangerText}>
              {chatDetails?.is_group ? 'Quitter le groupe' : 'Supprimer la conversation'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Name Modal */}
      <Modal visible={showEditNameModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowEditNameModal(false)}>
                <Text style={styles.modalCancel}>Annuler</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Nom du groupe</Text>
              <TouchableOpacity onPress={handleEditName}>
                <Text style={styles.modalDone}>OK</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              value={newChatName}
              onChangeText={setNewChatName}
              placeholder="Nom du groupe"
              autoFocus
              maxLength={25}
            />

            <Text style={styles.charCount}>{newChatName.length}/25</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  profileAvatar: {
    marginBottom: 16,
  },
  largeAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  groupAvatar: {
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatar: {
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeAvatarText: {
    fontSize: 40,
    fontWeight: '500',
  },
  profileName: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  editIcon: {
    marginLeft: 8,
  },
  profileSubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 0.5,
    borderTopColor: '#DBDBDB',
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  quickAction: {
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#999',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionText: {
    fontSize: 16,
  },
  dangerOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dangerText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFEFEF',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    height: 36,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  participantAvatar: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '500',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CD964',
    borderWidth: 2,
    borderColor: '#fff',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
  },
  adminBadge: {
    fontSize: 12,
    color: '#3797F0',
    marginTop: 2,
  },
  encryptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  encryptionText: {
    fontSize: 14,
    color: '#4CD964',
  },
  mediaCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mediaCountText: {
    fontSize: 14,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  modalCancel: {
    fontSize: 16,
    color: '#999',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalDone: {
    fontSize: 16,
    color: '#3797F0',
    fontWeight: '600',
  },
  modalInput: {
    fontSize: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    paddingHorizontal: 16,
  },
});
