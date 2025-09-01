import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import { useMessagesAdvanced } from '@/hooks/useMessagesAdvanced';
import { useSession } from '@/shared/providers/SessionContext';
import { supabase } from '@/shared/lib/supabase/client';

interface ChatItemProps {
  chat: any;
  currentUserId: string;
  onPress: () => void;
}

const ChatItem: React.FC<ChatItemProps> = ({ chat, currentUserId, onPress }) => {
  const getOtherParticipant = () => {
    if (!chat.is_group && chat.participants) {
      return chat.participants.find((p: any) => p.user_id !== currentUserId);
    }
    return null;
  };

  const otherParticipant = getOtherParticipant();
  const displayName = chat.is_group
    ? chat.name || 'Groupe sans nom'
    : otherParticipant?.profiles?.full_name || 'Utilisateur';

  const avatarUrl = !chat.is_group && otherParticipant?.profiles?.avatar_url;
  const lastMessageTime = chat.lastMessage?.created_at
    ? format(new Date(chat.lastMessage.created_at), 'HH:mm', { locale: fr })
    : '';

  const unreadCount = chat.unreadCount || 0;

  return (
    <TouchableOpacity style={styles.chatItem} onPress={onPress}>
      <View style={styles.avatarContainer}>
        {chat.is_group ? (
          <View style={[styles.avatar, styles.groupAvatar]}>
            <Ionicons name="people" size={24} color="#fff" />
          </View>
        ) : avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.defaultAvatar]}>
            <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        )}
      </View>

      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.chatTime}>{lastMessageTime}</Text>
        </View>
        <View style={styles.chatFooter}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {chat.lastMessage?.message_type === 'image'
              ? '📷 Photo'
              : chat.lastMessage?.message_type === 'audio'
                ? '🎵 Message vocal'
                : chat.lastMessage?.content || 'Aucun message'}
          </Text>
          {chat.is_group && chat.participants_count && (
            <Text style={styles.participantCount}>{chat.participants_count} membres</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function ChatListScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { chats, loading, refreshChats } = useMessagesAdvanced();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const filteredChats = chats.filter((chat) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    const chatName = chat.name?.toLowerCase() || '';

    // For direct chats, also search in participant names
    if (!chat.is_group && chat.participants) {
      const otherParticipant = chat.participants.find((p: any) => p.user_id !== session?.user?.id);
      const participantName = otherParticipant?.profiles?.full_name?.toLowerCase() || '';
      return chatName.includes(query) || participantName.includes(query);
    }

    return chatName.includes(query);
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshChats();
    setRefreshing(false);
  };

  const handleChatPress = (chatId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/chat/conversation/${chatId}`);
  };

  const handleNewChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/screens/new-chat');
  };

  const renderChat = ({ item }: { item: any }) => (
    <ChatItem
      chat={item}
      currentUserId={session?.user?.id || ''}
      onPress={() => handleChatPress(item.id)}
    />
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>Aucune conversation</Text>
      <Text style={styles.emptySubtitle}>
        Commencez une nouvelle conversation pour discuter avec vos amis
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={handleNewChat}>
        <Text style={styles.emptyButtonText}>Nouvelle conversation</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity onPress={handleNewChat}>
          <Ionicons name="create-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une conversation..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          renderItem={renderChat}
          keyExtractor={(item) => item.id}
          contentContainerStyle={filteredChats.length === 0 ? styles.emptyContainer : undefined}
          ListEmptyComponent={<EmptyState />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f0f0',
  },
  groupAvatar: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatar: {
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
  },
  unreadBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    fontSize: 14,
    color: '#999',
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  participantCount: {
    fontSize: 12,
    color: '#999',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 84,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
