import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDistanceToNow } from 'date-fns';
import { useChats } from "@/hooks/useChats";
import { useMessages } from "@/hooks/useMessages";

interface ConversationGroup {
  title: string;
  data: any[];
}

export default function ConversationsListScreen() {
  const navigation = useNavigation();
  const { chats } = useChats();
  const { getLastMessage } = useMessages();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<ConversationGroup[]>([]);

  useEffect(() => {
    organizeConversations();
  }, [chats]);

  const organizeConversations = () => {
    const groups = chats.reduce((acc: any, chat: any) => {
      const lastMessage = getLastMessage(chat.id);
      chat.lastMessage = lastMessage;
      
      if (chat.type === 'group') {
        if (!acc.groups) acc.groups = [];
        acc.groups.push(chat);
      } else if (chat.event_id) {
        if (!acc.events) acc.events = [];
        acc.events.push(chat);
      } else {
        if (!acc.friends) acc.friends = [];
        acc.friends.push(chat);
      }
      
      return acc;
    }, {});

    const organized: ConversationGroup[] = [];
    
    if (groups.groups?.length > 0) {
      organized.push({ title: 'Groups', data: groups.groups });
    }
    if (groups.events?.length > 0) {
      organized.push({ title: 'Upcoming Event Chats', data: groups.events });
    }
    if (groups.friends?.length > 0) {
      organized.push({ title: 'Friends', data: groups.friends });
    }

    setConversations(organized);
  };

  const filteredConversations = conversations.map(group => ({
    ...group,
    data: group.data.filter(chat =>
      chat.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(group => group.data.length > 0);

  const renderConversation = ({ item }: { item: any }) => {
    const unreadCount = item.unread_count || 0;
    const isOnline = item.participants?.some((p: any) => p.is_online);

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => navigation.navigate('Conversation' as never, { chatId: item.id } as never)}
      >
        <View style={styles.avatarContainer}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={['#45B7D1', '#3498DB']}
              style={styles.avatarPlaceholder}
            >
              <Text style={styles.avatarText}>
                {item.name?.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
          )}
          {isOnline && <View style={styles.onlineIndicator} />}
        </View>

        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.lastMessage && (
              <Text style={styles.timestamp}>
                {formatDistanceToNow(new Date(item.lastMessage.created_at), { addSuffix: true })}
              </Text>
            )}
          </View>
          
          <View style={styles.messagePreview}>
            {item.lastMessage ? (
              <>
                {item.type === 'group' && (
                  <Text style={styles.senderName}>
                    {item.lastMessage.sender_name}:{' '}
                  </Text>
                )}
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {item.lastMessage.content}
                </Text>
              </>
            ) : (
              <Text style={styles.noMessages}>No messages yet</Text>
            )}
          </View>
        </View>

        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadCount}>{unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: ConversationGroup }) => (
    <Text style={styles.sectionHeader}>{section.title}</Text>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#45B7D1', '#3498DB']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity>
          <Ionicons name="create-outline" size={28} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
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
      </View>

      {/* Conversations List */}
      <FlatList
        data={filteredConversations}
        renderItem={({ item }) => (
          <>
            {renderSectionHeader({ section: item })}
            {item.data.map((conversation: any) => (
              <View key={conversation.id}>
                {renderConversation({ item: conversation })}
              </View>
            ))}
          </>
        )}
        keyExtractor={(item) => item.title}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateEmoji}>💬</Text>
            <Text style={styles.emptyStateText}>No conversations yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Start a chat with your friends!
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: 'PlayfairDisplay-Bold',
    color: 'white',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
  },
  listContent: {
    paddingBottom: 100,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: '#f8f8f8',
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: 'white',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  senderName: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  noMessages: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  unreadBadge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyStateEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#999',
  },
});