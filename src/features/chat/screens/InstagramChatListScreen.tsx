import React, { useState, useRef } from 'react';
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
  Animated,
  PanResponder,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMessagesAdvanced } from '@/hooks/useMessagesAdvanced';
import { useSession } from '@/shared/providers/SessionContext';
import { usePresence } from '@/hooks/usePresence';
import * as Haptics from 'expo-haptics';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

interface ChatItemProps {
  chat: any;
  currentUserId: string;
  onPress: () => void;
  onPin: () => void;
  onArchive: () => void;
  onDelete: () => void;
  isOnline: boolean;
  isPinned: boolean;
}

const ChatItem: React.FC<ChatItemProps> = ({ 
  chat, 
  currentUserId, 
  onPress, 
  onPin,
  onArchive,
  onDelete,
  isOnline,
  isPinned
}) => {
  const swipeableRef = useRef<Swipeable>(null);
  
  const getOtherParticipant = () => {
    if (!chat.is_group && chat.participants) {
      return chat.participants.find((p: any) => p.user_id !== currentUserId);
    }
    return null;
  };

  const otherParticipant = getOtherParticipant();
  const displayName = chat.is_group 
    ? chat.name || 'Groupe'
    : otherParticipant?.profiles?.full_name || 'Utilisateur';

  const avatarUrl = !chat.is_group && otherParticipant?.profiles?.avatar_url;
  
  const formatMessageTime = (date: string) => {
    const messageDate = new Date(date);
    const now = new Date();
    const isToday = messageDate.toDateString() === now.toDateString();
    
    if (isToday) {
      return format(messageDate, 'HH:mm');
    }
    
    const diffInDays = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffInDays === 1) return 'Hier';
    if (diffInDays < 7) return format(messageDate, 'EEEE', { locale: fr });
    
    return format(messageDate, 'dd/MM/yyyy');
  };

  const lastMessageTime = chat.lastMessage?.created_at 
    ? formatMessageTime(chat.lastMessage.created_at)
    : '';

  const unreadCount = chat.unreadCount || 0;
  const isRead = chat.lastMessage?.user_id === currentUserId || unreadCount === 0;

  const renderRightActions = () => {
    return (
      <View style={styles.rightActionsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.pinButton]} 
          onPress={() => {
            onPin();
            swipeableRef.current?.close();
          }}
        >
          <Ionicons name={isPinned ? "pin" : "pin-outline"} size={24} color="#fff" />
          <Text style={styles.actionText}>{isPinned ? 'Désépingler' : 'Épingler'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.archiveButton]} 
          onPress={() => {
            onArchive();
            swipeableRef.current?.close();
          }}
        >
          <Ionicons name="archive-outline" size={24} color="#fff" />
          <Text style={styles.actionText}>Archiver</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderLeftActions = () => {
    return (
      <TouchableOpacity 
        style={[styles.actionButton, styles.deleteButton]} 
        onPress={() => {
          onDelete();
          swipeableRef.current?.close();
        }}
      >
        <Ionicons name="trash-outline" size={24} color="#fff" />
        <Text style={styles.actionText}>Supprimer</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      onSwipeableOpen={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      overshootRight={false}
      overshootLeft={false}
    >
      <TouchableOpacity style={styles.chatItem} onPress={onPress}>
        <View style={styles.avatarContainer}>
          {chat.is_group ? (
            <View style={[styles.avatar, styles.groupAvatar]}>
              <Ionicons name="people" size={28} color="#fff" />
            </View>
          ) : avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.defaultAvatar]}>
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {isOnline && !chat.is_group && (
            <View style={styles.onlineIndicator} />
          )}
          {isPinned && (
            <View style={styles.pinnedIndicator}>
              <Ionicons name="pin" size={12} color="#000" />
            </View>
          )}
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={[styles.chatName, !isRead && styles.unreadName]} numberOfLines={1}>
              {displayName}
            </Text>
            <View style={styles.rightInfo}>
              <Text style={[styles.chatTime, !isRead && styles.unreadTime]}>
                {lastMessageTime}
              </Text>
              {chat.lastMessage?.user_id === currentUserId && (
                <Ionicons 
                  name={chat.lastMessage?.read_by?.length > 1 ? "checkmark-done" : "checkmark"} 
                  size={16} 
                  color={chat.lastMessage?.read_by?.length > 1 ? "#3797F0" : "#999"} 
                  style={styles.readStatus}
                />
              )}
            </View>
          </View>
          
          <View style={styles.chatFooter}>
            <Text style={[styles.lastMessage, !isRead && styles.unreadMessage]} numberOfLines={1}>
              {chat.lastMessage?.user_id === currentUserId && 'Vous : '}
              {chat.lastMessage?.message_type === 'image' ? '📷 Photo' :
               chat.lastMessage?.message_type === 'audio' ? '🎵 Message vocal' :
               chat.lastMessage?.message_type === 'story_reply' ? '📸 A répondu à votre story' :
               chat.lastMessage?.content || 'Tapez un message...'}
            </Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

export default function InstagramChatListScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { chats, loading, refreshChats } = useMessagesAdvanced();
  const { isUserOnline } = usePresence();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [pinnedChats, setPinnedChats] = useState<string[]>([]);

  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const chatName = chat.name?.toLowerCase() || '';
    
    if (!chat.is_group && chat.participants) {
      const otherParticipant = chat.participants.find(
        (p: any) => p.user_id !== session?.user?.id
      );
      const participantName = otherParticipant?.profiles?.full_name?.toLowerCase() || '';
      return chatName.includes(query) || participantName.includes(query);
    }
    
    return chatName.includes(query);
  });

  // Sort chats: pinned first, then by last message time
  const sortedChats = [...filteredChats].sort((a, b) => {
    const aIsPinned = pinnedChats.includes(a.id);
    const bIsPinned = pinnedChats.includes(b.id);
    
    if (aIsPinned && !bIsPinned) return -1;
    if (!aIsPinned && bIsPinned) return 1;
    
    const aTime = a.lastMessage?.created_at || a.created_at;
    const bTime = b.lastMessage?.created_at || b.created_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
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
    router.push('/screens/instagram-new-chat');
  };

  const togglePin = (chatId: string) => {
    setPinnedChats(prev => {
      if (prev.includes(chatId)) {
        return prev.filter(id => id !== chatId);
      }
      return [...prev, chatId];
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleArchive = (chatId: string) => {
    // TODO: Implement archive functionality
    console.log('Archive chat:', chatId);
  };

  const handleDelete = (chatId: string) => {
    // TODO: Implement delete functionality
    console.log('Delete chat:', chatId);
  };

  const renderChat = ({ item }: { item: any }) => {
    const otherParticipant = !item.is_group && item.participants?.find(
      (p: any) => p.user_id !== session?.user?.id
    );
    
    return (
      <ChatItem
        chat={item}
        currentUserId={session?.user?.id || ''}
        onPress={() => handleChatPress(item.id)}
        onPin={() => togglePin(item.id)}
        onArchive={() => handleArchive(item.id)}
        onDelete={() => handleDelete(item.id)}
        isOnline={otherParticipant ? isUserOnline(otherParticipant.user_id) : false}
        isPinned={pinnedChats.includes(item.id)}
      />
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubble-ellipses-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>Votre boîte de réception</Text>
      <Text style={styles.emptySubtitle}>
        Envoyez des messages privés à un ami ou un groupe
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={handleNewChat}>
        <Text style={styles.emptyButtonText}>Envoyer un message</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={28} color="#000" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{session?.user?.user_metadata?.full_name || 'Messages'}</Text>
            <TouchableOpacity style={styles.headerDropdown}>
              <Ionicons name="chevron-down" size={16} color="#000" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => router.push('/screens/video-call')}>
              <Ionicons name="videocam-outline" size={28} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNewChat} style={styles.newChatButton}>
              <Ionicons name="create-outline" size={28} color="#000" />
            </TouchableOpacity>
          </View>
        </View>

        {showSearch && (
          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher"
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#999"
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={() => setShowSearch(false)}>
              <Text style={styles.cancelButton}>Annuler</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity 
          style={styles.searchBar} 
          onPress={() => setShowSearch(true)}
        >
          <Ionicons name="search" size={20} color="#999" />
          <Text style={styles.searchPlaceholder}>Rechercher</Text>
        </TouchableOpacity>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        ) : (
          <FlatList
            data={sortedChats}
            renderItem={renderChat}
            keyExtractor={(item) => item.id}
            contentContainerStyle={filteredChats.length === 0 ? styles.emptyContainer : undefined}
            ListEmptyComponent={<EmptyState />}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={handleRefresh}
                tintColor="#000"
              />
            }
          />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
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
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerDropdown: {
    marginLeft: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  newChatButton: {
    marginLeft: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFEFEF',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 36,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  cancelButton: {
    fontSize: 16,
    color: '#000',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#EFEFEF',
    borderRadius: 10,
    gap: 8,
  },
  searchPlaceholder: {
    fontSize: 16,
    color: '#999',
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
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatar: {
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '500',
    color: '#000',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CD964',
    borderWidth: 2,
    borderColor: '#fff',
  },
  pinnedIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '400',
    flex: 1,
    marginRight: 8,
    color: '#000',
  },
  unreadName: {
    fontWeight: '600',
  },
  rightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chatTime: {
    fontSize: 14,
    color: '#999',
  },
  unreadTime: {
    color: '#000',
    fontWeight: '600',
  },
  readStatus: {
    marginLeft: 2,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#999',
    flex: 1,
    marginRight: 8,
  },
  unreadMessage: {
    color: '#000',
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: '#3797F0',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
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
    fontSize: 22,
    fontWeight: '300',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#3797F0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rightActionsContainer: {
    flexDirection: 'row',
  },
  leftActionsContainer: {
    flexDirection: 'row',
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  pinButton: {
    backgroundColor: '#FFB800',
  },
  archiveButton: {
    backgroundColor: '#C0C0C0',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
});