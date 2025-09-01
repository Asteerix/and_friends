import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Modal,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import { useMessagesAdvanced } from '@/hooks/useMessagesAdvanced';
import { ChatService } from '@/features/chats/services/chatService';
import { useSession } from '@/shared/providers/SessionContext';
import InputBar from '@/features/chat/components/InputBar';
import BubbleLeft from '@/features/chat/components/BubbleLeft';
import BubbleRight from '@/features/chat/components/BubbleRight';

interface Participant {
  user_id: string;
  is_admin: boolean;
  profiles: {
    id: string;
    full_name: string;
    username?: string;
    avatar_url?: string;
  };
}

export default function EnhancedConversationScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const chatId = params?.id;
  const router = useRouter();
  const { session } = useSession();
  const { messages, sendMessage, loading, chats } = useMessagesAdvanced(chatId);
  const [showParticipants, setShowParticipants] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [chatInfo, setChatInfo] = useState<any>(null);
  const [editingName, setEditingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const currentUserId = session?.user?.id;
  const isAdmin = participants.find((p) => p.user_id === currentUserId)?.is_admin || false;

  useEffect(() => {
    if (chatId) {
      loadChatInfo();
      loadParticipants();
    }
  }, [chatId]);

  useEffect(() => {
    // Find current chat info from chats list
    const chat = chats.find((c) => c.id === chatId);
    if (chat) {
      setChatInfo(chat);
    }
  }, [chats, chatId]);

  const loadChatInfo = async () => {
    // Load chat details
  };

  const loadParticipants = async () => {
    const { data } = await ChatService.getChatParticipants(chatId!);
    setParticipants(data);
  };

  const handleSendMessage = async (text: string) => {
    if (text.trim() && chatId) {
      await sendMessage(text);
      flatListRef.current?.scrollToEnd();
    }
  };

  const handleAddParticipants = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowParticipants(false);
    router.push(`/screens/add-participants?chatId=${chatId}`);
  };

  const handleRemoveParticipant = async (userId: string) => {
    const participant = participants.find((p) => p.user_id === userId);
    const isRemovingSelf = userId === currentUserId;

    Alert.alert(
      isRemovingSelf ? 'Quitter le groupe' : 'Retirer du groupe',
      isRemovingSelf
        ? 'Êtes-vous sûr de vouloir quitter ce groupe ?'
        : `Êtes-vous sûr de vouloir retirer ${participant?.profiles.full_name} du groupe ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: isRemovingSelf ? 'Quitter' : 'Retirer',
          style: 'destructive',
          onPress: async () => {
            const result = await ChatService.removeParticipant({
              chat_id: chatId!,
              user_id: userId,
            });

            if (result.success) {
              if (isRemovingSelf) {
                router.replace('/screens/chat');
              } else {
                loadParticipants();
              }
            } else {
              Alert.alert('Erreur', 'Impossible de retirer ce participant');
            }
          },
        },
      ]
    );
  };

  const handleUpdateGroupName = async () => {
    if (!newGroupName.trim()) return;

    const result = await ChatService.updateChat(chatId!, { name: newGroupName });
    if (result.success) {
      setEditingName(false);
      setChatInfo({ ...chatInfo, name: newGroupName });
    } else {
      Alert.alert('Erreur', 'Impossible de modifier le nom du groupe');
    }
  };

  const getChatTitle = () => {
    if (chatInfo?.is_group) {
      return chatInfo.name || 'Groupe sans nom';
    }
    const otherParticipant = participants.find((p) => p.user_id !== currentUserId);
    return otherParticipant?.profiles.full_name || 'Conversation';
  };

  const renderMessage = ({ item }: { item: any }) => {
    if (item.message_type === 'system') {
      return (
        <View style={styles.systemMessage}>
          <Text style={styles.systemMessageText}>{item.content}</Text>
        </View>
      );
    }

    const isOwnMessage = item.user_id === currentUserId;
    const Component = isOwnMessage ? BubbleRight : BubbleLeft;

    return (
      <Component
        message={item.content}
        time={format(new Date(item.created_at), 'HH:mm')}
        author={isOwnMessage ? 'Vous' : item.sender?.full_name || 'Utilisateur'}
        isOwnMessage={isOwnMessage}
        readBy={item.read_by?.length || 0}
      />
    );
  };

  const ParticipantItem = ({ participant }: { participant: Participant }) => {
    const canRemove = isAdmin || participant.user_id === currentUserId;

    return (
      <View style={styles.participantItem}>
        {participant.profiles.avatar_url ? (
          <Image
            source={{ uri: participant.profiles.avatar_url }}
            style={styles.participantAvatar}
          />
        ) : (
          <View style={[styles.participantAvatar, styles.defaultAvatar]}>
            <Text style={styles.avatarText}>
              {participant.profiles.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.participantInfo}>
          <Text style={styles.participantName}>
            {participant.profiles.full_name}
            {participant.is_admin && <Text style={styles.adminBadge}> • Admin</Text>}
          </Text>
          {participant.profiles.username && (
            <Text style={styles.participantUsername}>@{participant.profiles.username}</Text>
          )}
        </View>

        {canRemove && (
          <TouchableOpacity
            onPress={() => handleRemoveParticipant(participant.user_id)}
            style={styles.removeButton}
          >
            <Ionicons
              name={participant.user_id === currentUserId ? 'exit-outline' : 'close-circle'}
              size={24}
              color="#FF3B30"
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerCenter}
          onPress={() => chatInfo?.is_group && setShowParticipants(true)}
        >
          <Text style={styles.headerTitle}>{getChatTitle()}</Text>
          {chatInfo?.is_group && participants.length > 0 && (
            <Text style={styles.headerSubtitle}>{participants.length} membres</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowParticipants(true)}>
          <Ionicons name="information-circle-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.messagesContainer}
        keyboardVerticalOffset={90}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            inverted={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          />
        )}

        <InputBar onSendMessage={handleSendMessage} />
      </KeyboardAvoidingView>

      {/* Participants Modal */}
      <Modal
        visible={showParticipants}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowParticipants(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowParticipants(false)}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Informations</Text>
            <View style={{ width: 24 }} />
          </View>

          {chatInfo?.is_group && isAdmin && (
            <View style={styles.groupSettings}>
              <Text style={styles.sectionTitle}>Paramètres du groupe</Text>

              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Nom du groupe</Text>
                {editingName ? (
                  <View style={styles.nameEditContainer}>
                    <TextInput
                      style={styles.nameInput}
                      value={newGroupName}
                      onChangeText={setNewGroupName}
                      placeholder="Nom du groupe"
                      autoFocus
                    />
                    <TouchableOpacity onPress={handleUpdateGroupName}>
                      <Ionicons name="checkmark" size={24} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditingName(false)}>
                      <Ionicons name="close" size={24} color="#999" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.nameContainer}
                    onPress={() => {
                      setNewGroupName(chatInfo.name || '');
                      setEditingName(true);
                    }}
                  >
                    <Text style={styles.groupName}>{chatInfo.name || 'Sans nom'}</Text>
                    <Ionicons name="pencil" size={16} color="#007AFF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          <View style={styles.participantsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Participants ({participants.length})</Text>
              {chatInfo?.is_group && isAdmin && (
                <TouchableOpacity onPress={handleAddParticipants}>
                  <Ionicons name="person-add" size={20} color="#007AFF" />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={participants}
              renderItem={({ item }) => <ParticipantItem participant={item} />}
              keyExtractor={(item) => item.user_id}
              contentContainerStyle={styles.participantsList}
            />
          </View>
        </SafeAreaView>
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    marginRight: 16,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  messagesContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  systemMessage: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemMessageText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  groupSettings: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  settingItem: {
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  nameEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupName: {
    fontSize: 16,
  },
  participantsSection: {
    backgroundColor: '#fff',
    marginTop: 16,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  participantsList: {
    paddingBottom: 20,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  participantAvatar: {
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
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '500',
  },
  adminBadge: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  participantUsername: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
  },
});
